namespace StayHere.Domain.Entities;

/// <summary>A listing a customer has bookmarked/favorited for later.</summary>
public class SavedListing
{
    public Guid Id { get; set; }
    public Guid ListingId { get; set; }
    public Guid CustomerId { get; set; }
    public DateTime CreatedAt { get; set; }

    // Navigation
    public Listing? Listing { get; set; }
}
