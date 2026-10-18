using Microsoft.EntityFrameworkCore;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Infrastructure.Persistence;

public class EfEnquiryRepository : IEnquiryRepository
{
    private readonly StayHereDbContext _db;

    public EfEnquiryRepository(StayHereDbContext db)
    {
        _db = db;
    }

    public async Task<Enquiry?> FindByListingAndCustomerAsync(Guid listingId, Guid? customerId, Guid? userId, CancellationToken cancellationToken = default)
    {
        if (!customerId.HasValue && !userId.HasValue) return null;

        return await _db.Enquiries.FirstOrDefaultAsync(e =>
            e.ListingId == listingId
            && ((customerId.HasValue && e.CustomerId == customerId.Value) || (userId.HasValue && e.CustomerId == userId.Value)),
            cancellationToken);
    }

    public async Task<IReadOnlyList<Enquiry>> GetByCustomerAsync(Guid? customerId, Guid? userId, CancellationToken cancellationToken = default)
    {
        if (!customerId.HasValue && !userId.HasValue) return [];

        return await _db.Enquiries
            .Include(e => e.Listing)
            .Where(e => (customerId.HasValue && e.CustomerId == customerId.Value) || (userId.HasValue && e.CustomerId == userId.Value))
            .OrderByDescending(e => e.LastMessageAt)
            .Take(50)
            .ToListAsync(cancellationToken);
    }

    public async Task CreateAsync(Enquiry enquiry, CancellationToken cancellationToken = default)
    {
        _db.Enquiries.Add(enquiry);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(Enquiry enquiry, CancellationToken cancellationToken = default)
    {
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task AddMessageAsync(EnquiryMessage message, CancellationToken cancellationToken = default)
    {
        _db.EnquiryMessages.Add(message);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyDictionary<Guid, int>> CountUnreadForCustomerAsync(IReadOnlyCollection<Guid> enquiryIds, CancellationToken cancellationToken = default)
    {
        if (enquiryIds.Count == 0) return new Dictionary<Guid, int>();

        var counts = await _db.EnquiryMessages
            .Where(m => enquiryIds.Contains(m.EnquiryId) && m.SenderRole == "Owner")
            .Join(_db.Enquiries, m => m.EnquiryId, e => e.Id, (m, e) => new { m.EnquiryId, m.CreatedAt, e.CustomerLastReadAt })
            .Where(x => x.CustomerLastReadAt == null || x.CreatedAt > x.CustomerLastReadAt)
            .GroupBy(x => x.EnquiryId)
            .Select(g => new { EnquiryId = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        return counts.ToDictionary(c => c.EnquiryId, c => c.Count);
    }
}
