using Microsoft.EntityFrameworkCore;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Infrastructure.Persistence;

public class EfAgentRepository : IAgentRepository
{
    private readonly StayHereDbContext _context;

    public EfAgentRepository(StayHereDbContext context)
    {
        _context = context;
    }

    public async Task<Agent?> GetByIdAsync(Guid id)
    {
        return await _context.Agents.FindAsync(id);
    }

    public async Task<IEnumerable<Agent>> GetByOwnerIdAsync(Guid propertyOwnerId)
    {
        return await _context.Agents
            .Where(a => a.PropertyOwnerId == propertyOwnerId)
            .OrderBy(a => a.FullName)
            .ToListAsync();
    }

    public async Task CreateAsync(Agent agent)
    {
        _context.Agents.Add(agent);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Agent agent)
    {
        _context.Agents.Update(agent);
        await _context.SaveChangesAsync();
    }
}
