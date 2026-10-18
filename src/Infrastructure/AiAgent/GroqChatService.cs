using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StayHere.Application.Common.Interfaces;

namespace StayHere.Infrastructure.AiAgent;

public class GroqChatService : IChatService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GroqChatService> _logger;

    public GroqChatService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<GroqChatService> logger)
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
        var apiKey = _configuration["Groq:ApiKey"]?.Trim()
                     ?? Environment.GetEnvironmentVariable("GROQ_API_KEY")?.Trim();
        // llama-3.3-70b-versatile was decommissioned by Groq; gpt-oss-120b is the current
        // tool-calling-capable default (verified against /openai/v1/models for this account).
        var model = _configuration["Groq:Model"] ?? "openai/gpt-oss-120b";

        if (string.IsNullOrEmpty(apiKey))
        {
            _logger.LogError("Groq API key is not configured (Groq:ApiKey)");
            throw new InvalidOperationException("Groq API key is not configured. Set Groq:ApiKey in local.settings.json or environment.");
        }

        const string url = "https://api.groq.com/openai/v1/chat/completions";
        var systemContent = string.IsNullOrWhiteSpace(systemPrompt) ? GetSystemPrompt() : systemPrompt.Trim();
        var request = new
        {
            model,
            messages = new[]
            {
                new { role = "system", content = systemContent },
                new { role = "user", content = prompt }
            },
            max_tokens = maxTokens,
            temperature,
            top_p = 0.9,
            stream = false
        };

        var maxAttempts = int.TryParse(_configuration["Groq:MaxRetries"], out var m) ? Math.Clamp(m, 1, 8) : 4;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url)
                {
                    Content = JsonContent.Create(request)
                };
                httpRequest.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");

                _logger.LogDebug("Sending request to Groq with model {Model} (attempt {Attempt})", model, attempt);
                var response = await _httpClient.SendAsync(httpRequest, cancellationToken);

                if (response.StatusCode == HttpStatusCode.TooManyRequests)
                {
                    var delay = ParseRetryAfter(response) ?? TimeSpan.FromSeconds(Math.Pow(2, attempt));
                    _logger.LogWarning("Groq chat rate limited (429). Attempt {Attempt}/{Max}. Waiting {Delay}s", attempt, maxAttempts, delay.TotalSeconds);
                    if (attempt == maxAttempts)
                        response.EnsureSuccessStatusCode();
                    await Task.Delay(delay, cancellationToken);
                    continue;
                }

                response.EnsureSuccessStatusCode();

                var responseContent = await response.Content.ReadFromJsonAsync<GroqChatResponse>(cancellationToken: cancellationToken);

                if (responseContent?.Choices is { Length: > 0 })
                {
                    var text = responseContent.Choices[0].Message?.Content?.Trim() ?? string.Empty;
                    _logger.LogDebug("Groq response length {Length}", text.Length);
                    return text;
                }

                _logger.LogWarning("Groq returned empty choices");
                return "I apologize, but I couldn't generate a response at this time.";
            }
            catch (HttpRequestException ex) when (attempt < maxAttempts)
            {
                _logger.LogWarning(ex, "Groq chat attempt {Attempt} failed; retrying", attempt);
                await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt)), cancellationToken);
            }
        }

        throw new HttpRequestException("Groq chat failed after retries.");
    }

    public async Task<ChatCompletionResult> GenerateWithToolsAsync(
        IReadOnlyList<ChatMessage> messages,
        IReadOnlyList<ChatToolDefinition> tools,
        int maxTokens = 1000,
        double temperature = 0.7,
        CancellationToken cancellationToken = default,
        string? forcedToolName = null)
    {
        var apiKey = _configuration["Groq:ApiKey"]?.Trim()
                     ?? Environment.GetEnvironmentVariable("GROQ_API_KEY")?.Trim();
        // llama-3.3-70b-versatile was decommissioned by Groq; gpt-oss-120b is the current
        // tool-calling-capable default (verified against /openai/v1/models for this account).
        var model = _configuration["Groq:Model"] ?? "openai/gpt-oss-120b";

        if (string.IsNullOrEmpty(apiKey))
        {
            _logger.LogError("Groq API key is not configured (Groq:ApiKey)");
            throw new InvalidOperationException("Groq API key is not configured. Set Groq:ApiKey in local.settings.json or environment.");
        }

        const string url = "https://api.groq.com/openai/v1/chat/completions";

        var body = new JsonObject
        {
            ["model"] = model,
            ["messages"] = BuildMessagesArray(messages),
            ["max_tokens"] = maxTokens,
            ["temperature"] = temperature,
            ["stream"] = false
        };

        if (tools.Count > 0)
        {
            body["tools"] = new JsonArray(tools.Select(t => (JsonNode)new JsonObject
            {
                ["type"] = "function",
                ["function"] = new JsonObject
                {
                    ["name"] = t.Name,
                    ["description"] = t.Description,
                    ["parameters"] = JsonNode.Parse(t.ParametersJsonSchema)
                }
            }).ToArray());
            body["tool_choice"] = string.IsNullOrEmpty(forcedToolName)
                ? "auto"
                : new JsonObject { ["type"] = "function", ["function"] = new JsonObject { ["name"] = forcedToolName } };
        }

        var maxAttempts = int.TryParse(_configuration["Groq:MaxRetries"], out var m) ? Math.Clamp(m, 1, 8) : 4;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url)
                {
                    Content = JsonContent.Create(body)
                };
                httpRequest.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");

                var response = await _httpClient.SendAsync(httpRequest, cancellationToken);

                if (response.StatusCode == HttpStatusCode.TooManyRequests)
                {
                    var delay = ParseRetryAfter(response) ?? TimeSpan.FromSeconds(Math.Pow(2, attempt));
                    _logger.LogWarning("Groq tool-call chat rate limited (429). Attempt {Attempt}/{Max}. Waiting {Delay}s", attempt, maxAttempts, delay.TotalSeconds);
                    if (attempt == maxAttempts)
                        response.EnsureSuccessStatusCode();
                    await Task.Delay(delay, cancellationToken);
                    continue;
                }

                if (!response.IsSuccessStatusCode)
                {
                    var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                    _logger.LogError("Groq returned {Status} for tool-call chat. Response: {Body}", (int)response.StatusCode, errorBody);
                    response.EnsureSuccessStatusCode();
                }

                var json = await response.Content.ReadAsStringAsync(cancellationToken);
                var root = JsonNode.Parse(json)?.AsObject();
                var message = root?["choices"]?.AsArray().FirstOrDefault()?["message"]?.AsObject();

                if (message == null)
                {
                    _logger.LogWarning("Groq tool-call chat returned no message");
                    return new ChatCompletionResult("I apologize, but I couldn't generate a response at this time.", null);
                }

                var toolCallsNode = message["tool_calls"] as JsonArray;
                if (toolCallsNode is { Count: > 0 })
                {
                    var calls = toolCallsNode
                        .Select(tc => tc?.AsObject())
                        .Where(tc => tc != null)
                        .Select(tc => new ChatToolCall(
                            tc!["id"]?.GetValue<string>() ?? Guid.NewGuid().ToString(),
                            tc["function"]?["name"]?.GetValue<string>() ?? string.Empty,
                            tc["function"]?["arguments"]?.GetValue<string>() ?? "{}"))
                        .Where(c => c.Name.Length > 0)
                        .ToList();

                    if (calls.Count > 0)
                        return new ChatCompletionResult(null, calls);
                }

                var content = message["content"]?.GetValue<string>()?.Trim() ?? string.Empty;
                return new ChatCompletionResult(content, null);
            }
            catch (HttpRequestException ex) when (attempt < maxAttempts)
            {
                _logger.LogWarning(ex, "Groq tool-call chat attempt {Attempt} failed; retrying", attempt);
                await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt)), cancellationToken);
            }
        }

        throw new HttpRequestException("Groq tool-call chat failed after retries.");
    }

    private static JsonArray BuildMessagesArray(IReadOnlyList<ChatMessage> messages)
    {
        var array = new JsonArray();
        foreach (var msg in messages)
        {
            var node = new JsonObject { ["role"] = msg.Role };

            if (msg.Content != null)
                node["content"] = msg.Content;

            if (msg.ToolCalls is { Count: > 0 })
            {
                node["tool_calls"] = new JsonArray(msg.ToolCalls.Select(tc => (JsonNode)new JsonObject
                {
                    ["id"] = tc.Id,
                    ["type"] = "function",
                    ["function"] = new JsonObject { ["name"] = tc.Name, ["arguments"] = tc.ArgumentsJson }
                }).ToArray());
            }

            if (msg.ToolCallId != null)
                node["tool_call_id"] = msg.ToolCallId;

            if (msg.Role == "tool" && msg.Name != null)
                node["name"] = msg.Name;

            array.Add(node);
        }
        return array;
    }

    private static string GetSystemPrompt() =>
        @"You are StayHere's in-app real estate assistant for the Kenyan market. You only operate inside the StayHere platform and only ever refer users back to StayHere — never to any other site, app, brand, broker, or service.

