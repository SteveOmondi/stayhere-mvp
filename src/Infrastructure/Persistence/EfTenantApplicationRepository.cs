using Microsoft.EntityFrameworkCore;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Infrastructure.Persistence;

public class EfTenantApplicationRepository : ITenantApplicationRepository
{
    private readonly StayHereDbContext _db;

    public EfTenantApplicationRepository(StayHereDbContext db)
    {
        _db = db;
    }

    public Task<TenantApplication?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _db.TenantApplications
            .Include(a => a.Documents)
            .Include(a => a.Payments)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

    public async Task<IReadOnlyList<TenantApplication>> GetByCustomerAsync(Guid? customerId, Guid? userId, CancellationToken cancellationToken = default)
    {
        if (!customerId.HasValue && !userId.HasValue) return [];

        return await _db.TenantApplications
            .Include(a => a.Documents)
            .Include(a => a.Payments)
            .Where(a => (customerId.HasValue && a.CustomerId == customerId.Value)
                     || (userId.HasValue && a.CustomerId == userId.Value))
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(cancellationToken);
    }
}
