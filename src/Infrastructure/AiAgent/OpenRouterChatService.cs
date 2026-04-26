using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StayHere.Application.Common.Interfaces;

namespace StayHere.Infrastructure.AiAgent;

public class OpenRouterChatService : IOpenRouterChatService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<OpenRouterChatService> _logger;

    public OpenRouterChatService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<OpenRouterChatService> logger)
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
        var apiKey = _configuration["OpenRouter:ApiKey"]?.Trim()
                     ?? Environment.GetEnvironmentVariable("OPENROUTER_API_KEY")?.Trim();
        var model = _configuration["OpenRouter:Model"] ?? "deepseek/deepseek-chat-v3.1:free";

        if (string.IsNullOrEmpty(apiKey))
        {
            _logger.LogError("OpenRouter API key is not configured (OpenRouter:ApiKey)");
            throw new InvalidOperationException("OpenRouter API key is not configured. Set OpenRouter:ApiKey in local.settings.json or environment.");
        }

        const string url = "https://openrouter.ai/api/v1/chat/completions";
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

        var maxAttempts = int.TryParse(_configuration["OpenRouter:MaxRetries"], out var m) ? Math.Clamp(m, 1, 8) : 4;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url)
                {
                    Content = JsonContent.Create(request)
                };
                httpRequest.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");
                httpRequest.Headers.TryAddWithoutValidation("HTTP-Referer", _configuration["OpenRouter:HttpReferer"] ?? "http://localhost:7074");
                httpRequest.Headers.TryAddWithoutValidation("X-Title", "StayHere AI Agent");

                _logger.LogDebug("Sending request to OpenRouter with model {Model} (attempt {Attempt})", model, attempt);
                var response = await _httpClient.SendAsync(httpRequest, cancellationToken);

                if (response.StatusCode == HttpStatusCode.TooManyRequests)
                {
                    var delay = ParseRetryAfter(response) ?? TimeSpan.FromSeconds(Math.Pow(2, attempt));
                    _logger.LogWarning("OpenRouter chat rate limited (429). Attempt {Attempt}/{Max}. Waiting {Delay}s", attempt, maxAttempts, delay.TotalSeconds);
                    if (attempt == maxAttempts)
                        response.EnsureSuccessStatusCode();
                    await Task.Delay(delay, cancellationToken);
                    continue;
                }

                response.EnsureSuccessStatusCode();

                var responseContent = await response.Content.ReadFromJsonAsync<OpenRouterResponse>(cancellationToken: cancellationToken);

                if (responseContent?.Choices is { Length: > 0 })
                {
                    var text = responseContent.Choices[0].Message?.Content?.Trim() ?? string.Empty;
                    _logger.LogDebug("OpenRouter response length {Length}", text.Length);
                    return text;
                }

                _logger.LogWarning("OpenRouter returned empty choices");
                return "I apologize, but I couldn't generate a response at this time.";
            }
            catch (HttpRequestException ex) when (attempt < maxAttempts)
            {
                _logger.LogWarning(ex, "OpenRouter chat attempt {Attempt} failed; retrying", attempt);
                await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt)), cancellationToken);
            }
        }

        throw new HttpRequestException("OpenRouter chat failed after retries.");
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

    private sealed class OpenRouterResponse
    {
        public OpenRouterChoice[]? Choices { get; set; }
    }

    private sealed class OpenRouterChoice
    {
        public OpenRouterMessage? Message { get; set; }
    }

    private sealed class OpenRouterMessage
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
