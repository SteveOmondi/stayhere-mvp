using StayHere.Application.AiAgent.Models;

namespace StayHere.Application.Common.Interfaces;

public interface IAiAgentService
{
    Task<AgentChatResponse> ChatAsync(AgentChatRequest request, CancellationToken cancellationToken = default);

    Task<AgentRecommendResponse> RecommendAsync(AgentRecommendRequest request, CancellationToken cancellationToken = default);

    Task<IReadOnlyDictionary<string, object>> GetKnowledgeBaseStatusAsync(CancellationToken cancellationToken = default);

    Task<AgentListingSearchResponse> SearchListingsAsync(AgentListingSearchRequest request, CancellationToken cancellationToken = default);
}
