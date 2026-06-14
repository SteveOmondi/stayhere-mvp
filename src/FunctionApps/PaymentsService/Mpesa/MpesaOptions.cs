using System.ComponentModel.DataAnnotations;

namespace StayHere.PaymentsService.Mpesa;

/// <summary>
/// Bound from the "Mpesa" configuration section (Azure Function App Settings
/// or local.settings.json Values with double-underscore namespace separator,
/// e.g. Mpesa__ConsumerKey).
/// </summary>
public sealed class MpesaOptions
{
    public const string Section = "Mpesa";

    [Required]
    public string ConsumerKey { get; set; } = string.Empty;

    [Required]
    public string ConsumerSecret { get; set; } = string.Empty;

    /// <summary>Paybill or till number (e.g. 174379 for sandbox).</summary>
    [Required]
    public string ShortCode { get; set; } = "174379";

    /// <summary>LipaNaMpesa online passkey issued by Safaricom.</summary>
    [Required]
    public string PassKey { get; set; } = string.Empty;

    /// <summary>Public HTTPS URL Safaricom will POST the STK result to.</summary>
    [Required]
    public string StkCallbackUrl { get; set; } = string.Empty;

    /// <summary>
    /// Public HTTPS URL Safaricom calls to validate a C2B payment before processing.
    /// Must respond within 5 seconds with ResultCode "0" (accept) or an error code.
    /// </summary>
    public string C2bValidationUrl { get; set; } = string.Empty;

    /// <summary>
    /// Public HTTPS URL Safaricom calls after a C2B payment is completed.
    /// Must respond within 5 seconds with ResultCode "0".
    /// </summary>
    [Required]
    public string C2bConfirmationUrl { get; set; } = string.Empty;

    /// <summary>"sandbox" or "production".</summary>
    public string Environment { get; set; } = "sandbox";

    public string BaseUrl => Environment.Equals("production", StringComparison.OrdinalIgnoreCase)
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke";

    /// <summary>True when real Safaricom credentials are present (not just defaults).</summary>
    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(ConsumerKey) &&
        !string.IsNullOrWhiteSpace(ConsumerSecret);
}
