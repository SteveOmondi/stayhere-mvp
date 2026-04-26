namespace StayHere.Application.AiAgent.Models;

public sealed class AgentKnowledgeSearchResult
{
    public string Content { get; init; } = string.Empty;
    public string Source { get; init; } = string.Empty;
    public double Score { get; init; }
    public IReadOnlyDictionary<string, object> Metadata { get; init; } = new Dictionary<string, object>();
}
