using StayHere.Application.Common.Interfaces;

namespace StayHere.Infrastructure.Caching;

/// <summary>Used when Redis is not configured: always loads through <paramref name="factory"/>.</summary>
public sealed class NoOpCacheService : ICacheService
{
    public Task<T> GetOrSetAsync<T>(string key, Func<Task<T>> factory, TimeSpan? expiration = null) =>
        factory();
}
