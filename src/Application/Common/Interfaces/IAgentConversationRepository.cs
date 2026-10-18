using StayHere.Domain.Entities;

namespace StayHere.Application.Common.Interfaces;

public interface IAgentConversationRepository
{
    Task<AiConversation?> GetByIdAsync(string conversationId, CancellationToken cancellationToken = default);

    /// <summary>Lists a user's own conversations, newest first, each with only its first message
    /// loaded (a lightweight preview for a history list - fetch the full thread via GetByIdAsync
    /// once the user picks one to resume).</summary>
    Task<IReadOnlyList<AiConversation>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<AiConversation> CreateAsync(AiConversation conversation, CancellationToken cancellationToken = default);

    Task<AiConversation> UpdateAsync(AiConversation conversation, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AiConversationMessage>> GetHistoryAsync(string conversationId, CancellationToken cancellationToken = default);
}
