using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StayHere.Application.Common.Interfaces;
using StayHere.Domain.Entities;

namespace StayHere.Infrastructure.Persistence;

/// <summary>
/// Persists AI conversation history to Postgres. Replaces the earlier in-memory
/// (ConcurrentDictionary-backed) implementation, which silently lost conversations on process
/// restart and did not share state across Azure Functions instances when scaled out.
/// </summary>
public class EfAgentConversationRepository : IAgentConversationRepository
{
    private readonly StayHereDbContext _db;
    private readonly ILogger<EfAgentConversationRepository> _logger;

    public EfAgentConversationRepository(StayHereDbContext db, ILogger<EfAgentConversationRepository> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<AiConversation?> GetByIdAsync(string conversationId, CancellationToken cancellationToken = default)
    {
        return await _db.AiConversations
            .Include(c => c.Messages.OrderBy(m => m.Timestamp))
            .FirstOrDefaultAsync(c => c.Id == conversationId, cancellationToken);
    }

    public async Task<IReadOnlyList<AiConversation>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _db.AiConversations
            .Where(c => c.UserId == userId)
            .Include(c => c.Messages.OrderBy(m => m.Timestamp).Take(1))
            .OrderByDescending(c => c.UpdatedAt)
            .Take(50)
            .ToListAsync(cancellationToken);
    }

    public async Task<AiConversation> CreateAsync(AiConversation conversation, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(conversation.Id))
            conversation.Id = Guid.NewGuid().ToString();
        conversation.CreatedAt = DateTime.UtcNow;
        conversation.UpdatedAt = DateTime.UtcNow;

        _db.AiConversations.Add(conversation);
        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Created AI conversation {ConversationId}", conversation.Id);
        return conversation;
    }

    public async Task<AiConversation> UpdateAsync(AiConversation conversation, CancellationToken cancellationToken = default)
    {
        conversation.UpdatedAt = DateTime.UtcNow;

        var existing = await _db.AiConversations
            .Include(c => c.Messages)
            .FirstOrDefaultAsync(c => c.Id == conversation.Id, cancellationToken);

        if (existing == null)
        {
            _db.AiConversations.Add(conversation);
        }
        else
        {
            existing.UpdatedAt = conversation.UpdatedAt;
            var existingIds = existing.Messages.Select(m => m.Id).ToHashSet();
            foreach (var message in conversation.Messages.Where(m => !existingIds.Contains(m.Id)))
            {
                message.ConversationId = existing.Id;
                existing.Messages.Add(message);
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Updated AI conversation {ConversationId}", conversation.Id);
        return existing ?? conversation;
    }

    public async Task<IReadOnlyList<AiConversationMessage>> GetHistoryAsync(string conversationId, CancellationToken cancellationToken = default)
    {
        return await _db.AiConversationMessages
            .Where(m => m.ConversationId == conversationId)
            .OrderBy(m => m.Timestamp)
            .ToListAsync(cancellationToken);
    }
}
