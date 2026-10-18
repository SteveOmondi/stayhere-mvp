namespace StayHere.Domain.Entities;

/// <summary>AI chat thread, persisted to Postgres so history survives restarts and multi-instance scale-out.</summary>
public class AiConversation
{
    public string Id { get; set; } = string.Empty;

    /// <summary>The caller's UserId from their verified JWT at creation time - null for a chat
    /// started while unauthenticated. Lets a signed-in user list and resume their own past
    /// conversations; never set from anything client-supplied.</summary>
    public Guid? UserId { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<AiConversationMessage> Messages { get; set; } = new();
}

public class AiConversationMessage
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ConversationId { get; set; } = string.Empty;

    /// <summary>"system" | "user" | "assistant" | "tool".</summary>
    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;

    /// <summary>Set on an "assistant" message that requested tool calls: serialized JSON array of {id, name, argumentsJson}.</summary>
    public string? ToolCallsJson { get; set; }

    /// <summary>Set on a "tool" message: which tool-call id this result answers.</summary>
    public string? ToolCallId { get; set; }

    /// <summary>Set on a "tool" message: which tool was invoked.</summary>
    public string? ToolName { get; set; }

    public DateTime Timestamp { get; set; }
}
