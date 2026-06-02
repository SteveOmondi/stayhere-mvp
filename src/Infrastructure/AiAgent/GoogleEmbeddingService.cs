using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StayHere.Application.Common.Interfaces;
using StayHere.Domain;

namespace StayHere.Infrastructure.AiAgent;

public class GoogleEmbeddingService : IEmbeddingService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GoogleEmbeddingService> _logger;
    private readonly IMemoryCache _cache;

    public GoogleEmbeddingService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<GoogleEmbeddingService> logger,
        IMemoryCache cache)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
        _cache = cache;
    }

    public async Task<float[]> EmbedAsync(string text, CancellationToken cancellationToken = default)
    {
        var apiKey = _configuration["Google:ApiKey"]?.Trim()
                     ?? Environment.GetEnvironmentVariable("GOOGLE_API_KEY")?.Trim();
        var model = _configuration["Google:EmbeddingModel"] ?? "text-embedding-004";

        if (string.IsNullOrEmpty(apiKey))
            throw new InvalidOperationException("Google AI Studio API key is not configured (Google:ApiKey).");

        var cacheMinutes = int.TryParse(_configuration["Google:EmbeddingCacheMinutes"], out var cm)
            ? Math.Clamp(cm, 0, 24 * 60)
            : 45;
        var cacheKey = BuildCacheKey(model, text);
        if (cacheMinutes > 0 && _cache.TryGetValue(cacheKey, out float[]? cached) && cached is { Length: > 0 })
        {
            _logger.LogDebug("Embedding cache hit for model {Model}", model);
            return (float[])cached.Clone();
        }

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:embedContent";
        var body = new
        {
            model = $"models/{model}",
            content = new
            {
                parts = new[] { new { text } }
            },
            outputDimensionality = StayHereEmbeddingDimensions.Default
        };

        var maxAttempts = int.TryParse(_configuration["Google:MaxRetries"], out var m) ? Math.Clamp(m, 1, 8) : 4;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = JsonContent.Create(body)
            };
            req.Headers.TryAddWithoutValidation("x-goog-api-key", apiKey);

            var response = await _httpClient.SendAsync(req, cancellationToken);

            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                var delay = ParseRetryAfter(response) ?? TimeSpan.FromSeconds(Math.Pow(2, attempt));
                _logger.LogWarning("Google embeddings rate limited (429). Attempt {Attempt}/{Max}. Waiting {Delay}s", attempt, maxAttempts, delay.TotalSeconds);
                if (attempt == maxAttempts)
                    response.EnsureSuccessStatusCode();
                await Task.Delay(delay, cancellationToken);
                continue;
            }

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Google AI Studio returned {Status} for model {Model}. Response: {Body}", (int)response.StatusCode, model, errorBody);
                response.EnsureSuccessStatusCode();
            }

            var payload = await response.Content.ReadFromJsonAsync<GoogleEmbeddingResponse>(cancellationToken: cancellationToken);
            var vec = payload?.Embedding?.Values;
            if (vec == null || vec.Length == 0)
                throw new InvalidOperationException("Google AI Studio returned no embedding vector.");

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

        throw new InvalidOperationException("Google embedding request failed after retries.");
    }

    private static string BuildCacheKey(string model, string text)
    {
        var input = Encoding.UTF8.GetBytes($"{model}\n{text}");
        var hash = SHA256.HashData(input);
        return "goog-embed:" + Convert.ToHexString(hash);
    }

    private static float[] NormalizeDimension(float[] vec, int expected)
    {
        if (vec.Length == expected)
            return vec;
        var result = new float[expected];
        Array.Copy(vec, result, Math.Min(vec.Length, expected));
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

    private sealed class GoogleEmbeddingResponse
    {
        [JsonPropertyName("embedding")]
        public GoogleEmbeddingValues? Embedding { get; set; }
    }

    private sealed class GoogleEmbeddingValues
    {
        [JsonPropertyName("values")]
        public float[]? Values { get; set; }
    }
}
