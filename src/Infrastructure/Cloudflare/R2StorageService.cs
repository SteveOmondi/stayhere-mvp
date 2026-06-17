using System.Text.RegularExpressions;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StayHere.Application.Common.Interfaces;

namespace StayHere.Infrastructure.Cloudflare;

/// <summary>
/// Cloudflare R2 implementation of <see cref="IStorageService"/>.
///
/// R2 exposes an S3-compatible API, so this service uses the AWS SDK for .NET.
/// The client is created once (thread-safe) and reused across all requests.
///
/// Upload patterns:
///   • Client-direct  — GetPresignedUploadUrlAsync → frontend PUTs directly to R2
///   • Server-proxied — UploadAsync → API receives bytes and forwards them to R2
///
/// File key structure:
///   {folder}/{8-hex-uid}-{sanitised-name}.{ext}
///   e.g.  properties/images/a1b2c3d4-kitchen-view.jpg
///         applications/documents/f9e8d7c6-national-id.pdf
/// </summary>
public sealed class R2StorageService : IStorageService
{
    private readonly IAmazonS3 _s3;
    private readonly R2Options _opts;
    private readonly ILogger<R2StorageService> _log;

    // Matches any character that is NOT alphanumeric, hyphen, or underscore
    private static readonly Regex UnsafeChars = new(@"[^a-zA-Z0-9\-_]", RegexOptions.Compiled);

    public R2StorageService(IAmazonS3 s3, IOptions<R2Options> opts, ILogger<R2StorageService> log)
    {
        _s3 = s3;
        _opts = opts.Value;
        _log = log;
    }

    // ── Client-direct upload (presigned PUT) ───────────────────────────────────

    public async Task<StorageUploadResult> GetPresignedUploadUrlAsync(
        string folder,
        string fileName,
        string contentType,
        TimeSpan? expiry = null)
    {
        if (!_opts.IsConfigured)
            throw new InvalidOperationException(
                "Cloudflare R2 is not configured. Add the following to your Function App Application Settings: " +
                "R2__AccountId, R2__AccessKeyId, R2__SecretAccessKey, R2__BucketName, R2__PublicBaseUrl.");

        var fileKey = BuildFileKey(folder, fileName);
        var lifetime = expiry ?? _opts.DefaultPresignedExpiry;
        var expiresAt = DateTimeOffset.UtcNow.Add(lifetime);

        var request = new GetPreSignedUrlRequest
        {
            BucketName = _opts.BucketName,
            Key = fileKey,
            Verb = HttpVerb.PUT,
            Expires = expiresAt.UtcDateTime,
            ContentType = contentType,
            Protocol = Protocol.HTTPS
        };

        var presignedUrl = await _s3.GetPreSignedURLAsync(request);

        _log.LogInformation(
            "Presigned PUT URL generated — key: {Key}, expires: {Expiry}",
            fileKey, expiresAt);

        return new StorageUploadResult(
            UploadUrl: presignedUrl,
            FileKey: fileKey,
            PublicUrl: GetPublicUrl(fileKey),
            ExpiresAt: expiresAt);
    }

    // ── Server-proxied upload ──────────────────────────────────────────────────

    public async Task<StorageResult> UploadAsync(
        Stream content,
        string folder,
        string fileName,
        string contentType)
    {
        if (!_opts.IsConfigured)
            throw new InvalidOperationException(
                "Cloudflare R2 is not configured. Add R2__AccountId, R2__AccessKeyId, R2__SecretAccessKey, R2__BucketName to App Settings.");

        var fileKey = BuildFileKey(folder, fileName);

        var request = new PutObjectRequest
        {
            BucketName = _opts.BucketName,
            Key = fileKey,
            InputStream = content,
            ContentType = contentType,
            AutoCloseStream = false,
            // Disable chunked encoding — R2 does not support aws-chunked transfer encoding
            UseChunkEncoding = false
        };

        await _s3.PutObjectAsync(request);

        _log.LogInformation("Server-side upload complete — key: {Key}", fileKey);

        return new StorageResult(FileKey: fileKey, PublicUrl: GetPublicUrl(fileKey));
    }

    // ── Delete ─────────────────────────────────────────────────────────────────

    public async Task DeleteAsync(string fileKey)
    {
        await _s3.DeleteObjectAsync(_opts.BucketName, fileKey);
        _log.LogInformation("Deleted R2 object — key: {Key}", fileKey);
    }

    // ── Public URL ─────────────────────────────────────────────────────────────

    public string GetPublicUrl(string fileKey) =>
        $"{_opts.PublicBaseUrl.TrimEnd('/')}/{fileKey}";

    // ── Helpers ────────────────────────────────────────────────────────────────

    /// <summary>
    /// Builds a collision-resistant, URL-safe R2 object key.
    ///
    /// Pattern: {folder}/{8-hex-uid}-{sanitised-base}.{ext}
    ///
    /// Sanitisation rules:
    ///   • Extension is lowercased and kept as-is
    ///   • Base name: spaces → hyphens, non-alphanumeric stripped, max 60 chars
    ///   • Folder is lowercased and trimmed of leading/trailing slashes
    /// </summary>
    private static string BuildFileKey(string folder, string fileName)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();             // e.g. ".jpg"
        var baseName = Path.GetFileNameWithoutExtension(fileName)
                           .Replace(' ', '-');
        var safeBase = UnsafeChars.Replace(baseName, string.Empty)
                                  .Trim('-')
                                  .ToLowerInvariant();
        if (safeBase.Length > 60) safeBase = safeBase[..60];
        if (safeBase.Length == 0) safeBase = "file";

        var uid = Guid.NewGuid().ToString("N")[..8];                          // e.g. "a1b2c3d4"
        var safeFolder = folder.Trim('/').ToLowerInvariant();                 // e.g. "properties/images"

        return $"{safeFolder}/{uid}-{safeBase}{ext}";
    }

}
