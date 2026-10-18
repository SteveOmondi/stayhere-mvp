using StayHere.Application.AiAgent.Models;

namespace StayHere.Application.Common.Interfaces;

public interface IAiAgentService
{
    /// <summary>
    /// <paramref name="callerUserId"/> comes only from the caller's verified JWT (never from
    /// request-body JSON) and scopes any "my applications"/"my payments"-style tool call to that
    /// caller alone. Null for anonymous/unauthenticated chat (personal tools simply return nothing).
    /// </summary>
    Task<AgentChatResponse> ChatAsync(AgentChatRequest request, Guid? callerUserId = null, CancellationToken cancellationToken = default);

    Task<AgentRecommendResponse> RecommendAsync(AgentRecommendRequest request, CancellationToken cancellationToken = default);

    Task<IReadOnlyDictionary<string, object>> GetKnowledgeBaseStatusAsync(CancellationToken cancellationToken = default);

    Task<AgentListingSearchResponse> SearchListingsAsync(AgentListingSearchRequest request, CancellationToken cancellationToken = default);

    /// <summary>Lists the caller's own past conversations, newest first. callerUserId comes only
    /// from the verified JWT, same as ChatAsync.</summary>
    Task<IReadOnlyList<AgentConversationSummaryDto>> ListConversationsAsync(Guid callerUserId, CancellationToken cancellationToken = default);

    /// <summary>Fetches one conversation's full replayable history - returns null if it doesn't
    /// exist OR doesn't belong to callerUserId (the two look identical to the caller, which is the
    /// point: no way to tell "not found" apart from "not yours").</summary>
    Task<AgentConversationDetailDto?> GetConversationAsync(Guid callerUserId, string conversationId, CancellationToken cancellationToken = default);
}
