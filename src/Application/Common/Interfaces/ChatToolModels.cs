namespace StayHere.Application.Common.Interfaces;

/// <summary>One turn in a tool-calling chat exchange, in the OpenAI-compatible shape Groq's API expects.</summary>
public sealed class ChatMessage
{
    /// <summary>"system" | "user" | "assistant" | "tool".</summary>
    public required string Role { get; init; }

    /// <summary>Null on an assistant message that only carries <see cref="ToolCalls"/>.</summary>
    public string? Content { get; init; }

    /// <summary>Set on an assistant message that is requesting one or more tool invocations.</summary>
    public IReadOnlyList<ChatToolCall>? ToolCalls { get; init; }

    /// <summary>Set on a "tool" role message: which call this result answers.</summary>
    public string? ToolCallId { get; init; }

    /// <summary>Set on a "tool" role message: which tool produced this result.</summary>
    public string? Name { get; init; }
}

/// <summary>A single tool invocation requested by the model.</summary>
public sealed record ChatToolCall(string Id, string Name, string ArgumentsJson);

/// <summary>A tool the model may choose to call, described as JSON schema for its parameters.</summary>
public sealed record ChatToolDefinition(string Name, string Description, string ParametersJsonSchema);

/// <summary>Result of one model turn: either final text, or a set of tool calls to execute before continuing.</summary>
public sealed record ChatCompletionResult(string? Content, IReadOnlyList<ChatToolCall>? ToolCalls)
{
    public bool RequiresToolExecution => ToolCalls is { Count: > 0 };
}
