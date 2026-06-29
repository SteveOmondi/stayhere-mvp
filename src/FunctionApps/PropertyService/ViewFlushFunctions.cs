using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using StayHere.Application.Common.Interfaces;
using StayHere.Domain.Repositories;

namespace StayHere.PropertyService.Functions;

/// <summary>
/// Drains the Redis view-count accumulators and writes the totals to the database every 5 minutes.
/// This decouples the high-frequency POST /listings/{id}/view endpoint from DB writes.
/// </summary>
public class ViewFlushFunctions
{
    private const string ViewCounterPrefix = "stayhere:views:";

    private readonly ICacheService _cache;
    private readonly IListingRepository _listingRepository;
    private readonly ILogger<ViewFlushFunctions> _logger;

    public ViewFlushFunctions(
        ICacheService cache,
        IListingRepository listingRepository,
        ILogger<ViewFlushFunctions> logger)
    {
        _cache = cache;
        _listingRepository = listingRepository;
        _logger = logger;
    }

    [Function("FlushViewCounters")]
    public async Task Run([TimerTrigger("0 */5 * * * *")] TimerInfo timer)
    {
        var deltas = await _cache.GetAndClearCountersAsync(ViewCounterPrefix);
        if (deltas.Count == 0)
            return;

        var viewDeltas = new Dictionary<Guid, long>(deltas.Count);
        foreach (var (key, count) in deltas)
        {
            var idPart = key[ViewCounterPrefix.Length..];
            if (Guid.TryParse(idPart, out var id))
                viewDeltas[id] = count;
            else
                _logger.LogWarning("Could not parse listing id from view counter key {Key}", key);
        }

        if (viewDeltas.Count == 0)
            return;

        await _listingRepository.BatchIncrementViewsAsync(viewDeltas);
        _logger.LogInformation("Flushed view counts for {Count} listing(s)", viewDeltas.Count);
    }
}
