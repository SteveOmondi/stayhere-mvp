using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using StayHere.Application.Common.Interfaces;

namespace StayHere.Infrastructure.AiAgent;

/// <summary>
/// Analyzes floor plan images via Google Gemini, in two focused passes — ported from a proven
/// Node/Gemini prototype that spent significant iteration getting door/window detection to
/// actually work:
///
///   Pass 1 (whole image) — traces room polygons + reads printed dimensions/size + estimates
///   real-world scale from standard architectural reference sizes (there is no manual
///   calibration step upstream of this service).
///
///   Pass 2 (one call PER detected room, on a cropped/zoomed sub-image) — small drafting
///   symbols (door swing arcs, closet bi-fold "v" marks, window tick-marks) get lost once a
///   whole multi-room page is downsampled to the model's fixed vision-token budget; cropping
///   each room first (padded, upscaled) gives each symbol far more effective resolution. This
///   was the single change that made detection reliable in the original prototype.
///
/// Both passes enable Gemini's extended thinking (<c>thinkingConfig.thinkingBudget = -1</c>) —
/// forced function-calling otherwise tends to short-circuit real visual reasoning and just
/// fill the schema with the cheapest legal (often empty) answer.
/// </summary>
public class GeminiFloorPlanService : IFloorPlanAnalysisService
{
    // Sequential, not parallel: a 10-room floor plan firing even 2 concurrent opening-detection
    // calls repeatedly collided with Google's free-tier per-minute limit in production (confirmed:
    // a 10-room plan came back with 1 door/1 window total - nearly every room silently failed and
    // was swallowed as "no openings" instead of surfacing the throttling). Correctness matters far
    // more than shaving a few seconds off a one-time upload, so this trades concurrency for
    // reliability entirely.
    private const int RoomCropConcurrency = 1;
    private const double MarginCoverageThreshold = 0.12;
    private const double MarginCropOverlapFraction = 0.15;
    private static readonly TimeSpan InterRoomRequestDelay = TimeSpan.FromMilliseconds(600);
    // If even close to half the rooms fail opening detection, that's not "these particular rooms
    // happen to have no doors" - it's the model/API choking under load for this pass. Escalating
    // the WHOLE analysis to the Qwen/Groq fallback (a different vendor's quota entirely) gives a
    // real chance at a complete result, instead of quietly keeping a badly undercounted one.
    private const double OpeningsFailureEscalationThreshold = 0.5;

    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GeminiFloorPlanService> _logger;

