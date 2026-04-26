using StayHere.Application.AiAgent.Models;

namespace StayHere.Application.Common.Interfaces;

public interface IAgentKnowledgeBaseRepository
{
    Task<IReadOnlyList<AgentKnowledgeSearchResult>> SearchAsync(string query, int topK = 5, CancellationToken cancellationToken = default);

    Task<IReadOnlyDictionary<string, object>> GetStatusAsync(CancellationToken cancellationToken = default);
}
