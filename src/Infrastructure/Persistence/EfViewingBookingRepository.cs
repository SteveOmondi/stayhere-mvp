using Microsoft.EntityFrameworkCore;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Infrastructure.Persistence;

public class EfViewingBookingRepository : IViewingBookingRepository
{
    private readonly StayHereDbContext _db;

    public EfViewingBookingRepository(StayHereDbContext db)
    {
        _db = db;
    }

    public Task<ViewingBooking?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _db.ViewingBookings.Include(b => b.Listing).FirstOrDefaultAsync(b => b.Id == id, cancellationToken);

    public async Task<IReadOnlyList<ViewingBooking>> GetByCustomerAsync(Guid? customerId, Guid? userId, CancellationToken cancellationToken = default)
    {
        if (!customerId.HasValue && !userId.HasValue) return [];

        // Listing included so callers (Sage's get_my_viewings in particular) can actually name the
        // property instead of just a bare listingId - without this, every answer about "my
        // bookings" could only describe a raw GUID, never the listing itself.
        return await _db.ViewingBookings
            .Include(b => b.Listing)
            .Where(b => (customerId.HasValue && b.CustomerId == customerId.Value)
                     || (userId.HasValue && b.CustomerId == userId.Value))
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task CreateAsync(ViewingBooking booking, CancellationToken cancellationToken = default)
    {
        _db.ViewingBookings.Add(booking);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(ViewingBooking booking, CancellationToken cancellationToken = default)
    {
        await _db.SaveChangesAsync(cancellationToken);
    }
}