CONVERSATION RULES:
- Keep responses conversational and concise (2-4 sentences max)
- Only use greetings like ""Hey"" or ""Hi"" for the FIRST message in a conversation
- For follow-up messages, jump straight to the answer
- Remember what you've discussed and build on it naturally
- Stay on topic and reference previous questions when relevant
- Don't repeat information you've already provided

PLATFORM LOYALTY (STRICT):
- NEVER mention, recommend, link to, or compare against competitor platforms, classifieds, portals, agencies, or apps. Forbidden examples (non-exhaustive): BuyRentKenya, Jumia House, Property24, Hauzisha, PigiaMe, OLX, Jiji, Lamudi, Realtor.co.ke, Facebook Marketplace, Instagram pages, WhatsApp brokers, generic ""real estate websites"".
- Do NOT name brokers or brokerages outside StayHere.
- Do NOT suggest the user ""check other sources / other sites / Google / agents off-platform"" for prices or availability.
- If the user wants up-to-date or verified data, point them to StayHere only — e.g. ""browse current StayHere listings"", ""use the StayHere search filters"", ""tap a StayHere listing card for verified details"".
- Caveats about price changes are fine, but never attribute them to or redirect to an external source. Acceptable: ""prices shift week to week — current StayHere listings will reflect today's market.""

RESPONSE STYLE:
- Give specific price ranges and examples when possible, as general market context
- Use a natural, friendly tone without being overly casual
- If unsure, give reasonable estimates and direct them to refine their StayHere search
- Focus directly on what they're asking

You know property markets across Kenya, especially Nairobi areas like Westlands, Karen, Kilimani, Lavington, Kileleshwa, etc.

Be helpful, context-aware, conversational — and always StayHere-first.";

    private sealed class GroqChatResponse
    {
        public GroqChatChoice[]? Choices { get; set; }
    }

    private sealed class GroqChatChoice
    {
        public GroqChatMessage? Message { get; set; }
    }

    private sealed class GroqChatMessage
    {
        public string? Content { get; set; }
    }

    private static TimeSpan? ParseRetryAfter(HttpResponseMessage response)
    {
        if (response.Headers.RetryAfter?.Delta is { } d)
            return d;
        if (response.Headers.TryGetValues("Retry-After", out var values))
        {
            var first = values.FirstOrDefault();
            if (int.TryParse(first, out var seconds))
                return TimeSpan.FromSeconds(seconds);
        }
        return null;
    }
}
