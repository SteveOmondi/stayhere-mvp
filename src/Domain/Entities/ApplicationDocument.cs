namespace StayHere.Domain.Entities;

/// <summary>
/// A document uploaded as part of a TenantApplication.
/// DocumentType: IdFront | IdBack | Selfie | DigitalSignature | SupportingDoc
/// </summary>
public class ApplicationDocument
{
    public Guid Id { get; set; }
    public Guid ApplicationId { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public string? FileName { get; set; }
    public DateTime UploadedAt { get; set; }

    // Navigation
    public TenantApplication? Application { get; set; }
}
