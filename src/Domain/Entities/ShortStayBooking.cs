namespace StayHere.Domain.Entities;

/// <summary>
/// A nightly short-stay reservation against a ListingType.ShortStay listing - a deliberately
/// lighter-weight sibling of TenantApplication (which is a 7-stage long-term lease state machine
/// with no date-range concept at all). A guest picks check-in/check-out dates, gives minimal
/// contact info, and pays a flat booking fee (half of one night's listing price, computed
/// server-side at creation time - see ShortStayBookingFunctions.Create) to secure the dates.
/// ID verification (front/back/selfie, via the shared ApplicationDocument table) happens AFTER
/// payment, not before - DocumentsSubmittedAt is purely informational and never gates Status.
///
/// State machine:
///   PendingPayment  - booking fee not yet confirmed; blocks the date range only for a short
///                      expiry window (see ShortStayBookingFunctions' availability query) so an
///                      abandoned booking doesn't permanently squat on dates
///   → Confirmed     - booking fee payment confirmed (STK callback or C2B confirm)
///   → Completed     - CheckOutDate has passed (derived at read time, not a stored transition)
///   → Cancelled     - guest or owner cancelled; CancellationReason explains why
/// </summary>
public class ShortStayBooking
{
    public Guid Id { get; set; }
    public Guid ListingId { get; set; }
    public Guid CustomerId { get; set; }

    public DateOnly CheckInDate { get; set; }
    public DateOnly CheckOutDate { get; set; }

    public string GuestName { get; set; } = string.Empty;
    public string GuestPhone { get; set; } = string.Empty;
    public string GuestEmail { get; set; } = string.Empty;
    public int NumberOfGuests { get; set; } = 1;
    public string? SpecialRequests { get; set; }

    /// <summary>Half of the listing's per-night Price at the time of booking - computed once,
    /// server-side, and never recalculated even if the listing's price later changes.</summary>
    public decimal BookingFeeAmount { get; set; }
    public string Currency { get; set; } = "KES";

    public string Status { get; set; } = "PendingPayment";
    public string? CancellationReason { get; set; }

    /// <summary>Set once all three of IdFront/IdBack/Selfie have been uploaded. Informational
    /// only - never blocks Status, which the payment callback alone controls.</summary>
    public DateTime? DocumentsSubmittedAt { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? ConfirmedAt { get; set; }

    // Navigation
    public Listing? Listing { get; set; }
    public List<ApplicationDocument> Documents { get; set; } = new();
    public List<RentalPayment> Payments { get; set; } = new();
}
