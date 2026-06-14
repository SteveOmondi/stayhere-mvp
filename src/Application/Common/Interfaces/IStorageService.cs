namespace StayHere.Application.Common.Interfaces;

/// <summary>
/// File-type-agnostic storage abstraction backed by Cloudflare R2.
///
/// Folder conventions (callers supply the folder; the service owns nothing else):
///   "properties/images"       — listing & property photos
///   "properties/videos"       — listing walkthrough videos
///   "properties/floor-plans"  — PDF floor plans
///   "applications/documents"  — KYC / identity documents
///   "profiles/avatars"        — user profile photos
///   "profiles/documents"      — user-submitted forms / contracts
///
/// Resulting file key format: {folder}/{8-char-uid}-{sanitised-filename}.{ext}
///   e.g. properties/images/a1b2c3d4-main-photo.jpg
///
/// Two upload patterns are supported:
///   1. Client-direct — call GetPresignedUploadUrlAsync, return the URL to the
///      frontend, the client PUTs the file directly to R2 (zero server bandwidth).
///   2. Server-proxied — call UploadAsync when the API itself receives the bytes
///      (e.g. form-data posted to a function).
/// </summary>
public interface IStorageService
{
    /// <summary>
    /// Generates a short-lived presigned PUT URL the client uses to upload
    /// directly to R2, bypassing the API server.
    /// </summary>
    /// <param name="folder">Logical storage folder, e.g. "properties/images".</param>
    /// <param name="fileName">Original filename including extension.</param>
    /// <param name="contentType">MIME type, e.g. "image/jpeg", "application/pdf", "video/mp4".</param>
    /// <param name="expiry">Presigned URL lifetime. Defaults to 15 minutes.</param>
    Task<StorageUploadResult> GetPresignedUploadUrlAsync(
        string folder,
        string fileName,
        string contentType,
        TimeSpan? expiry = null);

    /// <summary>
    /// Uploads bytes server-side when the API itself receives the file stream.
    /// </summary>
    Task<StorageResult> UploadAsync(
        Stream content,
        string folder,
        string fileName,
        string contentType);

    /// <summary>Deletes the object at the given storage key.</summary>
    Task DeleteAsync(string fileKey);

    /// <summary>Returns the public delivery URL for an already-stored file key.</summary>
    string GetPublicUrl(string fileKey);
}

// ── Result types ───────────────────────────────────────────────────────────────

/// <summary>Result of a presigned-URL request (client-direct upload).</summary>
public sealed record StorageUploadResult(
    /// <summary>The presigned PUT URL the client sends the file to.</summary>
    string UploadUrl,
    /// <summary>The R2 object key, e.g. "properties/images/a1b2c3d4-photo.jpg".</summary>
    string FileKey,
    /// <summary>The final public URL the file will be served from after upload.</summary>
    string PublicUrl,
    /// <summary>When the presigned URL expires.</summary>
    DateTimeOffset ExpiresAt);

/// <summary>Result of a server-side upload.</summary>
public sealed record StorageResult(
    /// <summary>The R2 object key.</summary>
    string FileKey,
    /// <summary>The public delivery URL.</summary>
    string PublicUrl);
