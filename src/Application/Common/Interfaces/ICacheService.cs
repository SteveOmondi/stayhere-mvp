namespace StayHere.Application.Common.Interfaces;

/// <summary>Cache-aside helper: read through Redis when available; on miss or errors, runs <paramref name="factory"/>.</summary>
public interface ICacheService
{
    /// <param name="expiration">TTL when storing a fresh value; default is 1 hour.</param>
    Task<T> GetOrSetAsync<T>(string key, Func<Task<T>> factory, TimeSpan? expiration = null);
}
