using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StayHere.Application.Common.Interfaces;
using StayHere.Domain;

namespace StayHere.Infrastructure.AiAgent;

public class OpenRouterEmbeddingService : IEmbeddingService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<OpenRouterEmbeddingService> _logger;
    private readonly IMemoryCache _cache;

    public OpenRouterEmbeddingService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<OpenRouterEmbeddingService> logger,
        IMemoryCache cache)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
        _cache = cache;
    }

    public async Task<float[]> EmbedAsync(string text, CancellationToken cancellationToken = default)
    {
        var apiKey = _configuration["OpenRouter:ApiKey"]?.Trim()
                     ?? Environment.GetEnvironmentVariable("OPENROUTER_API_KEY")?.Trim();
        var model = _configuration["OpenRouter:EmbeddingModel"] ?? "openai/text-embedding-3-small";

        if (string.IsNullOrEmpty(apiKey))
            throw new InvalidOperationException("OpenRouter API key is not configured (OpenRouter:ApiKey).");

        var cacheMinutes = int.TryParse(_configuration["OpenRouter:EmbeddingCacheMinutes"], out var cm)
            ? Math.Clamp(cm, 0, 24 * 60)
            : 45;
        var cacheKey = BuildCacheKey(model, text);
        if (cacheMinutes > 0 && _cache.TryGetValue(cacheKey, out float[]? cached) && cached is { Length: > 0 })
        {
            _logger.LogDebug("Embedding cache hit for model {Model}", model);
            return (float[])cached.Clone();
        }

        const string url = "https://openrouter.ai/api/v1/embeddings";
        var body = new { model, input = text };

        var maxAttempts = int.TryParse(_configuration["OpenRouter:MaxRetries"], out var m) ? Math.Clamp(m, 1, 8) : 4;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = JsonContent.Create(body)
            };
            req.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");
            req.Headers.TryAddWithoutValidation("HTTP-Referer", _configuration["OpenRouter:HttpReferer"] ?? "http://localhost:7074");
            req.Headers.TryAddWithoutValidation("X-Title", "StayHere Embeddings");

            var response = await _httpClient.SendAsync(req, cancellationToken);

            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                var delay = ParseRetryAfter(response) ?? TimeSpan.FromSeconds(Math.Pow(2, attempt));
                _logger.LogWarning("OpenRouter embeddings rate limited (429). Attempt {Attempt}/{Max}. Waiting {Delay}s", attempt, maxAttempts, delay.TotalSeconds);
                if (attempt == maxAttempts)
                    response.EnsureSuccessStatusCode();
                await Task.Delay(delay, cancellationToken);
                continue;
            }

            response.EnsureSuccessStatusCode();
            var payload = await response.Content.ReadFromJsonAsync<EmbeddingsResponse>(cancellationToken: cancellationToken);
            var vec = payload?.Data is { Length: > 0 } ? payload.Data[0].Embedding : null;
            if (vec == null || vec.Length == 0)
                throw new InvalidOperationException("OpenRouter returned no embedding vector.");

            if (vec.Length != StayHereEmbeddingDimensions.Default)
            {
                _logger.LogWarning("Embedding length {Len} differs from expected {Expected}; truncating or padding.", vec.Length, StayHereEmbeddingDimensions.Default);
                vec = NormalizeDimension(vec, StayHereEmbeddingDimensions.Default);
            }

            if (cacheMinutes > 0)
            {
                var toStore = (float[])vec.Clone();
                _cache.Set(
                    cacheKey,
                    toStore,
                    new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(cacheMinutes) });
            }

            return vec;
        }

        throw new InvalidOperationException("Embedding request failed after retries.");
    }

    private static string BuildCacheKey(string model, string text)
    {
        var input = Encoding.UTF8.GetBytes($"{model}\n{text}");
        var hash = SHA256.HashData(input);
        return "or-embed:" + Convert.ToHexString(hash);
    }

    private static float[] NormalizeDimension(float[] vec, int expected)
    {
        if (vec.Length == expected)
            return vec;
        var result = new float[expected];
        var copy = Math.Min(vec.Length, expected);
        Array.Copy(vec, result, copy);
        return result;
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

    private sealed class EmbeddingsResponse
    {
        public EmbeddingData[]? Data { get; set; }
    }

    private sealed class EmbeddingData
    {
        [JsonPropertyName("embedding")]
        public float[]? Embedding { get; set; }
    }
}
