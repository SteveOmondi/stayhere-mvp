using Microsoft.EntityFrameworkCore;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Infrastructure.Persistence;

public class EfDocumentRepository : IDocumentRepository
{
    private readonly StayHereDbContext _db;

    public EfDocumentRepository(StayHereDbContext db)
    {
        _db = db;
    }

    public async Task<Document> AddAsync(Document document, CancellationToken cancellationToken = default)
    {
        _db.Documents.Add(document);
        await _db.SaveChangesAsync(cancellationToken);
        return document;
    }

    public Task<IReadOnlyList<Document>> GetByEntityAsync(string entityType, Guid entityId, CancellationToken cancellationToken = default) =>
        _db.Documents
            .Where(d => d.EntityType == entityType && d.EntityId == entityId)
            .OrderByDescending(d => d.UploadedAt)
            .ToListAsync(cancellationToken)
            .ContinueWith(t => (IReadOnlyList<Document>)t.Result, cancellationToken);
}

