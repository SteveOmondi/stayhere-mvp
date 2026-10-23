using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StayHere.Application.Common.Interfaces;

namespace StayHere.Infrastructure.AiAgent;

/// <summary>
/// Claude (Anthropic) implementation of <see cref="IChatService"/> - Sage's fallback chat provider,
/// used only when Groq is unavailable (see <see cref="ChatServiceFallbackService"/>, the actual
/// registered IChatService). Reuses the exact same Anthropic:ApiKey / endpoint / header conventions
/// as <see cref="ClaudeFloorPlanService"/>, just translating the OpenAI-style tool-calling shape
/// (<see cref="ChatMessage"/>/<see cref="ChatToolDefinition"/>) this app speaks internally into
/// Claude's Messages API shape (a single top-level "system" string, content-block messages,
/// tool_use/tool_result blocks) and back.
/// </summary>
public class ClaudeChatService : IChatService
{
    private const string AnthropicVersion = "2023-06-01";

    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ClaudeChatService> _logger;

    public ClaudeChatService(HttpClient httpClient, IConfiguration configuration, ILogger<ClaudeChatService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<string> GenerateResponseAsync(
        string prompt,
        int maxTokens = 1000,
        double temperature = 0.7,
        CancellationToken cancellationToken = default,
        string? systemPrompt = null)
    {
        var systemContent = string.IsNullOrWhiteSpace(systemPrompt) ? GroqChatService.GetSharedSystemPrompt() : systemPrompt.Trim();
        var messages = new JsonArray
        {
            new JsonObject
            {
                ["role"] = "user",
                ["content"] = new JsonArray { new JsonObject { ["type"] = "text", ["text"] = prompt } }
            }
        };

        var result = await CallAsync(systemContent, messages, tools: null, forcedToolName: null, maxTokens, temperature, cancellationToken);
        return result.Content ?? "I apologize, but I couldn't generate a response at this time.";
    }

    public async Task<ChatCompletionResult> GenerateWithToolsAsync(
        IReadOnlyList<ChatMessage> messages,
        IReadOnlyList<ChatToolDefinition> tools,
        int maxTokens = 1000,
        double temperature = 0.7,
        CancellationToken cancellationToken = default,
        string? forcedToolName = null)
    {
        var claudeMessages = BuildClaudeMessages(messages, out var systemPrompt);
        return await CallAsync(systemPrompt, claudeMessages, tools, forcedToolName, maxTokens, temperature, cancellationToken);
    }

    // ── Message/tool translation (OpenAI-style <-> Claude's Messages API) ──────

    /// <summary>
    /// Claude has exactly one top-level "system" string, not a system-role turn in the conversation.
    /// This app's own message lists always start with one system message (the agent's main prompt -
    /// see AiAgentService.ChatAsync) but can also inject later system-role "reminder" messages
    /// mid-conversation - those have no Claude equivalent, so they're folded in as a plain user-role
    /// note instead of dropped.
    /// </summary>
    private static JsonArray BuildClaudeMessages(IReadOnlyList<ChatMessage> messages, out string systemPrompt)
    {
        var result = new JsonArray();
        string? resolvedSystemPrompt = null;
        JsonArray? pendingToolResults = null;

        void FlushToolResults()
        {
            if (pendingToolResults is { Count: > 0 })
                result.Add(new JsonObject { ["role"] = "user", ["content"] = pendingToolResults });
            pendingToolResults = null;
        }

        foreach (var msg in messages)
        {
            if (msg.Role == "system")
            {
                if (resolvedSystemPrompt == null)
                {
                    resolvedSystemPrompt = msg.Content ?? "";
                }
                else
                {
                    FlushToolResults();
                    result.Add(new JsonObject
                    {
                        ["role"] = "user",
                        ["content"] = new JsonArray { new JsonObject { ["type"] = "text", ["text"] = $"[System note] {msg.Content}" } }
                    });
                }
                continue;
            }

            if (msg.Role == "tool")
            {
                pendingToolResults ??= new JsonArray();
                pendingToolResults.Add(new JsonObject
                {
                    ["type"] = "tool_result",
                    ["tool_use_id"] = msg.ToolCallId,
                    ["content"] = msg.Content ?? ""
                });
                continue;
            }

            FlushToolResults();

            if (msg.Role == "assistant")
            {
                var content = new JsonArray();
                if (!string.IsNullOrWhiteSpace(msg.Content))
                    content.Add(new JsonObject { ["type"] = "text", ["text"] = msg.Content });

                if (msg.ToolCalls is { Count: > 0 })
                {
                    foreach (var call in msg.ToolCalls)
                    {
                        JsonNode? input;
                        try { input = JsonNode.Parse(call.ArgumentsJson); }
                        catch { input = new JsonObject(); }
                        content.Add(new JsonObject
                        {
                            ["type"] = "tool_use",
                            ["id"] = call.Id,
                            ["name"] = call.Name,
                            ["input"] = input
                        });
                    }
                }
                result.Add(new JsonObject { ["role"] = "assistant", ["content"] = content });
            }
            else // "user"
            {
                result.Add(new JsonObject
                {
                    ["role"] = "user",
                    ["content"] = new JsonArray { new JsonObject { ["type"] = "text", ["text"] = msg.Content ?? "" } }
                });
            }
        }

        FlushToolResults();
        systemPrompt = resolvedSystemPrompt ?? GroqChatService.GetSharedSystemPrompt();
        return result;
    }

    // ── Shared Claude (Anthropic Messages API) call plumbing ────────────────

    private async Task<ChatCompletionResult> CallAsync(
        string systemPrompt,
        JsonArray messages,
        IReadOnlyList<ChatToolDefinition>? tools,
        string? forcedToolName,
        int maxTokens,
        double temperature, // unused for Claude - see body construction below
        CancellationToken cancellationToken)
    {
        var apiKey = _configuration["Anthropic:ApiKey"]?.Trim()
                     ?? Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY")?.Trim();
        if (string.IsNullOrEmpty(apiKey))
        {
            _logger.LogError("Anthropic API key is not configured (Anthropic:ApiKey)");
            throw new InvalidOperationException("Anthropic API key is not configured. Set Anthropic:ApiKey in local.settings.json or environment.");
        }

        // Same model family/naming convention as ClaudeFloorPlanService, kept as a separate config
        // key since a cheaper/faster model may suit plain chat better than vision analysis.
        var model = _configuration["Anthropic:ChatModel"] ?? "claude-sonnet-5-5";

        // "temperature" is REJECTED outright (400 "deprecated for this model") by the 5.x Claude
        // model generation this service targets - confirmed live - so it's never sent, unlike
        // Groq/OpenAI-style APIs where the caller's temperature is normally forwarded as-is.
        var body = new JsonObject
        {
            ["model"] = model,
            ["max_tokens"] = maxTokens,
            ["system"] = systemPrompt,
            ["messages"] = messages
        };

        if (tools is { Count: > 0 })
        {
            body["tools"] = new JsonArray(tools.Select(t => (JsonNode)new JsonObject
            {
                ["name"] = t.Name,
                ["description"] = t.Description,
                ["input_schema"] = JsonNode.Parse(t.ParametersJsonSchema)
            }).ToArray());

            body["tool_choice"] = string.IsNullOrEmpty(forcedToolName)
                ? new JsonObject { ["type"] = "auto" }
                : new JsonObject { ["type"] = "tool", ["name"] = forcedToolName };
        }

        const string url = "https://api.anthropic.com/v1/messages";
        var maxAttempts = int.TryParse(_configuration["Anthropic:ChatMaxRetries"], out var m) ? Math.Clamp(m, 1, 8) : 3;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, url) { Content = JsonContent.Create(body) };
            req.Headers.TryAddWithoutValidation("x-api-key", apiKey);
            req.Headers.TryAddWithoutValidation("anthropic-version", AnthropicVersion);

            HttpResponseMessage response;
            try
            {
                response = await _httpClient.SendAsync(req, cancellationToken);
            }
            catch (HttpRequestException) when (attempt < maxAttempts)
            {
                await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt)), cancellationToken);
                continue;
            }

            // 429 = rate limited, 529 = Anthropic's "overloaded_error", 503 = generic transient.
            if (response.StatusCode == HttpStatusCode.TooManyRequests || (int)response.StatusCode == 529 || response.StatusCode == HttpStatusCode.ServiceUnavailable)
            {
                var delay = ParseRetryAfter(response) ?? TimeSpan.FromSeconds(Math.Pow(2, attempt));
                _logger.LogWarning("Claude chat call returned {Status}. Attempt {Attempt}/{Max}. Waiting {Delay}s", (int)response.StatusCode, attempt, maxAttempts, delay.TotalSeconds);
                if (attempt == maxAttempts) response.EnsureSuccessStatusCode();
                await Task.Delay(delay, cancellationToken);
                continue;
            }

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Claude returned {Status} for chat model {Model}. Response: {Body}", (int)response.StatusCode, model, errorBody);
                response.EnsureSuccessStatusCode();
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var root = JsonNode.Parse(json)?.AsObject();
            var contentBlocks = root?["content"]?.AsArray();

            if (contentBlocks == null)
                return new ChatCompletionResult("I apologize, but I couldn't generate a response at this time.", null);

            var toolUseBlocks = contentBlocks
                .Select(b => b?.AsObject())
                .Where(b => b?["type"]?.GetValue<string>() == "tool_use")
                .ToList();

            if (toolUseBlocks.Count > 0)
            {
                var calls = toolUseBlocks
                    .Select(b => new ChatToolCall(
                        b!["id"]?.GetValue<string>() ?? Guid.NewGuid().ToString(),
                        b["name"]?.GetValue<string>() ?? string.Empty,
                        b["input"]?.ToJsonString() ?? "{}"))
                    .Where(c => c.Name.Length > 0)
                    .ToList();

                if (calls.Count > 0)
                    return new ChatCompletionResult(null, calls);
            }

            var text = string.Join("\n", contentBlocks
                .Select(b => b?.AsObject())
                .Where(b => b?["type"]?.GetValue<string>() == "text")
                .Select(b => b!["text"]?.GetValue<string>() ?? ""))
                .Trim();

            return new ChatCompletionResult(text, null);
        }

        throw new HttpRequestException("Claude chat failed after retries.");
    }

    private static TimeSpan? ParseRetryAfter(HttpResponseMessage response)
    {
        if (response.Headers.RetryAfter?.Delta is { } d) return d;
        if (response.Headers.TryGetValues("Retry-After", out var values) && int.TryParse(values.FirstOrDefault(), out var seconds))
            return TimeSpan.FromSeconds(seconds);
        return null;
    }
}
