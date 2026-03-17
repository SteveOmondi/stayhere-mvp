using Microsoft.EntityFrameworkCore;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Infrastructure.Persistence;

public class EfPropertyRepository : IPropertyRepository
{
    private readonly StayHereDbContext _context;

    public EfPropertyRepository(StayHereDbContext context)
    {
        _context = context;
    }

    public async Task<Property?> GetByIdAsync(Guid id)
    {
        return await _context.Properties.FindAsync(id);
    }

    public async Task<Property?> GetByPropertyCodeAsync(string propertyCode)
    {
        return await _context.Properties
            .FirstOrDefaultAsync(p => p.PropertyCode == propertyCode);
    }

    public async Task<IEnumerable<Property>> GetAllAsync(int page = 1, int pageSize = 20)
    {
        return await _context.Properties
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<IEnumerable<Property>> GetByOwnerIdAsync(Guid ownerId)
    {
        return await _context.Properties
            .Where(p => p.OwnerId == ownerId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();
    }

    public async Task<int> GetTotalCountAsync()
    {
        return await _context.Properties.CountAsync();
    }

    public async Task CreateAsync(Property property)
    {
        _context.Properties.Add(property);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Property property)
    {
        _context.Properties.Update(property);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var property = await _context.Properties.FindAsync(id);
        if (property != null)
        {
            _context.Properties.Remove(property);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<string> GeneratePropertyCodeAsync()
    {
        var count = await _context.Properties.CountAsync();
        return $"P{(count + 1001):D4}";
    }
}
