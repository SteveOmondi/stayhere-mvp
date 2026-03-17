using StayHere.Domain.Entities;

namespace StayHere.Domain.Repositories;

public interface IDocumentRepository
{
    Task<Document> AddAsync(Document document, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Document>> GetByEntityAsync(string entityType, Guid entityId, CancellationToken cancellationToken = default);
}

