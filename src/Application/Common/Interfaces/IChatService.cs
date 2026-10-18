namespace StayHere.Application.Common.Interfaces;

public interface IChatService
{
    Task<string> GenerateResponseAsync(
        string prompt,
        int maxTokens = 1000,
        double temperature = 0.7,
        CancellationToken cancellationToken = default,
        string? systemPrompt = null);

    /// <summary>
    /// One turn of a tool-calling conversation: sends the full message history plus the declared
    /// tools, and returns either the model's final answer or the tool calls it wants executed
    /// before it will answer. Callers own the loop (execute tools, append results, call again).
    /// </summary>
    /// <param name="forcedToolName">
    /// When set, the model MUST call this specific tool (still present in <paramref name="tools"/>)
    /// rather than being free to answer in plain text or pick a different one - used to guarantee a
    /// grounding call actually happens for questions where "auto" tool choice has been observed to
    /// skip it (e.g. Sage's security/proximity questions not always triggering get_nearby_places).
    /// </param>
    Task<ChatCompletionResult> GenerateWithToolsAsync(
        IReadOnlyList<ChatMessage> messages,
        IReadOnlyList<ChatToolDefinition> tools,
        int maxTokens = 1000,
        double temperature = 0.7,
        CancellationToken cancellationToken = default,
        string? forcedToolName = null);
}
