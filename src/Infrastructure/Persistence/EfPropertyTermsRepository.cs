using Microsoft.EntityFrameworkCore;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Infrastructure.Persistence;

public class EfPropertyTermsRepository : IPropertyTermsRepository
{
    private readonly StayHereDbContext _context;

    public EfPropertyTermsRepository(StayHereDbContext context)
    {
        _context = context;
    }

    public async Task<PropertyTerms?> GetActiveByListingIdAsync(Guid listingId)
        => await _context.Set<PropertyTerms>()
            .Where(t => t.ListingId == listingId && t.IsActive)
            .FirstOrDefaultAsync();

    public async Task<IReadOnlyDictionary<Guid, PropertyTerms>> GetActiveByListingIdsAsync(IEnumerable<Guid> listingIds)
    {
        var ids = listingIds.ToList();
        var terms = await _context.Set<PropertyTerms>()
            .Where(t => ids.Contains(t.ListingId) && t.IsActive)
            .ToListAsync();

        // If multiple active terms exist per listing, take the most recently updated
        return terms
            .GroupBy(t => t.ListingId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(t => t.UpdatedAt).First());
    }

    public async Task CreateAsync(PropertyTerms terms)
    {
        await _context.Set<PropertyTerms>().AddAsync(terms);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(PropertyTerms terms)
    {
        _context.Set<PropertyTerms>().Update(terms);
        await _context.SaveChangesAsync();
    }
}
