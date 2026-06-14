using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using StayHere.Application.Common.Interfaces;
using StayHere.Shared.Attributes;

namespace StayHere.PropertyService.Functions;

/// <summary>
/// File upload endpoints backed by Cloudflare R2.
///
/// Two patterns are exposed so the frontend can choose the most efficient path:
///
///   Pattern A — Client-direct (preferred for large files)
///   POST /upload/presigned-url
///     → Returns a short-lived presigned PUT URL.
///       The client uploads the file directly to R2 from the browser,
///       completely bypassing the API server and avoiding bandwidth costs.
///
///   Pattern B — Server-proxied (useful for small files or when the frontend
///               cannot make cross-origin PUT requests to R2)
///   POST /upload/file
///     → The API receives the raw bytes (multipart/form-data) and forwards
///       them to R2 server-side.
///
/// Both endpoints are folder-driven so they can serve any part of the product:
///
///   folder                      | content type examples
///   ----------------------------|-------------------------------------------
///   properties/images           | image/jpeg, image/png, image/webp
///   properties/videos           | video/mp4, video/webm
///   properties/floor-plans      | application/pdf
///   applications/documents      | image/jpeg, image/png, application/pdf
///   profiles/avatars            | image/jpeg, image/png
///
/// Authorised roles: PropertyOwner, PropertyManager, Tenant, Admin.
/// Tenants may upload to applications/documents only — enforce at the
/// application layer if stricter role control is needed.
/// </summary>
public class UploadFunctions
{
    private readonly IStorageService _storage;
    private readonly ILogger<UploadFunctions> _log;

