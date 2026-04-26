using StayHere.Domain.Entities;

namespace StayHere.Application.Common.Interfaces;

public interface IAgentConversationRepository
{
    Task<AiConversation?> GetByIdAsync(string conversationId, CancellationToken cancellationToken = default);

    Task<AiConversation> CreateAsync(AiConversation conversation, CancellationToken cancellationToken = default);

    Task<AiConversation> UpdateAsync(AiConversation conversation, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AiConversationMessage>> GetHistoryAsync(string conversationId, CancellationToken cancellationToken = default);
}
