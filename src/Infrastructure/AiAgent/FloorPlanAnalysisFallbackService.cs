using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StayHere.Application.Common.Interfaces;

namespace StayHere.Infrastructure.AiAgent;

/// <summary>
/// Registered as the app's <see cref="IFloorPlanAnalysisService"/>. Tries each configured provider
/// in order and, only if one fails for any reason, falls through to the next - each a different
/// vendor entirely, so an outage or exhausted quota affecting one can't take down floor-plan
/// analysis with it. A later provider also picks up automatically if an earlier one fails for a
/// non-availability reason (e.g. it genuinely found no rooms) - another model's opinion is strictly
/// better than none.
///
/// Order is config-driven (<c>FloorPlan:ProviderOrder</c>, comma-separated, e.g. "Claude,Gemini,Qwen")
/// rather than fixed - useful for A/B testing one provider's real-world quality/speed against another
/// without a code change. Defaults to Claude first (fastest and most accurate of the three - see
/// <see cref="ClaudeFloorPlanService"/>), then Gemini, then Qwen/Groq. Any provider named in config
/// but misspelled is ignored; any recognized provider NOT named in config is still appended at the
/// end, so a typo or omission in config can never silently drop a whole vendor out of the fallback
/// chain entirely - if Claude isn't configured (no Anthropic:ApiKey), it fails fast on its first call
/// and this just moves on to the next provider, same as any other failure.
/// </summary>
public class FloorPlanAnalysisFallbackService : IFloorPlanAnalysisService
{
    private readonly IReadOnlyList<(string Name, IFloorPlanAnalysisService Service)> _providersInOrder;
    private readonly ILogger<FloorPlanAnalysisFallbackService> _logger;

    public FloorPlanAnalysisFallbackService(
        ClaudeFloorPlanService claude,
        GeminiFloorPlanService gemini,
        QwenFloorPlanService qwen,
        IConfiguration configuration,
        ILogger<FloorPlanAnalysisFallbackService> logger)
    {
        var all = new Dictionary<string, IFloorPlanAnalysisService>(StringComparer.OrdinalIgnoreCase)
        {
            ["Claude"] = claude,
            ["Gemini"] = gemini,
            ["Qwen"] = qwen,
        };

        var configuredOrder = (configuration["FloorPlan:ProviderOrder"] ?? "Claude,Gemini,Qwen")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        var order = configuredOrder.Where(name => all.ContainsKey(name)).ToList();
        foreach (var key in all.Keys)
            if (!order.Contains(key, StringComparer.OrdinalIgnoreCase)) order.Add(key);

        _providersInOrder = order.Select(name => (name, all[name])).ToList();
        _logger = logger;
    }

    public async Task<FloorPlanAnalysisResult> AnalyzeAsync(byte[] imageBytes, string mimeType, CancellationToken cancellationToken = default)
    {
        var exceptions = new List<Exception>();

        for (var i = 0; i < _providersInOrder.Count; i++)
        {
            var (name, service) = _providersInOrder[i];
            try
            {
                return await service.AnalyzeAsync(imageBytes, mimeType, cancellationToken);
            }
            catch (Exception ex)
            {
                exceptions.Add(ex);
                if (i < _providersInOrder.Count - 1)
                    _logger.LogWarning(ex, "{Provider} floor-plan analysis failed; falling back to {Next}", name, _providersInOrder[i + 1].Name);
                else
                    _logger.LogError(ex, "{Provider} floor-plan analysis failed - no more fallback providers configured", name);
            }
        }

        // Every provider independently concluded there's nothing usable here - surface that as the
        // same 4xx "no rooms detected" signal the caller already handles, rather than masking it
        // behind a generic 500 from the aggregate below.
        if (exceptions.Count > 0 && exceptions.All(e => e is InvalidOperationException))
            throw new InvalidOperationException("No available model detected any usable rooms in this image.");

        throw new AggregateException(
            $"Floor plan analysis failed on all {_providersInOrder.Count} configured provider(s) ({string.Join(", ", _providersInOrder.Select(p => p.Name))}).",
            exceptions);
    }
}
