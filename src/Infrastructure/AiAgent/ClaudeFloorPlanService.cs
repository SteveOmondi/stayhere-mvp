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
/// Analyzes floor plan images via Claude (Anthropic) Sonnet - the fastest and most accurate of the
/// three configured providers (see <see cref="FloorPlanAnalysisFallbackService"/>), and the default
/// primary.
///
/// Reuses the accuracy-critical insight the Gemini/Qwen implementations already proved out: crop
/// each room before looking for door/window symbols, because a whole-page image loses too much
/// detail for small drafting symbols. But it fixes their biggest cost. Both of those providers issue
/// one network round-trip PER DETECTED ROOM for opening detection, deliberately serialized with an
/// artificial inter-request delay to dodge a FREE-TIER rate limit (see the comments in
/// <see cref="GeminiFloorPlanService"/> - a real production incident where concurrent per-room calls
/// got silently throttled and undercounted openings). A paid Anthropic key doesn't carry that
/// constraint, and Claude's Messages API natively accepts many images in a single request - so this
/// service sends every room's crop together, in ONE batched call, instead of N sequential ones. For a
/// 10-room unit that's 2 total model calls instead of 11 - that's where this service's real speedup
/// comes from (collapsing round-trips), not a faster response per call, which alone would only
/// redistribute the same slowness.
/// </summary>
public class ClaudeFloorPlanService : IFloorPlanAnalysisService
{
    private const string AnthropicVersion = "2023-06-01";
    private const int DefaultMaxTokens = 4096;
    private const double MarginCoverageThreshold = 0.12;
    private const double MarginCropOverlapFraction = 0.15;

    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ClaudeFloorPlanService> _logger;

    public ClaudeFloorPlanService(HttpClient httpClient, IConfiguration configuration, ILogger<ClaudeFloorPlanService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<FloorPlanAnalysisResult> AnalyzeAsync(byte[] imageBytes, string mimeType, CancellationToken cancellationToken = default)
    {
        var apiKey = ResolveApiKey();
        // Anthropic names its models "claude-<family>-<major>-<minor>" (e.g. Opus 5.5 is
        // "claude-opus-5-5") - "claude-sonnet-5-5" follows that same pattern for Sonnet 5.5, but
        // double-check this against the Models page in the Claude Console if it ever 404s; it's a
        // one-line config change (Anthropic:FloorPlanModel), not a code change, to correct.
        var model = _configuration["Anthropic:FloorPlanModel"] ?? "claude-sonnet-5-5";

        var (rooms, overallStatedSize, estimatedTotalWidthMeters) = await DetectRoomsAsync(apiKey, model, imageBytes, mimeType, cancellationToken);

        var openings = rooms.Count > 0
            ? await DetectOpeningsBatchAsync(apiKey, model, imageBytes, rooms, cancellationToken)
            : [];

        return new FloorPlanAnalysisResult(rooms, openings, overallStatedSize, estimatedTotalWidthMeters);
    }

    private string ResolveApiKey()
    {
        var apiKey = _configuration["Anthropic:ApiKey"]?.Trim() ?? Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY")?.Trim();
        if (string.IsNullOrEmpty(apiKey))
            throw new InvalidOperationException("Anthropic API key is not configured (Anthropic:ApiKey).");
        return apiKey;
    }

    // ── Pass 1: rooms (whole image, one call) ───────────────────────────────

    private async Task<(List<FloorPlanAnalysisRoom> Rooms, string? OverallStatedSize, double? EstimatedTotalWidthMeters)> DetectRoomsAsync(
        string apiKey, string model, byte[] imageBytes, string mimeType, CancellationToken cancellationToken)
    {
        var content = new JsonArray
        {
            BuildImageBlock(imageBytes, mimeType),
            BuildTextBlock("Analyze this floor plan and report every room.")
        };

        var args = await CallStructuredAsync(apiKey, model, FloorPlanPrompts.RoomsSystemPrompt, content, RoomsSchema, DefaultMaxTokens, cancellationToken);

        if (args == null)
            throw new InvalidOperationException("Model did not return the expected structured output for rooms.");

        var rooms = ParseRooms(args);
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
            if (FloorPlanImageUtils.IsSelfIntersecting(r.Points))
                _logger.LogWarning("Pass-1 room {Label} has a self-intersecting polygon ({PointCount} points)", r.Label, r.Points.Count);
        }

        // Same "is there a whole uncovered section" check Gemini/Qwen use - a detached annex tucked
        // at the edge of the sheet can still be missed even by a strong model on a single whole-image
        // pass. Only one extra call, and only when a real margin is actually uncovered.
        var missedRooms = await DetectMissedRoomsAsync(apiKey, model, imageBytes, rooms, cancellationToken);
        rooms.AddRange(missedRooms);

        var overallStatedSize = args["overallStatedSize"]?.GetValue<string>();
        double? estimatedTotalWidthMeters = args["estimatedTotalWidthMeters"] is JsonValue v && v.TryGetValue<double>(out var w) && w > 0 ? w : null;

        return (rooms, overallStatedSize, estimatedTotalWidthMeters);
    }