    private static readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);

    // Folders that any authenticated user can upload to (stricter roles can be
    // added per-folder if needed in future).
    private static readonly HashSet<string> AllowedFolders = new(StringComparer.OrdinalIgnoreCase)
    {
        "properties/images",
        "properties/videos",
        "properties/floor-plans",
        "applications/documents",
        "profiles/avatars",
        "profiles/documents",
    };

    public UploadFunctions(IStorageService storage, ILogger<UploadFunctions> log)
    {
        _storage = storage;
        _log = log;
    }

    // ── Pattern A: Presigned URL (client-direct) ───────────────────────────────

    /// <summary>
    /// Returns a presigned PUT URL. The client uploads directly to R2 using
    /// a single PUT request — no data flows through the API server.
    ///
    /// Request body (JSON):
    /// {
    ///   "folder":      "properties/images",   // required — see allowed folders above
    ///   "fileName":    "kitchen.jpg",          // original file name (used for the key)
    ///   "contentType": "image/jpeg",           // MIME type — must match what the client sends
    ///   "expiryMinutes": 15                    // optional, default 15, max 60
    /// }
    ///
    /// Success 200:
    /// {
    ///   "uploadUrl":  "https://...",           // PUT file bytes here (no auth header needed)
    ///   "fileKey":    "properties/images/a1b2c3d4-kitchen.jpg",
    ///   "publicUrl":  "https://assets.stayhere.co.ke/properties/images/a1b2c3d4-kitchen.jpg",
    ///   "expiresAt":  "2026-06-13T10:15:00Z"
    /// }
    ///
    /// Client upload (from browser):
    ///   await fetch(uploadUrl, { method: "PUT", body: fileBlob,
    ///                            headers: { "Content-Type": contentType } });
    /// Then store publicUrl in your DB — the file is live immediately.
    /// </summary>
    [Function("GetPresignedUploadUrl")]
    [Authorize("PropertyOwner", "PropertyManager", "Tenant", "Admin")]
    public async Task<HttpResponseData> GetPresignedUploadUrl(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post",
            Route = "upload/presigned-url")] HttpRequestData req)
    {
        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<PresignedUrlRequest>(body, _json);

            var validation = ValidateRequest(dto?.Folder, dto?.FileName, dto?.ContentType);
            if (validation is not null)
                return await Error(req, HttpStatusCode.BadRequest, validation);

            var expiry = TimeSpan.FromMinutes(
                Math.Clamp(dto!.ExpiryMinutes > 0 ? dto.ExpiryMinutes : 15, 1, 60));

            var result = await _storage.GetPresignedUploadUrlAsync(
                dto.Folder!, dto.FileName!, dto.ContentType!, expiry);

            _log.LogInformation(
                "Presigned URL issued — folder: {Folder}, key: {Key}",
                dto.Folder, result.FileKey);

            return await Json(req, HttpStatusCode.OK, new
            {
                uploadUrl   = result.UploadUrl,
                fileKey     = result.FileKey,
                publicUrl   = result.PublicUrl,
                expiresAt   = result.ExpiresAt,
                // IMPORTANT: the client MUST include this exact Content-Type header
                // in the PUT request, otherwise R2 will return 403 (it's part of the
                // SigV4 signature and must match what was used to generate the URL).
                contentType = dto!.ContentType
            });
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Failed to generate presigned upload URL.");
            return await Error(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    // ── Pattern B: Server-proxied upload (multipart/form-data) ────────────────

    /// <summary>
    /// Accepts a multipart/form-data POST and forwards the bytes to R2.
    /// Use this when the client cannot PUT directly (rare).
    ///
    /// Form fields:
    ///   folder      — required, e.g. "properties/images"
    ///   file        — the file binary part (Content-Disposition: form-data; name="file"; filename="...")
    ///
    /// Success 201:
    /// {
    ///   "fileKey":   "properties/images/a1b2c3d4-kitchen.jpg",
    ///   "publicUrl": "https://assets.stayhere.co.ke/..."
    /// }
    /// </summary>
    [Function("UploadFile")]
    [Authorize("PropertyOwner", "PropertyManager", "Tenant", "Admin")]
    public async Task<HttpResponseData> UploadFile(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post",
            Route = "upload/file")] HttpRequestData req)
    {
        try
        {
            // Azure Functions Worker doesn't have built-in multipart parsing,
            // so we read it manually using the HttpMultipartParser library approach
            // or rely on the Content-Type boundary.
            var contentType = req.Headers.TryGetValues("Content-Type", out var ct)
                ? ct.FirstOrDefault() ?? string.Empty
                : string.Empty;

            if (!contentType.Contains("multipart/form-data", StringComparison.OrdinalIgnoreCase))
                return await Error(req, HttpStatusCode.BadRequest,
                    "Content-Type must be multipart/form-data.");

            // Parse multipart body
            var boundary = ExtractBoundary(contentType);
            if (string.IsNullOrWhiteSpace(boundary))
                return await Error(req, HttpStatusCode.BadRequest, "Multipart boundary not found.");

            var (folder, fileName, fileContentType, fileStream) =
                await ParseMultipartAsync(req.Body, boundary);

            if (fileStream is null || string.IsNullOrWhiteSpace(fileName))
                return await Error(req, HttpStatusCode.BadRequest,
                    "Multipart body must include a 'file' part with a filename.");

            var validation = ValidateRequest(folder, fileName, fileContentType);
            if (validation is not null)
                return await Error(req, HttpStatusCode.BadRequest, validation);

            await using (fileStream)
            {
                var result = await _storage.UploadAsync(
                    fileStream, folder!, fileName, fileContentType ?? "application/octet-stream");

                _log.LogInformation(
                    "Server-proxied upload complete — key: {Key}", result.FileKey);

                return await Json(req, HttpStatusCode.Created, new
                {
                    fileKey   = result.FileKey,
                    publicUrl = result.PublicUrl
                });
            }
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Server-proxied upload failed.");
            return await Error(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    // ── Utility: resolve public URL for an existing key ───────────────────────

    /// <summary>
    /// Returns the public delivery URL for a file that is already stored in R2.
    /// Useful when you have a fileKey stored in the DB and need the full URL.
    ///
    /// GET /upload/url?key=properties/images/a1b2c3d4-kitchen.jpg
    /// → { "publicUrl": "https://assets.stayhere.co.ke/..." }
    /// </summary>
    [Function("GetPublicUrl")]
    [Authorize("PropertyOwner", "PropertyManager", "Tenant", "Admin")]
    public async Task<HttpResponseData> GetPublicUrl(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get",
            Route = "upload/url")] HttpRequestData req)
    {
        var key = System.Web.HttpUtility.ParseQueryString(req.Url.Query)["key"];
        if (string.IsNullOrWhiteSpace(key))
            return await Error(req, HttpStatusCode.BadRequest, "Query parameter 'key' is required.");

        return await Json(req, HttpStatusCode.OK, new
        {
            fileKey   = key,
            publicUrl = _storage.GetPublicUrl(key)
        });
    }

    // ── Validation ─────────────────────────────────────────────────────────────

    private static string? ValidateRequest(string? folder, string? fileName, string? contentType)
    {
        if (string.IsNullOrWhiteSpace(folder))
            return "'folder' is required.";
        if (!AllowedFolders.Contains(folder))
            return $"Folder '{folder}' is not permitted. Allowed: {string.Join(", ", AllowedFolders)}.";
        if (string.IsNullOrWhiteSpace(fileName))
            return "'fileName' is required.";
        if (string.IsNullOrWhiteSpace(contentType))
            return "'contentType' is required.";
        if (Path.GetExtension(fileName).Length < 2)
            return "fileName must include a file extension.";
        return null;
    }

    // ── Multipart parser ───────────────────────────────────────────────────────

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

    private static async Task<(string? Folder, string? FileName, string? ContentType, Stream? FileStream)>
        ParseMultipartAsync(Stream body, string boundary)
    {
        // Read entire body into memory for simple parsing (suitable for typical document/image sizes).
        // For very large files (>100 MB), switch to Pattern A (presigned URL) instead.
        using var ms = new MemoryStream();
        await body.CopyToAsync(ms);
        var bytes = ms.ToArray();

        string? folder = null;
        string? fileName = null;
        string? fileContentType = null;
        Stream? fileStream = null;

        var delimBytes = System.Text.Encoding.UTF8.GetBytes($"--{boundary}");
        var parts = SplitBytes(bytes, delimBytes);

        foreach (var part in parts)
        {
            if (part.Length == 0) continue;
            var headerEnd = IndexOf(part, "\r\n\r\n"u8.ToArray());
            if (headerEnd < 0) continue;

            var headerText = System.Text.Encoding.UTF8.GetString(part, 0, headerEnd);
            var bodyBytes  = part.AsSpan(headerEnd + 4).ToArray();

            // Strip trailing \r\n--
            if (bodyBytes.Length >= 2 && bodyBytes[^2] == '\r' && bodyBytes[^1] == '\n')
                bodyBytes = bodyBytes[..^2];

            if (headerText.Contains("name=\"folder\"", StringComparison.OrdinalIgnoreCase))
            {
                folder = System.Text.Encoding.UTF8.GetString(bodyBytes).Trim();
            }
            else if (headerText.Contains("name=\"file\"", StringComparison.OrdinalIgnoreCase))
            {
                // Extract filename
                var fnMatch = System.Text.RegularExpressions.Regex.Match(
                    headerText, @"filename=""([^""]+)""", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                if (fnMatch.Success) fileName = fnMatch.Groups[1].Value;

                // Extract content type
                var ctMatch = System.Text.RegularExpressions.Regex.Match(
                    headerText, @"Content-Type:\s*(\S+)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                if (ctMatch.Success) fileContentType = ctMatch.Groups[1].Value;

                fileStream = new MemoryStream(bodyBytes);
            }
        }

        return (folder, fileName, fileContentType, fileStream);
    }

    private static List<byte[]> SplitBytes(byte[] source, byte[] delimiter)
    {
        var result = new List<byte[]>();
        int start = 0;
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
        for (int i = 0; i <= haystack.Length - needle.Length; i++)
        {
            bool found = true;
            for (int j = 0; j < needle.Length; j++)
            {
                if (haystack[i + j] != needle[j]) { found = false; break; }
            }
            if (found) return i;
        }
        return -1;
    }

    // ── HTTP helpers ───────────────────────────────────────────────────────────

    private static async Task<HttpResponseData> Json(HttpRequestData req, HttpStatusCode code, object data)
    {
        var res = req.CreateResponse(code);
        await res.WriteAsJsonAsync(data);
        return res;
    }

    private static async Task<HttpResponseData> Error(HttpRequestData req, HttpStatusCode code, string msg)
    {
        var res = req.CreateResponse(code);
        await res.WriteAsJsonAsync(new { error = msg });
        return res;
    }
}

// ── Request DTO ────────────────────────────────────────────────────────────────
public record PresignedUrlRequest(
    string? Folder,
    string? FileName,
    string? ContentType,
    int ExpiryMinutes = 15);
