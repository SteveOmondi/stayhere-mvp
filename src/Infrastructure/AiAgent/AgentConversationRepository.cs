using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;
using StayHere.Application.Common.Interfaces;
using StayHere.Domain.Entities;

namespace StayHere.Infrastructure.AiAgent;

public class AgentConversationRepository : IAgentConversationRepository
{
    private readonly ConcurrentDictionary<string, AiConversation> _conversations = new();
    private readonly ILogger<AgentConversationRepository> _logger;

    public AgentConversationRepository(ILogger<AgentConversationRepository> logger)
    {
        _logger = logger;
    }

    public Task<AiConversation?> GetByIdAsync(string conversationId, CancellationToken cancellationToken = default)
    {
        _conversations.TryGetValue(conversationId, out var conversation);
        return Task.FromResult(conversation);
    }

    public Task<AiConversation> CreateAsync(AiConversation conversation, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(conversation.Id))
            conversation.Id = Guid.NewGuid().ToString();
        conversation.CreatedAt = DateTime.UtcNow;
        conversation.UpdatedAt = DateTime.UtcNow;
        _conversations[conversation.Id] = conversation;
        _logger.LogInformation("Created AI conversation {ConversationId}", conversation.Id);
        return Task.FromResult(conversation);
    }

    public Task<AiConversation> UpdateAsync(AiConversation conversation, CancellationToken cancellationToken = default)
    {
        conversation.UpdatedAt = DateTime.UtcNow;
        _conversations[conversation.Id] = conversation;
        _logger.LogInformation("Updated AI conversation {ConversationId}", conversation.Id);
        return Task.FromResult(conversation);
    }

    public Task<IReadOnlyList<AiConversationMessage>> GetHistoryAsync(string conversationId, CancellationToken cancellationToken = default)
    {
        if (_conversations.TryGetValue(conversationId, out var conversation))
            return Task.FromResult<IReadOnlyList<AiConversationMessage>>(conversation.Messages);

        return Task.FromResult<IReadOnlyList<AiConversationMessage>>(Array.Empty<AiConversationMessage>());
    }
}
