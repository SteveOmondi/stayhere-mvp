namespace StayHere.Domain.Entities;

/// <summary>An in-app enquiry thread a customer opened about a listing with its owner. All
/// messaging happens here - neither side's phone/email is ever surfaced through this entity or
/// its endpoints, by design (see EnquiryFunctions).</summary>
public class Enquiry
{
    public Guid Id { get; set; }
    public Guid ListingId { get; set; }
    public Guid CustomerId { get; set; }

    /// <summary>Denormalized from Listing.OwnerId at creation time so owner-side queries never
    /// need a join through Listings just to find "my" enquiries.</summary>
    public Guid OwnerId { get; set; }

    /// <summary>Open | Closed</summary>
    public string Status { get; set; } = "Open";

    public DateTime CreatedAt { get; set; }
    public DateTime LastMessageAt { get; set; }
    public string? LastMessagePreview { get; set; }

    /// <summary>Basis for each side's unread badge - no separate read-receipt table needed.</summary>
    public DateTime? CustomerLastReadAt { get; set; }
    public DateTime? OwnerLastReadAt { get; set; }

    // Navigation
    public Listing? Listing { get; set; }
}
