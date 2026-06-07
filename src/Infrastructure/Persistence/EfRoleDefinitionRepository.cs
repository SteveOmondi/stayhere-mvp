using Microsoft.EntityFrameworkCore;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Infrastructure.Persistence;

public class EfRoleDefinitionRepository : IRoleDefinitionRepository
{
    private readonly StayHereDbContext _db;

    public EfRoleDefinitionRepository(StayHereDbContext db) => _db = db;

    public async Task<IEnumerable<RoleDefinition>> GetAllAsync() =>
        await _db.RoleDefinitions.OrderBy(r => r.Name).ToListAsync();

    public async Task<RoleDefinition> CreateAsync(RoleDefinition definition)
    {
        definition.Id = Guid.NewGuid();
        definition.CreatedAt = DateTime.UtcNow;
        _db.RoleDefinitions.Add(definition);
        await _db.SaveChangesAsync();
        return definition;
    }
}
