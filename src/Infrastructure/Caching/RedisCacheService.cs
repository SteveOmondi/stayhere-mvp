using System.Text.Json;
using System.Text.Json.Serialization.Metadata;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using StayHere.Application.Common.Interfaces;
using StayHere.Domain.Entities;

namespace StayHere.Infrastructure.Caching;

public sealed class RedisCacheService : ICacheService
{
    private static readonly TimeSpan DefaultExpiration = TimeSpan.FromHours(1);

    private static readonly JsonSerializerOptions JsonOptions = CreateJsonOptions();

    private readonly IConnectionMultiplexer _multiplexer;
    private readonly ILogger<RedisCacheService> _logger;

    public RedisCacheService(IConnectionMultiplexer multiplexer, ILogger<RedisCacheService> logger)
    {
        _multiplexer = multiplexer;
        _logger = logger;
    }

    public async Task<T> GetOrSetAsync<T>(string key, Func<Task<T>> factory, TimeSpan? expiration = null)
    {
        var ttl = expiration ?? DefaultExpiration;

        try
        {
            var db = _multiplexer.GetDatabase();
            var cached = await db.StringGetAsync(key).ConfigureAwait(false);
            if (cached.HasValue)
            {
                var deserialized = JsonSerializer.Deserialize<T>(cached!, JsonOptions);
                if (deserialized is not null)
                    return deserialized;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis cache read failed for key {CacheKey}", key);
        }

        var value = await factory().ConfigureAwait(false);

        if (value is null)
            return value!;

        try
        {
            var db = _multiplexer.GetDatabase();
            var json = JsonSerializer.Serialize(value, JsonOptions);
            await db.StringSetAsync(key, json, ttl).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis cache write failed for key {CacheKey}", key);
        }

        return value;
    }

    public async Task RemoveAsync(string key)
    {
        try
        {
            var db = _multiplexer.GetDatabase();
            await db.KeyDeleteAsync(key).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis RemoveAsync failed for key {CacheKey}", key);
        }
    }

    public async Task RemoveByPrefixAsync(string prefix)
    {
        try
        {
            var endpoints = _multiplexer.GetEndPoints();
            if (endpoints.Length == 0) return;

            var db = _multiplexer.GetDatabase();
            var server = _multiplexer.GetServer(endpoints[0]);
            var keys = new List<RedisKey>();
            await foreach (var key in server.KeysAsync(pattern: $"{prefix}*", database: db.Database))
                keys.Add(key);

            if (keys.Count > 0)
                await db.KeyDeleteAsync(keys.ToArray()).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis RemoveByPrefixAsync failed for prefix {Prefix}", prefix);
        }
    }

    public async Task<long> IncrementCounterAsync(string key)
    {
        try
        {
            var db = _multiplexer.GetDatabase();
            return await db.StringIncrementAsync(key).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis IncrementCounterAsync failed for key {CacheKey}", key);
            return 0;
        }
    }

    public async Task<IReadOnlyDictionary<string, long>> GetAndClearCountersAsync(string keyPrefix)
    {
        var result = new Dictionary<string, long>();
        try
        {
            var endpoints = _multiplexer.GetEndPoints();
            if (endpoints.Length == 0) return result;

            var db = _multiplexer.GetDatabase();
            var server = _multiplexer.GetServer(endpoints[0]);
            await foreach (var redisKey in server.KeysAsync(pattern: $"{keyPrefix}*", database: db.Database))
            {
                var value = await db.StringGetDeleteAsync(redisKey).ConfigureAwait(false);
                if (value.TryParse(out long count) && count > 0)
                    result[redisKey.ToString()] = count;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis GetAndClearCountersAsync failed for prefix {Prefix}", keyPrefix);
        }
        return result;
    }

    /// <summary>Web defaults; omits <see cref="Listing.Embedding"/> on serialize to keep payloads small for catalog-style caches.</summary>
    private static JsonSerializerOptions CreateJsonOptions()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.TypeInfoResolver = new DefaultJsonTypeInfoResolver
        {
            Modifiers =
            {
                static ti =>
                {
                    if (ti.Type != typeof(Listing))
                        return;
                    foreach (var p in ti.Properties)
                    {
                        if (p.Name == nameof(Listing.Embedding))
                            p.ShouldSerialize = static (_, _) => false;
                    }
                }
            }
        };
        return options;
    }
}
