using Microsoft.EntityFrameworkCore;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Infrastructure.Persistence;

public class EfPropertyOwnerRepository : IPropertyOwnerRepository
{
    private readonly StayHereDbContext _context;

    public EfPropertyOwnerRepository(StayHereDbContext context)
    {
        _context = context;
    }

    public async Task<PropertyOwner?> GetByIdAsync(Guid id)
    {
        return await _context.PropertyOwners.FindAsync(id);
    }

    public async Task<PropertyOwner?> GetByUserIdAsync(Guid userId)
    {
        return await _context.PropertyOwners
            .FirstOrDefaultAsync(o => o.UserId == userId);
    }

    public async Task<PropertyOwner?> GetByEmailAsync(string email)
    {
        return await _context.PropertyOwners
            .FirstOrDefaultAsync(o => o.Email.ToLower() == email.ToLower());
    }

    public async Task<PropertyOwner?> GetByPhoneAsync(string phone)
    {
        return await _context.PropertyOwners
            .FirstOrDefaultAsync(o => o.Phone == phone);
    }

    public async Task<IEnumerable<PropertyOwner>> GetAllAsync(int page = 1, int pageSize = 20)
    {
        return await _context.PropertyOwners
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<int> GetCountAsync()
    {
        return await _context.PropertyOwners.CountAsync();
    }

    public async Task CreateAsync(PropertyOwner owner)
    {
        _context.PropertyOwners.Add(owner);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(PropertyOwner owner)
    {
        _context.PropertyOwners.Update(owner);
        await _context.SaveChangesAsync();
    }
}