    public GeminiFloorPlanService(HttpClient httpClient, IConfiguration configuration, ILogger<GeminiFloorPlanService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<FloorPlanAnalysisResult> AnalyzeAsync(byte[] imageBytes, string mimeType, CancellationToken cancellationToken = default)
    {
        var apiKey = ResolveApiKey();
        // "gemini-2.5-pro" (the old default here and below) is confirmed retired for new API
        // keys/projects ("no longer available to new users") - gemini-flash-latest is a Google-
        // maintained alias that always points at a current, working model, so this default won't
        // silently rot the same way a specific dated snapshot name eventually does.
        var model = _configuration["Google:FloorPlanModel"] ?? "gemini-flash-latest";

        var (rooms, overallStatedSize, estimatedTotalWidthMeters) = await DetectRoomsAsync(apiKey, model, imageBytes, mimeType, cancellationToken);

        var openings = await DetectOpeningsPerRoomAsync(apiKey, model, imageBytes, rooms, cancellationToken);

        return new FloorPlanAnalysisResult(rooms, openings, overallStatedSize, estimatedTotalWidthMeters);
    }

    private string ResolveApiKey()
    {
        var apiKey = _configuration["Google:ApiKey"]?.Trim() ?? Environment.GetEnvironmentVariable("GOOGLE_API_KEY")?.Trim();
        if (string.IsNullOrEmpty(apiKey))
            throw new InvalidOperationException("Google AI Studio API key is not configured (Google:ApiKey).");
        return apiKey;
    }

    // ── Pass 1: rooms ────────────────────────────────────────────────────────

    private async Task<(List<FloorPlanAnalysisRoom> Rooms, string? OverallStatedSize, double? EstimatedTotalWidthMeters)> DetectRoomsAsync(
        string apiKey, string model, byte[] imageBytes, string mimeType, CancellationToken cancellationToken)
    {
        var parts = new JsonArray
        {
            new JsonObject { ["text"] = "Analyze this floor plan and report every room." },
            new JsonObject { ["inlineData"] = new JsonObject { ["mimeType"] = mimeType, ["data"] = Convert.ToBase64String(imageBytes) } }
        };

        var args = await CallFunctionAsync(apiKey, model, FloorPlanPrompts.RoomsSystemPrompt, parts, FloorPlanPrompts.RoomsToolName,
            FloorPlanPrompts.RoomsToolDescription, RoomsSchema, cancellationToken);

        if (args == null)
            throw new InvalidOperationException("Model did not return the expected structured output for rooms.");

        var rooms = new List<FloorPlanAnalysisRoom>();
        if (args["rooms"] is JsonArray roomsArray)
        {
            foreach (var roomNode in roomsArray)
            {
                if (roomNode is not JsonObject roomObj) continue;
                var label = roomObj["label"]?.GetValue<string>();
                var pointsNode = roomObj["points"] as JsonArray;
                if (string.IsNullOrWhiteSpace(label) || pointsNode == null || pointsNode.Count < 3) continue;

                var points = new List<double[]>();
                foreach (var p in pointsNode)
                {
                    if (p is JsonArray pt && pt.Count == 2)
                        points.Add([pt[0]!.GetValue<double>(), pt[1]!.GetValue<double>()]);
                }
                if (points.Count < 3) continue;

                if (FloorPlanImageUtils.IsSelfIntersecting(points))
                    _logger.LogWarning(
                        "Pass-1 room {Label} has a self-intersecting polygon ({PointCount} points) - it will likely render as a broken/invisible outline on the frontend even though its computed area may look plausible",
                        label, points.Count);

                var dimensionText = roomObj["dimensionText"]?.GetValue<string>();
                rooms.Add(new FloorPlanAnalysisRoom(label, points, dimensionText));
            }
        }

        if (rooms.Count == 0)
            throw new InvalidOperationException("Model did not detect any usable rooms in this image.");

        foreach (var r in rooms)
        {
            var rMinX = r.Points.Min(p => p[0]);
            var rMaxX = r.Points.Max(p => p[0]);
            var rMinY = r.Points.Min(p => p[1]);
            var rMaxY = r.Points.Max(p => p[1]);
            _logger.LogInformation(
                "Pass-1 room: {Label} at fraction bbox [{MinX:F3},{MinY:F3}]-[{MaxX:F3},{MaxY:F3}]",
                r.Label, rMinX, rMinY, rMaxX, rMaxY);
        }

        // The whole-image pass above can miss an entire section - observed in production with a
        // self-contained annex/second unit tucked at the edge of the sheet, separated from the main
        // rooms by its own walls, that the model never looked at. If the rooms it DID find leave a
        // sizeable margin uncovered on any one side of the image, that margin is very likely to
        // contain something real, so give the model one more focused look at just that band (the
        // same "crop it and look closer" fix that already made opening detection reliable).
        var missedRooms = await DetectMissedRoomsAsync(apiKey, model, imageBytes, rooms, cancellationToken);
        rooms.AddRange(missedRooms);

        var overallStatedSize = args["overallStatedSize"]?.GetValue<string>();
        double? estimatedTotalWidthMeters = args["estimatedTotalWidthMeters"] is JsonValue v && v.TryGetValue<double>(out var w) && w > 0 ? w : null;

        return (rooms, overallStatedSize, estimatedTotalWidthMeters);
    }

    /// <summary>
    /// Re-checks any edge of the image left uncovered by the rooms pass 1 already found - a large
    /// gap between the image boundary and the combined bounding box of every detected room means a
    /// whole section (e.g. a detached annex) is likely sitting there unlooked-at. Crops just that
    /// margin band (with a bit of overlap for wall context) and asks the model to report only
    /// genuinely NEW rooms found there, mirroring the per-room-crop technique already used for
    /// opening detection.
    /// </summary>
    private async Task<List<FloorPlanAnalysisRoom>> DetectMissedRoomsAsync(
        string apiKey, string model, byte[] imageBytes, List<FloorPlanAnalysisRoom> rooms, CancellationToken cancellationToken)
    {
        var allPoints = rooms.SelectMany(r => r.Points).ToList();
        var minX = allPoints.Min(p => p[0]);
        var maxX = allPoints.Max(p => p[0]);
        var minY = allPoints.Min(p => p[1]);
        var maxY = allPoints.Max(p => p[1]);

        var margins = new (string Side, double Size)[]
        {
            ("top", minY),
            ("bottom", 1.0 - maxY),
            ("left", minX),
            ("right", 1.0 - maxX)
        };

        using var image = Image.Load<Rgba32>(imageBytes);
        var extraRooms = new List<FloorPlanAnalysisRoom>();

        // Only ever check the SINGLE largest uncovered margin, not every side that exceeds the
        // threshold. This pass already costs one extra Gemini call - Google's free-tier rate limit
        // is easily exhausted (confirmed repeatedly in production logs), and every call spent here
        // is one less available for the openings pass right after it, which is what actually finds
        // doors/windows. A detached annex is virtually always on one dominant side; checking just
        // that side catches the common real case without risking the openings pass starving for
        // quota on floor plans that happen to have more than one uncovered margin.
        var largestMargin = margins
            .Where(m => m.Size >= MarginCoverageThreshold)
            .OrderByDescending(m => m.Size)
            .Cast<(string Side, double Size)?>()
            .FirstOrDefault();

        foreach (var (side, size) in largestMargin is { } chosen ? new[] { chosen } : Array.Empty<(string, double)>())
        {
            var rect = ComputeMarginCropRect(side, size, image.Width, image.Height);
            var cropBytes = FloorPlanImageUtils.BuildRoomCrop(image, rect);
            var existingLabels = string.Join(", ", rooms.Select(r => r.Label).Distinct());

            var parts = new JsonArray
            {
                new JsonObject { ["text"] =
                    $"This is the {side} section of a larger floor plan. Rooms already identified elsewhere on the " +
                    $"full plan: {existingLabels}. Report ONLY additional distinct room(s) visible in THIS cropped " +
                    "section that are NOT among those already listed - for example a separate annex, second unit, or " +
                    "extra room tucked at the edge of the sheet. If everything visible here is already part of a " +
                    "listed room, report an empty list." },
                new JsonObject { ["inlineData"] = new JsonObject { ["mimeType"] = "image/png", ["data"] = Convert.ToBase64String(cropBytes) } }
            };

            JsonObject? args;
            try
            {
                args = await CallFunctionAsync(apiKey, model, FloorPlanPrompts.RoomsSystemPrompt, parts, FloorPlanPrompts.RoomsToolName,
                    FloorPlanPrompts.RoomsToolDescription, RoomsSchema, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Missed-room check failed for the {Side} margin (skipping)", side);
                continue;
            }

            if (args?["rooms"] is not JsonArray roomsArray) continue;

            foreach (var roomNode in roomsArray)
            {
                if (roomNode is not JsonObject roomObj) continue;
                var label = roomObj["label"]?.GetValue<string>();
                var pointsNode = roomObj["points"] as JsonArray;
                if (string.IsNullOrWhiteSpace(label) || pointsNode == null || pointsNode.Count < 3) continue;

                var localPoints = new List<double[]>();
                foreach (var p in pointsNode)
                {
                    if (p is JsonArray pt && pt.Count == 2)
                        localPoints.Add([pt[0]!.GetValue<double>(), pt[1]!.GetValue<double>()]);
                }
                if (localPoints.Count < 3) continue;

                // Map crop-local fractions back to full-image fractions.
                var mappedPoints = localPoints
                    .Select(p => new[]
                    {
                        (rect.Left + p[0] * rect.Width) / (double)image.Width,
                        (rect.Top + p[1] * rect.Height) / (double)image.Height
                    })
                    .ToList();

                var dimensionText = roomObj["dimensionText"]?.GetValue<string>();
                var candidate = new FloorPlanAnalysisRoom(label, mappedPoints, dimensionText);

                // The model doesn't always honor "don't re-report existing rooms" - if this
                // "new" room's center actually falls inside a room we already have, it's a
                // re-detection, not a miss, so skip it rather than adding a duplicate.
                if (OverlapsExistingRoom(candidate, rooms) || OverlapsExistingRoom(candidate, extraRooms)) continue;

                var cMinX = candidate.Points.Min(p => p[0]);
                var cMaxX = candidate.Points.Max(p => p[0]);
                var cMinY = candidate.Points.Min(p => p[1]);
                var cMaxY = candidate.Points.Max(p => p[1]);
                _logger.LogInformation(
                    "Missed-room found via {Side} margin scan: {Label} at fraction bbox [{MinX:F3},{MinY:F3}]-[{MaxX:F3},{MaxY:F3}]",
                    side, label, cMinX, cMinY, cMaxX, cMaxY);
                if (FloorPlanImageUtils.IsSelfIntersecting(mappedPoints))
                    _logger.LogWarning(
                        "Missed-room {Label} (via {Side} margin scan) has a self-intersecting polygon - it will likely render as a broken/invisible outline",
                        label, side);

                extraRooms.Add(candidate);
            }
        }

        return extraRooms;
    }

    private static (int Left, int Top, int Width, int Height) ComputeMarginCropRect(string side, double marginSize, int imageWidth, int imageHeight)
    {
        var overlap = Math.Min(marginSize, MarginCropOverlapFraction);
        var bandFraction = Math.Min(1.0, marginSize + overlap);

        int left = 0, top = 0, width = imageWidth, height = imageHeight;

        switch (side)
        {
            case "top":
                height = Math.Clamp((int)Math.Ceiling(bandFraction * imageHeight), 1, imageHeight);
                break;
            case "bottom":
                height = Math.Clamp((int)Math.Ceiling(bandFraction * imageHeight), 1, imageHeight);
                top = imageHeight - height;
                break;
            case "left":
                width = Math.Clamp((int)Math.Ceiling(bandFraction * imageWidth), 1, imageWidth);
                break;
            case "right":
                width = Math.Clamp((int)Math.Ceiling(bandFraction * imageWidth), 1, imageWidth);
                left = imageWidth - width;
                break;
        }

        return (left, top, width, height);
    }

    private static bool OverlapsExistingRoom(FloorPlanAnalysisRoom candidate, List<FloorPlanAnalysisRoom> existingRooms)
    {
        var cx = candidate.Points.Average(p => p[0]);
        var cy = candidate.Points.Average(p => p[1]);

        return existingRooms.Any(r =>
        {
            var minX = r.Points.Min(p => p[0]);
            var maxX = r.Points.Max(p => p[0]);
            var minY = r.Points.Min(p => p[1]);
            var maxY = r.Points.Max(p => p[1]);
            return cx >= minX && cx <= maxX && cy >= minY && cy <= maxY;
        });
    }

    // ── Pass 2: per-room cropped openings ───────────────────────────────────

    private async Task<List<FloorPlanAnalysisOpening>> DetectOpeningsPerRoomAsync(
        string apiKey, string model, byte[] imageBytes, List<FloorPlanAnalysisRoom> rooms, CancellationToken cancellationToken)
    {
        using var image = Image.Load<Rgba32>(imageBytes);
        var imageWidth = image.Width;
        var imageHeight = image.Height;

        var results = new List<FloorPlanAnalysisOpening>[rooms.Count];
        var failures = new Exception?[rooms.Count];
        using var semaphore = new SemaphoreSlim(RoomCropConcurrency);

        var tasks = rooms.Select(async (room, index) =>
        {
            await semaphore.WaitAsync(cancellationToken);
            try
            {
                // Spread requests out even when run sequentially (RoomCropConcurrency = 1 today) -
                // firing 10 rooms back-to-back with zero gap can still blow through a per-minute
                // rate limit within a few seconds. Skip the wait for the very first room.
                if (index > 0)
                    await Task.Delay(InterRoomRequestDelay, cancellationToken);

                results[index] = await DetectOpeningsForRoomAsync(apiKey, model, image, imageWidth, imageHeight, room, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Opening detection failed for room {Room} (skipping)", room.Label);
                results[index] = [];
                failures[index] = ex;
            }
            finally
            {
                semaphore.Release();
            }
        });

        await Task.WhenAll(tasks);

        // A handful of rooms failing (a weird crop, a transient blip) is fine - keep the openings we
        // did get. But a MAJORITY of rooms failing means the API/model is choking under load for
        // this whole pass (as opposed to genuinely finding zero doors/windows in a few rooms, which
        // reads identically otherwise) - confirmed in production: a 10-room plan came back with
        // just 1 door/1 window total because most per-room calls silently 429'd and got swallowed
        // as "no openings" rather than escalating. That must propagate so
        // FloorPlanAnalysisFallbackService can retry the whole analysis against the Qwen/Groq
        // vendor fallback, rather than silently keeping a badly undercounted result.
        var failureCount = failures.Count(f => f != null);
        if (rooms.Count > 0 && failureCount >= rooms.Count * OpeningsFailureEscalationThreshold)
        {
            throw new AggregateException(
                $"Opening detection failed for {failureCount}/{rooms.Count} room(s) - the model/API is unavailable for this pass.",
                failures.Where(f => f != null)!);
        }

        return FloorPlanImageUtils.DedupeOpenings(results.SelectMany(r => r).ToList());
    }

    private async Task<List<FloorPlanAnalysisOpening>> DetectOpeningsForRoomAsync(
        string apiKey, string model, Image<Rgba32> image, int imageWidth, int imageHeight, FloorPlanAnalysisRoom room, CancellationToken cancellationToken)
    {
        var rect = FloorPlanImageUtils.ComputeRoomCropRect(room, imageWidth, imageHeight);
        var cropBytes = FloorPlanImageUtils.BuildRoomCrop(image, rect);

        var parts = new JsonArray
        {
            new JsonObject { ["text"] = FloorPlanPrompts.OpeningsUserText(room.Label) },
            new JsonObject { ["inlineData"] = new JsonObject { ["mimeType"] = "image/png", ["data"] = Convert.ToBase64String(cropBytes) } }
        };

        var args = await CallFunctionAsync(apiKey, model, FloorPlanPrompts.OpeningsSystemPrompt, parts, FloorPlanPrompts.OpeningsToolName,
            FloorPlanPrompts.OpeningsToolDescription, OpeningsSchema, cancellationToken);

        var local = new List<FloorPlanAnalysisOpening>();
        if (args?["openings"] is JsonArray openingsArray)
        {
            foreach (var node in openingsArray)
            {
                if (node is not JsonObject obj) continue;
                var pointNode = obj["point"] as JsonArray;
                var type = obj["type"]?.GetValue<string>();
                if (pointNode == null || pointNode.Count != 2 || (type != "door" && type != "window")) continue;
                local.Add(new FloorPlanAnalysisOpening([pointNode[0]!.GetValue<double>(), pointNode[1]!.GetValue<double>()], type));
            }
        }

        // Map crop-local fractions back to full-image fractions.
        return local.Select(o => new FloorPlanAnalysisOpening(
            [(rect.Left + o.Point[0] * rect.Width) / imageWidth, (rect.Top + o.Point[1] * rect.Height) / imageHeight],
            o.Type,
            room.Label)).ToList();
    }

    // ── Shared Gemini call plumbing ─────────────────────────────────────────

    /// <summary>
    /// Wraps <see cref="CallFunctionOnModelAsync"/> with a one-shot fallback to a more stable model
    /// when the primary model exhausts its full retry budget specifically due to overload/rate-limit
    /// (503/429) - observed in production as recurring "high demand" 503s from Google's backend for
    /// newer preview-ish flash models, unrelated to the request itself (confirmed by replaying the
    /// exact same request seconds later and getting a 200). Other failures (4xx bad request, etc.)
    /// are not retried against the fallback - they'd fail there too.
    /// </summary>
    private async Task<JsonObject?> CallFunctionAsync(
        string apiKey, string model, string systemPrompt, JsonArray parts, string toolName, string toolDescription,
        JsonObject schema, CancellationToken cancellationToken)
    {
        try
        {
            return await CallFunctionOnModelAsync(apiKey, model, systemPrompt, parts, toolName, toolDescription, schema, cancellationToken);
        }
        catch (HttpRequestException ex) when (ex.StatusCode is HttpStatusCode.ServiceUnavailable or HttpStatusCode.TooManyRequests)
        {
            // Deliberately a DIFFERENT model than the primary's own default (gemini-flash-latest) -
            // falling back to the exact same model the primary already exhausted its retry budget
            // on is a no-op (the equality check right below skips it), so this needs its own
            // separate free-tier quota bucket to actually provide redundancy.
            var fallbackModel = _configuration["Google:FloorPlanFallbackModel"] ?? "gemini-flash-lite-latest";
            if (string.IsNullOrWhiteSpace(fallbackModel) || string.Equals(fallbackModel, model, StringComparison.OrdinalIgnoreCase))
                throw;

            _logger.LogWarning(ex,
                "Gemini floor-plan model {Model} exhausted its retry budget with {Status}; falling back to {FallbackModel}",
                model, ex.StatusCode, fallbackModel);
            return await CallFunctionOnModelAsync(apiKey, fallbackModel, systemPrompt, parts, toolName, toolDescription, schema, cancellationToken);
        }
    }

    private async Task<JsonObject?> CallFunctionOnModelAsync(
        string apiKey, string model, string systemPrompt, JsonArray parts, string toolName, string toolDescription,
        JsonObject schema, CancellationToken cancellationToken)
    {
        // parts must be cloned: CallFunctionAsync's Gemini-to-Gemini fallback calls this method a
        // second time with the SAME parts instance, and a JsonNode can only ever have one parent -
        // reusing it as-is threw "The node already has a parent" the moment a fallback actually
        // fired (schema below was already cloned; parts wasn't, which is what broke).
        var body = new JsonObject
        {
            ["contents"] = new JsonArray { new JsonObject { ["role"] = "user", ["parts"] = parts.DeepClone() } },
            ["systemInstruction"] = new JsonObject { ["parts"] = new JsonArray { new JsonObject { ["text"] = systemPrompt } } },
            ["tools"] = new JsonArray
            {
                new JsonObject
                {
                    ["functionDeclarations"] = new JsonArray
                    {
                        new JsonObject { ["name"] = toolName, ["description"] = toolDescription, ["parameters"] = schema.DeepClone() }
                    }
                }
            },
            ["toolConfig"] = new JsonObject
            {
                ["functionCallingConfig"] = new JsonObject { ["mode"] = "ANY", ["allowedFunctionNames"] = new JsonArray { toolName } }
            },
            ["generationConfig"] = new JsonObject { ["thinkingConfig"] = new JsonObject { ["thinkingBudget"] = -1 } }
        };

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";
        // Deliberately its own key, not Google:MaxRetries (shared with GoogleEmbeddingService) -
        // floor-plan analysis already retries twice per model AND falls back to a second model, so
        // 4 attempts per model meant up to 8 slow 503 retries (each backing off up to 16s) before a
        // user ever saw the Qwen fallback kick in. 2 gets to a real answer/fallback much faster.
        var maxAttempts = int.TryParse(_configuration["Google:FloorPlanMaxRetries"], out var m) ? Math.Clamp(m, 1, 8) : 2;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, url) { Content = JsonContent.Create(body) };
            req.Headers.TryAddWithoutValidation("x-goog-api-key", apiKey);

            HttpResponseMessage response;
            try
            {
                response = await _httpClient.SendAsync(req, cancellationToken);
            }
            catch (HttpRequestException ex) when (attempt < maxAttempts)
            {
                // Transient transport failure (e.g. a pooled keep-alive connection the server already
                // closed) - not an API error, so retry rather than surfacing a raw socket exception.
                var delay = TimeSpan.FromSeconds(Math.Pow(2, attempt));
                _logger.LogWarning(ex, "Gemini floor-plan call failed at the transport level. Attempt {Attempt}/{Max}. Waiting {Delay}s", attempt, maxAttempts, delay.TotalSeconds);
                await Task.Delay(delay, cancellationToken);
                continue;
            }

            if (response.StatusCode == HttpStatusCode.TooManyRequests || response.StatusCode == HttpStatusCode.ServiceUnavailable)
            {
                var delay = ParseRetryAfter(response) ?? TimeSpan.FromSeconds(Math.Pow(2, attempt));
                _logger.LogWarning("Gemini floor-plan call returned {Status}. Attempt {Attempt}/{Max}. Waiting {Delay}s", (int)response.StatusCode, attempt, maxAttempts, delay.TotalSeconds);
                if (attempt == maxAttempts) response.EnsureSuccessStatusCode();
                await Task.Delay(delay, cancellationToken);
                continue;
            }

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Gemini returned {Status} for floor-plan model {Model}. Response: {Body}", (int)response.StatusCode, model, errorBody);
                response.EnsureSuccessStatusCode();
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var root = JsonNode.Parse(json)?.AsObject();
            var functionCallArgs = root?["candidates"]?.AsArray()
                .Select(c => c?["content"]?["parts"]?.AsArray()
                    .Select(p => p?["functionCall"]?.AsObject())
                    .FirstOrDefault(fc => fc != null))
                .FirstOrDefault(fc => fc != null);

            return functionCallArgs?["args"]?.AsObject();
        }

        return null;
    }

    private static TimeSpan? ParseRetryAfter(HttpResponseMessage response)
    {
        if (response.Headers.RetryAfter?.Delta is { } d) return d;
        if (response.Headers.TryGetValues("Retry-After", out var values) && int.TryParse(values.FirstOrDefault(), out var seconds))
            return TimeSpan.FromSeconds(seconds);
        return null;
    }

    // ── Schemas & prompts (mirrors the proven Node prototype's server/analyzeFloorPlan.js) ──

    private static readonly JsonObject RoomsSchema = (JsonNode.Parse("""
    {
      "type": "OBJECT",
      "properties": {
        "rooms": {
          "type": "ARRAY",
          "description": "One entry per distinct room/space visible in the floor plan.",
          "items": {
            "type": "OBJECT",
            "properties": {
              "label": { "type": "STRING", "description": "The room type/name, e.g. \"Bedroom\", \"Kitchen\", \"Bathroom\", \"Living Room\"." },
              "points": {
                "type": "ARRAY",
                "description": "The room outline as a polygon, tracing its visible wall corners in order. Each point is [xFraction, yFraction], as a FRACTION of the image width/height (0.0 to 1.0) - NOT pixel coordinates. At least 3 points.",
                "items": { "type": "ARRAY", "items": { "type": "NUMBER" } }
              },
              "dimensionText": { "type": "STRING", "description": "The printed dimension text for this room if visible, e.g. 11'7\" x 11'8\". Omit if not printed on the plan." }
            },
            "required": ["label", "points"]
          }
        },
        "overallStatedSize": { "type": "STRING", "description": "The overall stated size/title text if printed on the plan, e.g. 1050 Sq Feet - 2 Bedroom 2 Bath." },
        "estimatedTotalWidthMeters": {
          "type": "NUMBER",
          "description": "Your best estimate of the REAL-WORLD width, in meters, of the entire floor plan as drawn (from its leftmost to rightmost wall) - needed to convert the plan into real room sizes when no dimension text is printed. Estimate it using standard market/architectural reference sizes visible in the drawing: interior doors are usually about 0.8-0.9m wide, entry doors about 0.9-1.0m, windows about 1.0-1.8m, hallways about 1.0-1.3m wide, a queen/double bed is about 1.5m wide and 2.0m long, a standard car parking space is about 2.4m wide. Always provide a number, even if approximate."
        }
      },
      "required": ["rooms"]
    }
    """) as JsonObject)!;

    private static readonly JsonObject OpeningsSchema = (JsonNode.Parse("""
    {
      "type": "OBJECT",
      "properties": {
        "openings": {
          "type": "ARRAY",
          "description": "Every door and window drafting symbol found, one entry per symbol.",
          "items": {
            "type": "OBJECT",
            "properties": {
              "point": {
                "type": "ARRAY",
                "description": "The [xFraction, yFraction] location of the symbol, as a fraction of the image width/height (0.0 to 1.0), centered on the gap in the wall.",
                "items": { "type": "NUMBER" }
              },
              "type": { "type": "STRING", "enum": ["door", "window"], "description": "Whether this symbol is a door (including closet doors) or a window." },
              "room": { "type": "STRING", "description": "The room label this opening belongs to / leads into, if you can tell." }
            },
            "required": ["point", "type"]
          }
        }
      },
      "required": ["openings"]
    }
    """) as JsonObject)!;
}
