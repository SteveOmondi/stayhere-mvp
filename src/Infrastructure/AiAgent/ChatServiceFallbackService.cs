using Microsoft.Extensions.Logging;
using StayHere.Application.Common.Interfaces;

namespace StayHere.Infrastructure.AiAgent;

/// <summary>
/// The actual <see cref="IChatService"/> registered in DI. Tries Groq first (fast, cheap, already
/// paced by <see cref="GroqRateLimiter"/>) and only falls through to Claude if Groq fails outright -
/// confirmed live as the real failure mode: Groq's free-tier rate limit got exhausted mid-chat-turn,
/// which used to surface as a raw 500 the client couldn't distinguish from a genuine outage (see
/// GroqChatService). Mirrors the exact fallback shape FloorPlanAnalysisFallbackService already uses
/// for a different vendor-outage scenario - try the next provider on ANY exception, not just
/// rate-limit-shaped ones, since a real Groq outage should fail over just as readily as a quota.
///
/// Only if BOTH providers fail does this ever return a user-facing apology instead of throwing - a
/// genuine "every available AI provider is down" is rare enough, and a chat reply is conversational
/// UI, not an API contract, so a 200 with an honest "try again" beats a 500 that a chat page's
/// generic catch-all can't tell apart from any other kind of bug.
/// </summary>
public class ChatServiceFallbackService : IChatService
{
    private readonly GroqChatService _primary;
    private readonly ClaudeChatService _fallback;
    private readonly ILogger<ChatServiceFallbackService> _logger;

    public ChatServiceFallbackService(GroqChatService primary, ClaudeChatService fallback, ILogger<ChatServiceFallbackService> logger)
    {
        _primary = primary;
        _fallback = fallback;
        _logger = logger;
    }

    public async Task<string> GenerateResponseAsync(
        string prompt,
        int maxTokens = 1000,
        double temperature = 0.7,
        CancellationToken cancellationToken = default,
        string? systemPrompt = null)
    {
        try
        {
            return await _primary.GenerateResponseAsync(prompt, maxTokens, temperature, cancellationToken, systemPrompt);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Groq chat failed - falling back to Claude");
            try
            {
                return await _fallback.GenerateResponseAsync(prompt, maxTokens, temperature, cancellationToken, systemPrompt);
            }
            catch (Exception ex2)
            {
                _logger.LogError(ex2, "Claude fallback also failed - degrading gracefully");
                return "Sage is having trouble responding right now - please try again shortly.";
            }
        }
    }

    public async Task<ChatCompletionResult> GenerateWithToolsAsync(
        IReadOnlyList<ChatMessage> messages,
        IReadOnlyList<ChatToolDefinition> tools,
        int maxTokens = 1000,
        double temperature = 0.7,
        CancellationToken cancellationToken = default,
        string? forcedToolName = null)
    {
        try
        {
            return await _primary.GenerateWithToolsAsync(messages, tools, maxTokens, temperature, cancellationToken, forcedToolName);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Groq tool-call chat failed - falling back to Claude");
            try
            {
                // forcedToolName is intentionally dropped here - Claude's tool_choice:{type:"tool"}
                // is supported, but a forced tool is a best-effort grounding nudge (see
                // AiAgentService's own comment on why Groq's own forced tool_choice was abandoned as
                // unsafe), not a correctness requirement, so there's no need to risk a second
                // provider rejecting the whole request over it.
                return await _fallback.GenerateWithToolsAsync(messages, tools, maxTokens, temperature, cancellationToken);
            }
            catch (Exception ex2)
            {
                _logger.LogError(ex2, "Claude tool-call fallback also failed - degrading gracefully");
                return new ChatCompletionResult(
                    "Sage is having trouble responding right now - please try again shortly.", null);
            }
        }
    }
}
