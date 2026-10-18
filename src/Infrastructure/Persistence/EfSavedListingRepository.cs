using Microsoft.EntityFrameworkCore;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Infrastructure.Persistence;

public class EfSavedListingRepository : ISavedListingRepository
{
    private readonly StayHereDbContext _db;

    public EfSavedListingRepository(StayHereDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<SavedListing>> GetByCustomerAsync(Guid? customerId, Guid? userId, CancellationToken cancellationToken = default)
    {
        if (!customerId.HasValue && !userId.HasValue) return [];

        return await _db.SavedListings
            .Include(s => s.Listing)
            .Where(s => (customerId.HasValue && s.CustomerId == customerId.Value)
                     || (userId.HasValue && s.CustomerId == userId.Value))
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<SavedListing?> FindAsync(Guid? customerId, Guid? userId, Guid listingId, CancellationToken cancellationToken = default)
    {
        if (!customerId.HasValue && !userId.HasValue) return null;

        return await _db.SavedListings
            .FirstOrDefaultAsync(s => s.ListingId == listingId
                && ((customerId.HasValue && s.CustomerId == customerId.Value)
                 || (userId.HasValue && s.CustomerId == userId.Value)),
                cancellationToken);
    }

    public async Task CreateAsync(SavedListing saved, CancellationToken cancellationToken = default)
    {
        _db.SavedListings.Add(saved);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(SavedListing saved, CancellationToken cancellationToken = default)
    {
        _db.SavedListings.Remove(saved);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
