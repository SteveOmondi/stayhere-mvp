using Microsoft.EntityFrameworkCore;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Infrastructure.Persistence;

public class EfCaretakerRepository : ICaretakerRepository
{
    private readonly StayHereDbContext _context;

    public EfCaretakerRepository(StayHereDbContext context)
    {
        _context = context;
    }

    public async Task<Caretaker?> GetByIdAsync(Guid id)
    {
        return await _context.Caretakers.FindAsync(id);
    }

    public async Task<IEnumerable<Caretaker>> GetByOwnerIdAsync(Guid propertyOwnerId)
    {
        return await _context.Caretakers
            .Where(c => c.PropertyOwnerId == propertyOwnerId)
            .OrderBy(c => c.FullName)
            .ToListAsync();
    }

    public async Task CreateAsync(Caretaker caretaker)
    {
        _context.Caretakers.Add(caretaker);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Caretaker caretaker)
    {
        _context.Caretakers.Update(caretaker);
        await _context.SaveChangesAsync();
    }
}
