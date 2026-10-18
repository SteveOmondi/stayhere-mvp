namespace StayHere.Domain.Entities;

public class EnquiryMessage
{
    public Guid Id { get; set; }
    public Guid EnquiryId { get; set; }

    /// <summary>Customer | Owner</summary>
    public string SenderRole { get; set; } = string.Empty;

    /// <summary>Who actually sent it, for audit only - never surfaced to the other party as
    /// "contact info", just used server-side for integrity checks.</summary>
    public Guid SenderUserId { get; set; }

    public string Body { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
