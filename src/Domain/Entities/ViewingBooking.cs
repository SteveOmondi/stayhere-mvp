namespace StayHere.Domain.Entities;

/// <summary>A customer request to physically or virtually view a listing.</summary>
public class ViewingBooking
{
    public Guid Id { get; set; }
    public Guid ListingId { get; set; }
    public Guid CustomerId { get; set; }

    /// <summary>Preferred date for the viewing (UTC).</summary>
    public DateTime PreferredDate { get; set; }

    /// <summary>Preferred time slot, e.g. "09:00", "14:00".</summary>
    public string PreferredTime { get; set; } = string.Empty;

    /// <summary>Physical | Virtual</summary>
    public string ViewingType { get; set; } = "Physical";

    /// <summary>Pending | Confirmed | Cancelled | Completed | NoShow</summary>
    public string Status { get; set; } = "Pending";

    public string? Notes { get; set; }

    /// <summary>Message from the owner/agent when confirming or declining.</summary>
    public string? OwnerNotes { get; set; }

    /// <summary>Virtual meeting URL (Zoom / Google Meet) for virtual viewings.</summary>
    public string? MeetingLink { get; set; }

    /// <summary>Phone number the customer wants the agent to call.</summary>
    public string? ContactPhone { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public Listing? Listing { get; set; }
    public Customer? Customer { get; set; }
}
