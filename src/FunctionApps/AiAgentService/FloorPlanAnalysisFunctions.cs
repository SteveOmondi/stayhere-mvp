using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using StayHere.Application.Common.Interfaces;
using StayHere.Shared.Attributes;

namespace StayHere.FunctionApps.AiAgentService;

/// <summary>
/// Analyzes an uploaded floor plan image and returns a raw AI draft (room polygons, door/window
/// symbols, printed size text, estimated scale) — all in fraction-of-image coordinates. The
/// caller (property-owner portal) resolves real-world scale client-side (preferring the
/// listing's own known size) and snaps openings onto traced walls before ever saving anything;
/// this endpoint does no persistence and never touches a Listing.
/// </summary>
public class FloorPlanAnalysisFunctions
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IFloorPlanAnalysisService _analysisService;
    private readonly ILogger<FloorPlanAnalysisFunctions> _logger;

    public FloorPlanAnalysisFunctions(IFloorPlanAnalysisService analysisService, ILogger<FloorPlanAnalysisFunctions> logger)
    {
        _analysisService = analysisService;
        _logger = logger;
    }

    [Function("AnalyzeFloorPlan")]
    [Authorize("PropertyOwner", "PropertyManager", "Admin")]
    public async Task<HttpResponseData> Analyze(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "floor-plan/analyze")] HttpRequestData req)
    {
        try
        {
            var contentType = req.Headers.TryGetValues("Content-Type", out var ct) ? ct.FirstOrDefault() ?? string.Empty : string.Empty;
            if (!contentType.Contains("multipart/form-data", StringComparison.OrdinalIgnoreCase))
                return await ErrorAsync(req, HttpStatusCode.BadRequest, "Content-Type must be multipart/form-data.");

            var boundary = ExtractBoundary(contentType);
            if (string.IsNullOrWhiteSpace(boundary))
                return await ErrorAsync(req, HttpStatusCode.BadRequest, "Multipart boundary not found.");

            var (imageBytes, mimeType) = await ParseImagePartAsync(req.Body, boundary);
            if (imageBytes == null || imageBytes.Length == 0)
                return await ErrorAsync(req, HttpStatusCode.BadRequest, "Multipart body must include an 'image' part.");

            var result = await _analysisService.AnalyzeAsync(imageBytes, mimeType ?? "image/png");

            return await JsonAsync(req, HttpStatusCode.OK, new
            {
                rooms = result.Rooms.Select(r => new { label = r.Label, points = r.Points, dimensionText = r.DimensionText }),
                openings = result.Openings.Select(o => new { point = o.Point, type = o.Type }),
                overallStatedSize = result.OverallStatedSize,
                estimatedTotalWidthMeters = result.EstimatedTotalWidthMeters
            });
        }
        catch (InvalidOperationException ex)
        {
            // Model returned nothing usable, or is mis-configured — a 4xx, not a server bug.
            _logger.LogWarning(ex, "Floor plan analysis returned no usable result");
            return await ErrorAsync(req, HttpStatusCode.UnprocessableEntity, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Floor plan analysis failed");
            return await ErrorAsync(req, HttpStatusCode.InternalServerError, "Floor plan analysis failed.");
        }
    }

    // ── Multipart parsing (mirrors PropertyService.UploadFunctions' hand-rolled parser) ──

    private static string? ExtractBoundary(string contentType)
    {
        foreach (var part in contentType.Split(';'))
        {
            var trimmed = part.Trim();
            if (trimmed.StartsWith("boundary=", StringComparison.OrdinalIgnoreCase))
                return trimmed["boundary=".Length..].Trim('"');
        }
        return null;
    }

    private static async Task<(byte[]? ImageBytes, string? MimeType)> ParseImagePartAsync(Stream body, string boundary)
    {
        using var ms = new MemoryStream();
        await body.CopyToAsync(ms);
        var bytes = ms.ToArray();

        var delimBytes = System.Text.Encoding.UTF8.GetBytes($"--{boundary}");
        foreach (var part in SplitBytes(bytes, delimBytes))
        {
            if (part.Length == 0) continue;
            var headerEnd = IndexOf(part, "\r\n\r\n"u8.ToArray());
            if (headerEnd < 0) continue;

            var headerText = System.Text.Encoding.UTF8.GetString(part, 0, headerEnd);
            if (!headerText.Contains("name=\"image\"", StringComparison.OrdinalIgnoreCase)) continue;

            var bodyBytes = part.AsSpan(headerEnd + 4).ToArray();
            if (bodyBytes.Length >= 2 && bodyBytes[^2] == '\r' && bodyBytes[^1] == '\n')
                bodyBytes = bodyBytes[..^2];

            var ctMatch = Regex.Match(headerText, @"Content-Type:\s*(\S+)", RegexOptions.IgnoreCase);
            var mimeType = ctMatch.Success ? ctMatch.Groups[1].Value : null;

            return (bodyBytes, mimeType);
        }

        return (null, null);
    }

    private static List<byte[]> SplitBytes(byte[] source, byte[] delimiter)
    {
        var result = new List<byte[]>();
        var start = 0;
        while (true)
        {
            var idx = IndexOf(source.AsSpan(start).ToArray(), delimiter);
            if (idx < 0) break;
            result.Add(source.AsSpan(start, idx).ToArray());
            start += idx + delimiter.Length;
            if (start < source.Length && source[start] == '\r') start++;
            if (start < source.Length && source[start] == '\n') start++;
        }
        return result;
    }

    private static int IndexOf(byte[] haystack, byte[] needle)
    {
        if (needle.Length == 0 || haystack.Length < needle.Length) return -1;
        for (var i = 0; i <= haystack.Length - needle.Length; i++)
        {
            var match = true;
            for (var j = 0; j < needle.Length; j++)
            {
                if (haystack[i + j] != needle[j]) { match = false; break; }
            }
            if (match) return i;
        }
        return -1;
    }

    // ── Response helpers ─────────────────────────────────────────────────────

    private static async Task<HttpResponseData> JsonAsync(HttpRequestData req, HttpStatusCode status, object payload)
    {
        var response = req.CreateResponse(status);
        response.Headers.Add("Content-Type", "application/json; charset=utf-8");
        await response.WriteStringAsync(JsonSerializer.Serialize(payload, JsonOptions));
        return response;
    }

    private static Task<HttpResponseData> ErrorAsync(HttpRequestData req, HttpStatusCode status, string message) =>
        JsonAsync(req, status, new { error = message });
}
