using Microsoft.EntityFrameworkCore;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Infrastructure.Persistence;

public class EfUserRepository : IUserRepository
{
    private readonly StayHereDbContext _context;

    public EfUserRepository(StayHereDbContext context)
    {
        _context = context;
    }

    public async Task<User?> GetByIdAsync(Guid id)
    {
        return await _context.Users
            .Include(u => u.Organization)
            .FirstOrDefaultAsync(u => u.Id == id);
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        return await _context.Users
            .Include(u => u.Organization)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower());
    }

    public async Task<User?> GetByPhoneNumberAsync(string phoneNumber)
    {
        return await _context.Users
            .Include(u => u.Organization)
            .FirstOrDefaultAsync(u => u.PhoneNumber == phoneNumber);
    }

    public async Task<User?> GetByEntraObjectIdAsync(string entraObjectId)
    {
        return await _context.Users
            .Include(u => u.Organization)
            .FirstOrDefaultAsync(u => u.EntraObjectId == entraObjectId);
    }

    public async Task CreateAsync(User user)
    {
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(User user)
    {
        _context.Users.Update(user);
        await _context.SaveChangesAsync();
    }
}
