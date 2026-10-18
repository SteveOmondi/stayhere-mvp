namespace StayHere.Domain.Entities;

/// <summary>
/// A formal application by a customer to rent/buy/lease a listing. Booking a viewing is a fully
/// separate, optional action (see ViewingBooking) - this can be the customer's very first step,
/// hence ViewingBookingId being nullable.
///
/// State machine:
///   PendingApproval              - owner pre-screens the applicant before any documents are requested
///   → DocumentsPending           - pre-screen passed; tenant uploads ID/selfie/signature
///   → UnderReview                - documents submitted; owner reviews them
///   → Approved | Rejected        - final decision on the documents (Rejected is also the terminal
///                                  state if the owner declines at the PendingApproval stage - see
///                                  RejectionReason/ReviewedAt for which gate rejected it)
///   → TermsAccepted              - (from Approved) tenant accepts the lease terms
///   → PaymentPending             - (from TermsAccepted, set once payment is initiated)
///   → Active | Cancelled         - payment confirmed, tenancy begins | cancelled at any point
/// </summary>
public class TenantApplication
{
    public Guid Id { get; set; }
    public Guid ListingId { get; set; }
    public Guid CustomerId { get; set; }
    public Guid? ViewingBookingId { get; set; }

    public string Status { get; set; } = "PendingApproval";
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
    public List<ApplicationDocument> Documents { get; set; } = new();
    public List<RentalPayment> Payments { get; set; } = new();
}
