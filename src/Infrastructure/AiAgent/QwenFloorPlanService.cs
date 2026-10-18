using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using StayHere.Application.Common.Interfaces;

namespace StayHere.Infrastructure.AiAgent;

/// <summary>
/// Analyzes floor plan images via Qwen3.8-27B on Groq - a same-shape re-implementation of
/// <see cref="GeminiFloorPlanService"/>'s two-pass approach (whole-image room tracing, then
/// per-room cropped opening detection) against Groq's OpenAI-compatible chat-completions API
/// instead of Gemini's native API. Exists purely as <see cref="FloorPlanAnalysisFallbackService"/>'s
/// fallback for when Gemini is unavailable - a different vendor entirely, so a Google-side outage
/// can't take down both.
/// </summary>
public class QwenFloorPlanService : IFloorPlanAnalysisService
{
    private const double MarginCoverageThreshold = 0.12;
    private const double MarginCropOverlapFraction = 0.15;
    private static readonly TimeSpan InterRoomRequestDelay = TimeSpan.FromMilliseconds(600);

    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<QwenFloorPlanService> _logger;

    public QwenFloorPlanService(HttpClient httpClient, IConfiguration configuration, ILogger<QwenFloorPlanService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<FloorPlanAnalysisResult> AnalyzeAsync(byte[] imageBytes, string mimeType, CancellationToken cancellationToken = default)
    {
        var apiKey = ResolveApiKey();
        var model = _configuration["Groq:FloorPlanModel"] ?? "qwen/qwen3.8-27b";

        var (roughRooms, overallStatedSize, estimatedTotalWidthMeters) = await DetectRoomsAsync(apiKey, model, imageBytes, mimeType, cancellationToken);

        // Whole-image reasoning is where Qwen measurably struggles - confirmed in production: an
        // entire detached annex silently skipped, and other rooms' points coming back scrambled
        // (self-intersecting "bowtie" outlines) despite the room's label/location being right. Both
        // fixes below apply the same trick that already made opening detection reliable: give the
        // model one small, focused crop instead of the whole complex scene.
        var missedRooms = await DetectMissedRoomsAsync(apiKey, model, imageBytes, roughRooms, cancellationToken);
        roughRooms.AddRange(missedRooms);
        var rooms = await RefineRoomPolygonsAsync(apiKey, model, imageBytes, roughRooms, cancellationToken);

        List<FloorPlanAnalysisOpening> openings;
        try
        {
            openings = await DetectOpeningsPerRoomAsync(apiKey, model, imageBytes, rooms, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Qwen floor-plan opening detection failed; continuing with rooms only");
            openings = [];
        }

        return new FloorPlanAnalysisResult(rooms, openings, overallStatedSize, estimatedTotalWidthMeters);
    }

    private string ResolveApiKey()
    {
        var apiKey = _configuration["Groq:ApiKey"]?.Trim() ?? Environment.GetEnvironmentVariable("GROQ_API_KEY")?.Trim();
        if (string.IsNullOrEmpty(apiKey))
            throw new InvalidOperationException("Groq API key is not configured (Groq:ApiKey).");
        return apiKey;
    }

    // ── Pass 1: rooms ────────────────────────────────────────────────────────

    private async Task<(List<FloorPlanAnalysisRoom> Rooms, string? OverallStatedSize, double? EstimatedTotalWidthMeters)> DetectRoomsAsync(
        string apiKey, string model, byte[] imageBytes, string mimeType, CancellationToken cancellationToken)
    {
        var args = await CallFunctionAsync(
            apiKey, model, FloorPlanPrompts.RoomsSystemPrompt,
            "Analyze this floor plan and report every room.", imageBytes, mimeType,
            FloorPlanPrompts.RoomsToolName, FloorPlanPrompts.RoomsToolDescription, RoomsSchema, cancellationToken);

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
                        "Qwen pass-1 room {Label} has a self-intersecting polygon ({PointCount} points) - it will likely render as a broken/invisible outline even though its computed area may look plausible",
                        label, points.Count);

                var dimensionText = roomObj["dimensionText"]?.GetValue<string>();
                rooms.Add(new FloorPlanAnalysisRoom(label, points, dimensionText));
            }
        }

        if (rooms.Count == 0)
            throw new InvalidOperationException("Model did not detect any usable rooms in this image.");

