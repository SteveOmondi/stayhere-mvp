namespace StayHere.Application.Common.Interfaces;

/// <summary>Cache-aside helper: read through Redis when available; on miss or errors, runs <paramref name="factory"/>.</summary>
public interface ICacheService
{
    /// <param name="expiration">TTL when storing a fresh value; default is 1 hour.</param>
    Task<T> GetOrSetAsync<T>(string key, Func<Task<T>> factory, TimeSpan? expiration = null);

    /// <summary>Delete a single cache entry by exact key.</summary>
    Task RemoveAsync(string key);

    /// <summary>Delete all cache entries whose key starts with <paramref name="prefix"/>. Uses SCAN, not KEYS.</summary>
    Task RemoveByPrefixAsync(string prefix);

    /// <summary>Atomically increment a counter (Redis INCR). Returns the new value. Used for buffered view counts.</summary>
    Task<long> IncrementCounterAsync(string key);

    /// <summary>
    /// SCAN for all keys starting with <paramref name="keyPrefix"/>, atomically read-and-delete each,
    /// and return a map of full-key → count. Resets the counters in one pass.
    /// </summary>
    Task<IReadOnlyDictionary<string, long>> GetAndClearCountersAsync(string keyPrefix);

    /// <summary>
    /// Atomic fixed-window rate limit check: increments <paramref name="key"/>'s counter (setting
    /// it to expire after <paramref name="window"/> on its first increment) and returns whether
    /// the caller is still within <paramref name="maxCount"/> for this window. Safe across however
    /// many Function instances are running - the counter lives in Redis, not in any one process.
    /// Fails OPEN (always allows) if Redis is unavailable - a cache outage should never be able to
    /// lock real users out of sending messages.
    /// </summary>
    Task<bool> TryConsumeRateLimitAsync(string key, int maxCount, TimeSpan window);
}
