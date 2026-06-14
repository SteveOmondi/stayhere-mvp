namespace StayHere.Domain.Entities;

/// <summary>
/// A formal application by a customer to rent/buy/lease a listing.
/// State machine: DocumentsPending → UnderReview → Approved | Rejected
///                → TermsAccepted → PaymentPending → Active | Cancelled
/// </summary>
public class TenantApplication
{
    public Guid Id { get; set; }
    public Guid ListingId { get; set; }
    public Guid CustomerId { get; set; }
    public Guid? ViewingBookingId { get; set; }

    public string Status { get; set; } = "DocumentsPending";
    public string? RejectionReason { get; set; }
    public DateTime? ReviewedAt { get; set; }

    /// <summary>Email/name of the reviewer (owner or property manager).</summary>
    public string? ReviewedBy { get; set; }

    public DateTime? TermsAcceptedAt { get; set; }
    public string? DigitalSignatureUrl { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public Listing? Listing { get; set; }
    public Customer? Customer { get; set; }
    public ViewingBooking? ViewingBooking { get; set; }
    public List<ApplicationDocument> Documents { get; set; } = new();
    public List<RentalPayment> Payments { get; set; } = new();
}
