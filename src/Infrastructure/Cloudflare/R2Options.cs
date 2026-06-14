using System.ComponentModel.DataAnnotations;

namespace StayHere.Infrastructure.Cloudflare;

/// <summary>
/// Bound from the "R2" configuration section.
///
/// Azure Function App Settings (double-underscore as section separator):
///   R2__AccountId         — Cloudflare account ID (32-char hex, visible on the dashboard)
///   R2__AccessKeyId       — R2 API token "Access Key ID"   (not the Cloudflare API token)
///   R2__SecretAccessKey   — R2 API token "Secret Access Key"
///   R2__BucketName        — Name of the R2 bucket, e.g. "stayhere-assets"
///   R2__PublicBaseUrl     — Public delivery base URL (see notes below)
///
/// How to get R2 credentials:
///   1. dash.cloudflare.com → R2 → your bucket → "Manage R2 API tokens"
///   2. Create a token with "Object Read and Write" on your bucket
///   3. Copy the generated Access Key ID and Secret Access Key (shown once)
///
/// PublicBaseUrl options (pick one):
///   a) Enable "Public Access" on the R2 bucket → copy the r2.dev URL
///      e.g. "https://pub-abc123def456.r2.dev"
///   b) Connect a custom domain in the R2 bucket settings
///      e.g. "https://assets.stayhere.co.ke"
///   c) Point a Cloudflare Worker / Pages route to the bucket (full control)
/// </summary>
public sealed class R2Options
{
    public const string Section = "R2";

    [Required]
    public string AccountId { get; set; } = string.Empty;

    [Required]
    public string AccessKeyId { get; set; } = string.Empty;

    [Required]
    public string SecretAccessKey { get; set; } = string.Empty;

    [Required]
    public string BucketName { get; set; } = string.Empty;

    /// <summary>
    /// Base URL used to compute public file URLs, without a trailing slash.
    /// Example: "https://pub-abc123.r2.dev" or "https://assets.stayhere.co.ke"
    /// </summary>
    [Required]
    public string PublicBaseUrl { get; set; } = string.Empty;

    /// <summary>Default presigned URL lifetime. Can be overridden per call.</summary>
    public TimeSpan DefaultPresignedExpiry { get; set; } = TimeSpan.FromMinutes(15);

    /// <summary>S3-compatible service URL for R2.</summary>
    public string ServiceUrl => $"https://{AccountId}.r2.cloudflarestorage.com";

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(AccountId) &&
        !string.IsNullOrWhiteSpace(AccessKeyId) &&
        !string.IsNullOrWhiteSpace(SecretAccessKey) &&
        !string.IsNullOrWhiteSpace(BucketName);
}