        var overallStatedSize = args["overallStatedSize"]?.GetValue<string>();
        double? estimatedTotalWidthMeters = args["estimatedTotalWidthMeters"] is JsonValue v && v.TryGetValue<double>(out var w) && w > 0 ? w : null;

        return (rooms, overallStatedSize, estimatedTotalWidthMeters);
    }

    // ── Pass 1.5a: catch a section the whole-image pass skipped entirely ───

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

            JsonObject? args;
            try
            {
                args = await CallFunctionAsync(
                    apiKey, model, FloorPlanPrompts.RoomsSystemPrompt,
                    $"This is the {side} section of a larger floor plan. Rooms already identified elsewhere on the " +
                    $"full plan: {existingLabels}. Report ONLY additional distinct room(s) visible in THIS cropped " +
                    "section that are NOT among those already listed - for example a separate annex, second unit, or " +
                    "extra room tucked at the edge of the sheet. If everything visible here is already part of a " +
                    "listed room, report an empty list.",
                    cropBytes, "image/png",
                    FloorPlanPrompts.RoomsToolName, FloorPlanPrompts.RoomsToolDescription, RoomsSchema, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Qwen missed-room check failed for the {Side} margin (skipping)", side);
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

                var mappedPoints = localPoints
                    .Select(p => new[]
                    {
                        (rect.Left + p[0] * rect.Width) / (double)image.Width,
                        (rect.Top + p[1] * rect.Height) / (double)image.Height
                    })
                    .ToList();

                var dimensionText = roomObj["dimensionText"]?.GetValue<string>();
                var candidate = new FloorPlanAnalysisRoom(label, mappedPoints, dimensionText);

                if (OverlapsExistingRoom(candidate, rooms) || OverlapsExistingRoom(candidate, extraRooms)) continue;

                _logger.LogInformation("Qwen missed-room found via {Side} margin scan: {Label}", side, label);
                extraRooms.Add(candidate);
            }
        }

        return extraRooms;
    }

    // ── Pass 1.5b: re-trace each room's precise outline on its own zoomed crop ──

    /// <summary>
    /// Replaces each room's rough whole-image polygon with a fresh trace from a crop centered on
    /// just that one room - the same reasoning already proven for openings: this model does fine
    /// with one small focused shape, but its whole-image spatial reasoning is measurably weaker
    /// (confirmed: self-intersecting "bowtie" outlines despite the right label/location). A room
    /// where refinement fails or still comes back tangled keeps its original rough trace rather
    /// than losing the room entirely.
    /// </summary>
    private async Task<List<FloorPlanAnalysisRoom>> RefineRoomPolygonsAsync(
        string apiKey, string model, byte[] imageBytes, List<FloorPlanAnalysisRoom> roughRooms, CancellationToken cancellationToken)
    {
        using var image = Image.Load<Rgba32>(imageBytes);
        var imageWidth = image.Width;
        var imageHeight = image.Height;

        var refined = new List<FloorPlanAnalysisRoom>(roughRooms.Count);

        for (var i = 0; i < roughRooms.Count; i++)
        {
            var room = roughRooms[i];
            if (i > 0)
                await Task.Delay(InterRoomRequestDelay, cancellationToken);

            try
            {
                var refinedRoom = await RefineOneRoomAsync(apiKey, model, image, imageWidth, imageHeight, room, cancellationToken);
                refined.Add(refinedRoom ?? room);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Qwen room-polygon refinement failed for {Room} (keeping the rough whole-image trace)", room.Label);
                refined.Add(room);
            }
        }

        return refined;
    }

    private async Task<FloorPlanAnalysisRoom?> RefineOneRoomAsync(
        string apiKey, string model, Image<Rgba32> image, int imageWidth, int imageHeight, FloorPlanAnalysisRoom room, CancellationToken cancellationToken)
    {
        var rect = FloorPlanImageUtils.ComputeRoomCropRect(room, imageWidth, imageHeight);
        var cropBytes = FloorPlanImageUtils.BuildRoomCrop(image, rect);

        var args = await CallFunctionAsync(
            apiKey, model, FloorPlanPrompts.RoomOutlineSystemPrompt, FloorPlanPrompts.RoomOutlineUserText(room.Label),
            cropBytes, "image/png",
            FloorPlanPrompts.RoomOutlineToolName, FloorPlanPrompts.RoomOutlineToolDescription, RoomOutlineSchema, cancellationToken);

        if (args?["points"] is not JsonArray pointsNode || pointsNode.Count < 3)
            return null;

        var localPoints = new List<double[]>();
        foreach (var p in pointsNode)
        {
            if (p is JsonArray pt && pt.Count == 2)
                localPoints.Add([pt[0]!.GetValue<double>(), pt[1]!.GetValue<double>()]);
        }
        if (localPoints.Count < 3) return null;

        var mappedPoints = localPoints
            .Select(p => new[]
            {
                (rect.Left + p[0] * rect.Width) / (double)imageWidth,
                (rect.Top + p[1] * rect.Height) / (double)imageHeight
            })
            .ToList();

        if (FloorPlanImageUtils.IsSelfIntersecting(mappedPoints))
        {
            _logger.LogWarning(
                "Qwen room-polygon refinement for {Room} still self-intersecting after a focused crop - keeping the rough whole-image trace instead",
                room.Label);
            return null;
        }

        return room with { Points = mappedPoints };
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
        // Sequential (was 2): production logs showed multiple rooms hitting Groq's rate limit
        // simultaneously and retrying into the same window together, worsening the 429s rather
        // than avoiding them. This is the last-resort fallback - correctness matters more than
        // speed, so it trades concurrency for reliability the same way the Gemini path now does.
        using var semaphore = new SemaphoreSlim(1);

        var tasks = rooms.Select(async (room, index) =>
        {
            await semaphore.WaitAsync(cancellationToken);
            try
            {
                if (index > 0)
                    await Task.Delay(TimeSpan.FromMilliseconds(600), cancellationToken);

                results[index] = await DetectOpeningsForRoomAsync(apiKey, model, image, imageWidth, imageHeight, room, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Qwen opening detection failed for room {Room} (skipping)", room.Label);
                results[index] = [];
            }
            finally
            {
                semaphore.Release();
            }
        });

        await Task.WhenAll(tasks);

        return FloorPlanImageUtils.DedupeOpenings(results.SelectMany(r => r).ToList());
    }

    private async Task<List<FloorPlanAnalysisOpening>> DetectOpeningsForRoomAsync(
        string apiKey, string model, Image<Rgba32> image, int imageWidth, int imageHeight, FloorPlanAnalysisRoom room, CancellationToken cancellationToken)
    {
        var rect = FloorPlanImageUtils.ComputeRoomCropRect(room, imageWidth, imageHeight);
        var cropBytes = FloorPlanImageUtils.BuildRoomCrop(image, rect);

        var args = await CallFunctionAsync(
            apiKey, model, FloorPlanPrompts.OpeningsSystemPrompt,
            FloorPlanPrompts.OpeningsUserText(room.Label), cropBytes, "image/png",
            FloorPlanPrompts.OpeningsToolName, FloorPlanPrompts.OpeningsToolDescription, OpeningsSchema, cancellationToken);

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

    // ── Shared Groq/Qwen call plumbing ──────────────────────────────────────

    /// <summary>
    /// Forces the model to call <paramref name="toolName"/> via Groq's OpenAI-compatible
    /// tool_choice, sends the image as a base64 data URL, and parses the resulting tool-call
    /// arguments (a JSON string, unlike Gemini's already-structured args) back into a JsonObject.
    /// </summary>
    private async Task<JsonObject?> CallFunctionAsync(
        string apiKey, string model, string systemPrompt, string userText, byte[] imageBytes, string mimeType,
        string toolName, string toolDescription, JsonObject schema, CancellationToken cancellationToken)
    {
        var body = new JsonObject
        {
            ["model"] = model,
            ["messages"] = new JsonArray
            {
                new JsonObject { ["role"] = "system", ["content"] = systemPrompt },
                new JsonObject
                {
                    ["role"] = "user",
                    ["content"] = new JsonArray
                    {
                        new JsonObject { ["type"] = "text", ["text"] = userText },
                        new JsonObject
                        {
                            ["type"] = "image_url",
                            ["image_url"] = new JsonObject { ["url"] = $"data:{mimeType};base64,{Convert.ToBase64String(imageBytes)}" }
                        }
                    }
                }
            },
            ["tools"] = new JsonArray
            {
                new JsonObject
                {
                    ["type"] = "function",
                    ["function"] = new JsonObject { ["name"] = toolName, ["description"] = toolDescription, ["parameters"] = schema.DeepClone() }
                }
            },
            ["tool_choice"] = new JsonObject { ["type"] = "function", ["function"] = new JsonObject { ["name"] = toolName } }
        };

        const string url = "https://api.groq.com/openai/v1/chat/completions";
        // Its own key, not Groq:MaxRetries (shared with GroqChatService/Sage's chat) - this method
        // is called once per room in parallel (RoomCropConcurrency), so under real rate-limiting
        // (see the 429 storm in production logs) 4 attempts per room compounds into a very long
        // tail. 2 fails faster and lets the room-level catch in DetectOpeningsPerRoomAsync move on.
        var maxAttempts = int.TryParse(_configuration["Groq:FloorPlanMaxRetries"], out var m) ? Math.Clamp(m, 1, 8) : 2;

        // Transport-level failures (connection reset/aborted mid-upload, SSL handshake failure) get
        // their OWN, larger retry budget, separate from maxAttempts above - confirmed in production
        // these are TCP/TLS-layer resets specifically on these large base64-image POST bodies, not a
        // Groq-side rate limit, so a fresh connection attempt is actually likely to succeed (unlike
        // retrying a genuine 429, where more attempts just means more waiting for the same quota).
        // Keeping it separate from maxAttempts means the fail-fast 429 behavior above is untouched.
        const int transportMaxAttempts = 4;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            HttpResponseMessage response;
            try
            {
                response = await SendWithTransportRetryAsync(url, body, apiKey, transportMaxAttempts, cancellationToken);
            }
            catch (HttpRequestException) when (attempt < maxAttempts)
            {
                // Exhausted the transport-retry budget too - fall through to the status-code retry
                // loop's own backoff rather than giving up immediately.
                var delay = TimeSpan.FromSeconds(Math.Pow(2, attempt));
                await Task.Delay(delay, cancellationToken);
                continue;
            }

            if (response.StatusCode == HttpStatusCode.TooManyRequests || response.StatusCode == HttpStatusCode.ServiceUnavailable)
            {
                var delay = ParseRetryAfter(response) ?? TimeSpan.FromSeconds(Math.Pow(2, attempt));
                _logger.LogWarning("Qwen floor-plan call returned {Status}. Attempt {Attempt}/{Max}. Waiting {Delay}s", (int)response.StatusCode, attempt, maxAttempts, delay.TotalSeconds);
                if (attempt == maxAttempts) response.EnsureSuccessStatusCode();
                await Task.Delay(delay, cancellationToken);
                continue;
            }

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Groq returned {Status} for Qwen floor-plan model {Model}. Response: {Body}", (int)response.StatusCode, model, errorBody);
                response.EnsureSuccessStatusCode();
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var root = JsonNode.Parse(json)?.AsObject();
            var message = root?["choices"]?.AsArray().FirstOrDefault()?["message"]?.AsObject();
            var toolCall = (message?["tool_calls"] as JsonArray)?.FirstOrDefault()?.AsObject();
            var argumentsJson = toolCall?["function"]?["arguments"]?.GetValue<string>();

            if (string.IsNullOrWhiteSpace(argumentsJson))
                return null;

            return JsonNode.Parse(argumentsJson) as JsonObject;
        }

        return null;
    }

    /// <summary>
    /// Sends the request, retrying ONLY on transport-level exceptions (connection reset/aborted,
    /// SSL handshake failure) - a fresh HttpRequestMessage must be built each attempt since a sent
    /// one can't be reused. Any actual HTTP response (200, 429, 500, etc.) returns immediately for
    /// the caller's own status-code handling; this only concerns itself with the request never
    /// reaching Groq at all.
    /// </summary>
    private async Task<HttpResponseMessage> SendWithTransportRetryAsync(
        string url, JsonObject body, string apiKey, int maxAttempts, CancellationToken cancellationToken)
    {
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, url) { Content = JsonContent.Create(body) };
            req.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");

            try
            {
                return await _httpClient.SendAsync(req, cancellationToken);
            }
            catch (HttpRequestException ex) when (attempt < maxAttempts)
            {
                var delay = TimeSpan.FromSeconds(Math.Pow(2, attempt));
                _logger.LogWarning(ex,
                    "Qwen floor-plan call failed at the transport level (connection reset mid-upload - likely this machine's network path, not Groq itself). Attempt {Attempt}/{Max}. Waiting {Delay}s",
                    attempt, maxAttempts, delay.TotalSeconds);
                await Task.Delay(delay, cancellationToken);
            }
        }

        // Unreachable: the final loop iteration's exception (if any) propagates out of the when-
        // guarded catch above instead of landing here, and a successful send already returned.
        throw new UnreachableException();
    }

    private static TimeSpan? ParseRetryAfter(HttpResponseMessage response)
    {
        if (response.Headers.RetryAfter?.Delta is { } d) return d;
        if (response.Headers.TryGetValues("Retry-After", out var values) && int.TryParse(values.FirstOrDefault(), out var seconds))
            return TimeSpan.FromSeconds(seconds);
        return null;
    }

    // ── Schemas (standard JSON Schema - lowercase types, unlike Gemini's uppercase-typed schema) ──

    private static readonly JsonObject RoomsSchema = (JsonNode.Parse("""
    {
      "type": "object",
      "properties": {
        "rooms": {
          "type": "array",
          "description": "One entry per distinct room/space visible in the floor plan.",
          "items": {
            "type": "object",
            "properties": {
              "label": { "type": "string", "description": "The room type/name, e.g. \"Bedroom\", \"Kitchen\", \"Bathroom\", \"Living Room\"." },
              "points": {
                "type": "array",
                "description": "The room outline as a polygon, tracing its visible wall corners in order. Each point is [xFraction, yFraction], as a FRACTION of the image width/height (0.0 to 1.0) - NOT pixel coordinates. At least 3 points.",
                "items": { "type": "array", "items": { "type": "number" } }
              },
              "dimensionText": { "type": "string", "description": "The printed dimension text for this room if visible, e.g. 11'7\" x 11'8\". Omit if not printed on the plan." }
            },
            "required": ["label", "points"]
          }
        },
        "overallStatedSize": { "type": "string", "description": "The overall stated size/title text if printed on the plan, e.g. 1050 Sq Feet - 2 Bedroom 2 Bath." },
        "estimatedTotalWidthMeters": {
          "type": "number",
          "description": "Your best estimate of the REAL-WORLD width, in meters, of the entire floor plan as drawn (from its leftmost to rightmost wall) - needed to convert the plan into real room sizes when no dimension text is printed. Estimate it using standard market/architectural reference sizes visible in the drawing: interior doors are usually about 0.8-0.9m wide, entry doors about 0.9-1.0m, windows about 1.0-1.8m, hallways about 1.0-1.3m wide, a queen/double bed is about 1.5m wide and 2.0m long, a standard car parking space is about 2.4m wide. Always provide a number, even if approximate."
        }
      },
      "required": ["rooms"]
    }
    """) as JsonObject)!;

    private static readonly JsonObject OpeningsSchema = (JsonNode.Parse("""
    {
      "type": "object",
      "properties": {
        "openings": {
          "type": "array",
          "description": "Every door and window drafting symbol found, one entry per symbol.",
          "items": {
            "type": "object",
            "properties": {
              "point": {
                "type": "array",
                "description": "The [xFraction, yFraction] location of the symbol, as a fraction of the image width/height (0.0 to 1.0), centered on the gap in the wall.",
                "items": { "type": "number" }
              },
              "type": { "type": "string", "enum": ["door", "window"], "description": "Whether this symbol is a door (including closet doors) or a window." },
              "room": { "type": "string", "description": "The room label this opening belongs to / leads into, if you can tell." }
            },
            "required": ["point", "type"]
          }
        }
      },
      "required": ["openings"]
    }
    """) as JsonObject)!;

    private static readonly JsonObject RoomOutlineSchema = (JsonNode.Parse("""
    {
      "type": "object",
      "properties": {
        "points": {
          "type": "array",
          "description": "The room outline as a polygon, tracing its visible wall corners in a single consistent direction. Each point is [xFraction, yFraction], fractions of THIS cropped image (0.0 to 1.0). At least 3 points.",
          "items": { "type": "array", "items": { "type": "number" } }
        }
      },
      "required": ["points"]
    }
    """) as JsonObject)!;
}
