namespace StayHere.Infrastructure.AiAgent;

/// <summary>
/// Process-wide pacing for outbound Groq calls. GroqChatService is resolved per-request (it's a
/// typed HttpClient, effectively scoped) so without a shared gate here, every concurrent chat turn -
/// and every sequential call WITHIN one turn (intent extraction, then tool-call decision, then the
/// final response call) - fires independently with zero coordination. That's exactly how this
/// app hit Groq's free-tier rate limit on nearly every single call in a single chat turn (confirmed
/// live - see GroqChatService's retry logging). Groq's limit is requests-PER-MINUTE, not
/// concurrency, so the fix is a minimum spacing between the START of consecutive requests, not a
/// concurrency cap - a static gate shared by every GroqChatService instance in this process.
///
/// This only paces requests within a single process. A Flex Consumption/Premium plan that scales out
/// to multiple instances isn't coordinated across them without a distributed store (e.g. a Redis
/// token bucket) - acceptable for now since the dominant cause here was multiple back-to-back calls
/// within ONE chat turn on ONE instance, not cross-instance contention; worth revisiting if this app
/// ever runs under real multi-instance load.
/// </summary>
public static class GroqRateLimiter
{
    private static readonly SemaphoreSlim Gate = new(1, 1);
    private static DateTime _lastCallStartedUtc = DateTime.MinValue;

    public static async Task WaitForSlotAsync(TimeSpan minInterval, CancellationToken cancellationToken)
    {
        await Gate.WaitAsync(cancellationToken);
        try
        {
            var elapsedSinceLastCall = DateTime.UtcNow - _lastCallStartedUtc;
            if (elapsedSinceLastCall < minInterval)
                await Task.Delay(minInterval - elapsedSinceLastCall, cancellationToken);
            _lastCallStartedUtc = DateTime.UtcNow;
        }
        finally
        {
            Gate.Release();
        }
    }
}