    private List<FloorPlanAnalysisRoom> ParseRooms(JsonObject args)
    {
        var rooms = new List<FloorPlanAnalysisRoom>();
        if (args["rooms"] is not JsonArray roomsArray) return rooms;

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

            var dimensionText = roomObj["dimensionText"]?.GetValue<string>();
            rooms.Add(new FloorPlanAnalysisRoom(label, points, dimensionText));
        }
        return rooms;
    }

    /// <summary>Same margin-scan technique as GeminiFloorPlanService.DetectMissedRoomsAsync - checks
    /// only the single largest uncovered edge, since a detached annex is virtually always on one
    /// dominant side and this pass costs one extra call regardless of outcome.</summary>
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

        var largestMargin = margins
            .Where(m => m.Size >= MarginCoverageThreshold)
            .OrderByDescending(m => m.Size)
            .Cast<(string Side, double Size)?>()
            .FirstOrDefault();

        if (largestMargin is not { } chosen) return [];

        using var image = Image.Load<Rgba32>(imageBytes);
        var (side, size) = chosen;
        var rect = ComputeMarginCropRect(side, size, image.Width, image.Height);
        var cropBytes = FloorPlanImageUtils.BuildRoomCrop(image, rect);
        var existingLabels = string.Join(", ", rooms.Select(r => r.Label).Distinct());

        var content = new JsonArray
        {
            BuildImageBlock(cropBytes, "image/png"),
            BuildTextBlock(
                $"This is the {side} section of a larger floor plan. Rooms already identified elsewhere on the full " +
                $"plan: {existingLabels}. Report ONLY additional distinct room(s) visible in THIS cropped section " +
                "that are NOT among those already listed - for example a separate annex, second unit, or extra room " +
                "tucked at the edge of the sheet. If everything visible here is already part of a listed room, " +
                "report an empty list.")
        };

        JsonObject? args;
        try
        {
            args = await CallStructuredAsync(apiKey, model, FloorPlanPrompts.RoomsSystemPrompt, content, RoomsSchema, DefaultMaxTokens, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Missed-room check failed for the {Side} margin (skipping)", side);
            return [];
        }

        var candidates = args != null ? ParseRooms(args) : [];
        var extraRooms = new List<FloorPlanAnalysisRoom>();

        foreach (var local in candidates)
        {
            var mappedPoints = local.Points
                .Select(p => new[]
                {
                    (rect.Left + p[0] * rect.Width) / (double)image.Width,
                    (rect.Top + p[1] * rect.Height) / (double)image.Height
                })
                .ToList();

            var candidate = local with { Points = mappedPoints };

            if (OverlapsExistingRoom(candidate, rooms) || OverlapsExistingRoom(candidate, extraRooms)) continue;

            _logger.LogInformation("Missed-room found via {Side} margin scan: {Label}", side, candidate.Label);
            if (FloorPlanImageUtils.IsSelfIntersecting(mappedPoints))
                _logger.LogWarning("Missed-room {Label} (via {Side} margin scan) has a self-intersecting polygon", candidate.Label, side);

            extraRooms.Add(candidate);
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

    // ── Pass 2: ALL rooms' openings in ONE batched call ─────────────────────

    /// <summary>
    /// The core speedup over Gemini/Qwen: every room's crop goes into a SINGLE request (Claude's
    /// Messages API natively accepts many images per call), each preceded by a short "Image N: Label"
    /// text label as Anthropic's own docs recommend for multi-image requests. One network round-trip
    /// regardless of room count, instead of one per room - no artificial inter-request delay needed
    /// either, since there's only one request to space out.
    /// </summary>
    private async Task<List<FloorPlanAnalysisOpening>> DetectOpeningsBatchAsync(
        string apiKey, string model, byte[] imageBytes, List<FloorPlanAnalysisRoom> rooms, CancellationToken cancellationToken)
    {
        using var image = Image.Load<Rgba32>(imageBytes);
        var imageWidth = image.Width;
        var imageHeight = image.Height;

        var rects = rooms.Select(r => FloorPlanImageUtils.ComputeRoomCropRect(r, imageWidth, imageHeight)).ToList();

        var content = new JsonArray();
        for (var i = 0; i < rooms.Count; i++)
        {
            var cropBytes = FloorPlanImageUtils.BuildRoomCrop(image, rects[i]);
            content.Add(BuildTextBlock($"Image {i + 1}: {rooms[i].Label}"));
            content.Add(BuildImageBlock(cropBytes, "image/png"));
        }
        content.Add(BuildTextBlock(FloorPlanPrompts.OpeningsBatchUserText(rooms.Count)));

        JsonObject? args;
        try
        {
            args = await CallStructuredAsync(apiKey, model, FloorPlanPrompts.OpeningsBatchSystemPrompt, content,
                OpeningsBatchSchema, DefaultMaxTokens, cancellationToken);
        }
        catch (Exception ex)
        {
            // Unlike Gemini/Qwen's per-room loop, there's no partial-failure case to weigh here -
            // this single batched call either returns openings for every room or fails outright. A
            // full failure just means this provider's whole analysis failed, which
            // FloorPlanAnalysisFallbackService already handles by moving to the next provider.
            _logger.LogError(ex, "Claude batched opening detection failed for all {Count} room(s)", rooms.Count);
            throw;
        }

        var openings = new List<FloorPlanAnalysisOpening>();
        if (args?["rooms"] is JsonArray roomGroups)
        {
            foreach (var groupNode in roomGroups)
            {
                if (groupNode is not JsonObject groupObj) continue;
                var imageNumber = groupObj["imageNumber"]?.GetValue<int>() ?? 0;
                var roomIndex = imageNumber - 1;
                if (roomIndex < 0 || roomIndex >= rooms.Count) continue;

                var rect = rects[roomIndex];
                var room = rooms[roomIndex];

                if (groupObj["openings"] is not JsonArray openingsArray) continue;
                foreach (var node in openingsArray)
                {
                    if (node is not JsonObject obj) continue;
                    var pointNode = obj["point"] as JsonArray;
                    // Case-insensitive: Anthropic's structured-output docs note enum values can come
                    // back with different capitalization than declared in the schema.
                    var rawType = obj["type"]?.GetValue<string>();
                    var type = rawType?.ToLowerInvariant();
                    if (pointNode == null || pointNode.Count != 2 || (type != "door" && type != "window")) continue;

                    var localX = pointNode[0]!.GetValue<double>();
                    var localY = pointNode[1]!.GetValue<double>();
                    openings.Add(new FloorPlanAnalysisOpening(
                        [(rect.Left + localX * rect.Width) / imageWidth, (rect.Top + localY * rect.Height) / imageHeight],
                        type,
                        room.Label));
                }
            }
        }

        return FloorPlanImageUtils.DedupeOpenings(openings);
    }

    // ── Shared Claude (Anthropic Messages API) call plumbing ────────────────

    private static JsonObject BuildTextBlock(string text) => new() { ["type"] = "text", ["text"] = text };

    private static JsonObject BuildImageBlock(byte[] bytes, string mimeType) => new()
    {
        ["type"] = "image",
        ["source"] = new JsonObject
        {
            ["type"] = "base64",
            ["media_type"] = mimeType,
            ["data"] = Convert.ToBase64String(bytes)
        }
    };

    /// <summary>
    /// Uses Claude's native structured-outputs mechanism (<c>output_config.format</c>, GA as of the
    /// 5.5 model generation) rather than forcing a tool call - confirmed live that the older forced
    /// <c>tool_choice: {"type":"tool",...}</c> approach (what Gemini/Qwen's services use, adapted to
    /// their own APIs) is REJECTED by this model generation with a 400 ("tool_choice: type \"tool\"
    /// and \"any\" are not supported for this model"). This newer mechanism is simpler anyway - no
    /// tool/tool_choice wrapper at all, just a JSON Schema the final response is constrained to
    /// match, returned directly as a JSON string in the response's one text content block.
    /// </summary>
    private async Task<JsonObject?> CallStructuredAsync(
        string apiKey, string model, string systemPrompt, JsonArray content, JsonObject schema, int maxTokens, CancellationToken cancellationToken)
    {
        var body = new JsonObject
        {
            ["model"] = model,
            ["max_tokens"] = maxTokens,
            ["system"] = systemPrompt,
            ["messages"] = new JsonArray { new JsonObject { ["role"] = "user", ["content"] = content } },
            // schema must be cloned: RoomsSchema is a static field reused across BOTH the rooms
            // pass and the missed-rooms pass within one analysis - a JsonNode can only ever have one
            // parent, so assigning the same instance into a second request body throws "The node
            // already has a parent" the moment a missed-room check actually fires (confirmed live -
            // the same bug GeminiFloorPlanService.CallFunctionOnModelAsync already had to clone
            // schema/parts for, for the exact same reason).
            ["output_config"] = new JsonObject
            {
                ["format"] = new JsonObject { ["type"] = "json_schema", ["schema"] = schema.DeepClone() }
            }
        };

        const string url = "https://api.anthropic.com/v1/messages";
        var maxAttempts = int.TryParse(_configuration["Anthropic:FloorPlanMaxRetries"], out var m) ? Math.Clamp(m, 1, 8) : 2;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, url) { Content = JsonContent.Create(body) };
            req.Headers.TryAddWithoutValidation("x-api-key", apiKey);
            req.Headers.TryAddWithoutValidation("anthropic-version", AnthropicVersion);

            HttpResponseMessage response;
            try
            {
                response = await _httpClient.SendAsync(req, cancellationToken);
            }
            catch (HttpRequestException ex) when (attempt < maxAttempts)
            {
                var delay = TimeSpan.FromSeconds(Math.Pow(2, attempt));
                _logger.LogWarning(ex, "Claude floor-plan call failed at the transport level. Attempt {Attempt}/{Max}. Waiting {Delay}s", attempt, maxAttempts, delay.TotalSeconds);
                await Task.Delay(delay, cancellationToken);
                continue;
            }

            // 429 = rate limited, 529 = Anthropic's "overloaded_error", 503 = generic transient.
            if (response.StatusCode == HttpStatusCode.TooManyRequests || (int)response.StatusCode == 529 || response.StatusCode == HttpStatusCode.ServiceUnavailable)
            {
                var delay = ParseRetryAfter(response) ?? TimeSpan.FromSeconds(Math.Pow(2, attempt));
                _logger.LogWarning("Claude floor-plan call returned {Status}. Attempt {Attempt}/{Max}. Waiting {Delay}s", (int)response.StatusCode, attempt, maxAttempts, delay.TotalSeconds);
                if (attempt == maxAttempts) response.EnsureSuccessStatusCode();
                await Task.Delay(delay, cancellationToken);
                continue;
            }

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Claude returned {Status} for floor-plan model {Model}. Response: {Body}", (int)response.StatusCode, model, errorBody);
                response.EnsureSuccessStatusCode();
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var root = JsonNode.Parse(json)?.AsObject();

            var stopReason = root?["stop_reason"]?.GetValue<string>();
            if (stopReason == "refusal")
                throw new InvalidOperationException("Claude declined to analyze this image.");
            if (stopReason == "max_tokens")
                _logger.LogWarning("Claude floor-plan call hit max_tokens ({MaxTokens}) - output may be truncated/invalid JSON", maxTokens);

            var textBlock = root?["content"]?.AsArray()
                .FirstOrDefault(b => b?["type"]?.GetValue<string>() == "text");
            var text = textBlock?["text"]?.GetValue<string>();

            return string.IsNullOrWhiteSpace(text) ? null : JsonNode.Parse(text)?.AsObject();
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

    // ── Schemas (standard JSON Schema, for Claude's output_config.format.schema) ──
    // additionalProperties:false is REQUIRED by Anthropic's structured-outputs grammar at every
    // object level (confirmed in docs). Array minItems/maxItems beyond 0/1 are NOT supported, so a
    // [xFraction, yFraction] point can only be described, not enforced to exactly 2 elements -
    // defensive parsing (.Count == 2 checks above) covers the rest.

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
                "description": "The room outline as a polygon, tracing its visible wall corners in order. Each point is a 2-element [xFraction, yFraction] array, as a FRACTION of the image width/height (0.0 to 1.0) - NOT pixel coordinates. At least 3 points.",
                "items": { "type": "array", "items": { "type": "number" } }
              },
              "dimensionText": { "type": "string", "description": "The printed dimension text for this room if visible, e.g. 11'7\" x 11'8\". Omit if not printed on the plan." }
            },
            "required": ["label", "points"],
            "additionalProperties": false
          }
        },
        "overallStatedSize": { "type": "string", "description": "The overall stated size/title text if printed on the plan, e.g. 1050 Sq Feet - 2 Bedroom 2 Bath." },
        "estimatedTotalWidthMeters": {
          "type": "number",
          "description": "Your best estimate of the REAL-WORLD width, in meters, of the entire floor plan as drawn (from its leftmost to rightmost wall) - needed to convert the plan into real room sizes when no dimension text is printed. Estimate it using standard market/architectural reference sizes visible in the drawing: interior doors are usually about 0.8-0.9m wide, entry doors about 0.9-1.0m, windows about 1.0-1.8m, hallways about 1.0-1.3m wide, a queen/double bed is about 1.5m wide and 2.0m long, a standard car parking space is about 2.4m wide. Always provide a number, even if approximate."
        }
      },
      "required": ["rooms"],
      "additionalProperties": false
    }
    """) as JsonObject)!;

    private static readonly JsonObject OpeningsBatchSchema = (JsonNode.Parse("""
    {
      "type": "object",
      "properties": {
        "rooms": {
          "type": "array",
          "description": "One group per image provided, in any order - include imageNumber for each so results can be matched back to the right image. Every image must get a group, even an empty one.",
          "items": {
            "type": "object",
            "properties": {
              "imageNumber": { "type": "integer", "description": "The image number this group is for, matching its 'Image N:' label (1-based)." },
              "openings": {
                "type": "array",
                "description": "Every door and window drafting symbol found in this image. Empty array if none.",
                "items": {
                  "type": "object",
                  "properties": {
                    "point": {
                      "type": "array",
                      "description": "The symbol's location within THIS image as a 2-element [xFraction, yFraction] array, centered on the gap in the wall.",
                      "items": { "type": "number" }
                    },
                    "type": { "type": "string", "enum": ["door", "window"], "description": "Whether this symbol is a door (including closet doors) or a window." }
                  },
                  "required": ["point", "type"],
                  "additionalProperties": false
                }
              }
            },
            "required": ["imageNumber", "openings"],
            "additionalProperties": false
          }
        }
      },
      "required": ["rooms"],
      "additionalProperties": false
    }
    """) as JsonObject)!;
}
