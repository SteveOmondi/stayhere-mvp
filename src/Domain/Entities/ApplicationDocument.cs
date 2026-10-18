namespace StayHere.Domain.Entities;

/// <summary>
/// A document uploaded as part of EITHER a TenantApplication OR a ShortStayBooking - never both.
/// DocumentType: IdFront | IdBack | Selfie | DigitalSignature | SupportingDoc
/// (DigitalSignature only ever applies to the TenantApplication lease-signing step; short-stay
/// bookings only ever submit IdFront/IdBack/Selfie, and only after their booking fee is paid.)
/// </summary>
public class ApplicationDocument
{
    public Guid Id { get; set; }
    public Guid? ApplicationId { get; set; }
    public Guid? ShortStayBookingId { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public string? FileName { get; set; }
    public DateTime UploadedAt { get; set; }

    // Navigation
    public TenantApplication? Application { get; set; }
    public ShortStayBooking? ShortStayBooking { get; set; }
}
