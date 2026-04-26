namespace StayHere.Domain.Entities;

/// <summary>
/// In-memory AI chat thread (not persisted to Postgres in MVP).
/// </summary>
public class AiConversation
{
    public string Id { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<AiConversationMessage> Messages { get; set; } = new();
}

public class AiConversationMessage
{
    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}
