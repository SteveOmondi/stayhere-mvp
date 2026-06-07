using Microsoft.EntityFrameworkCore;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Infrastructure.Persistence;

public class EfUserTypeDefinitionRepository : IUserTypeDefinitionRepository
{
    private readonly StayHereDbContext _db;

    public EfUserTypeDefinitionRepository(StayHereDbContext db) => _db = db;

    public async Task<IEnumerable<UserTypeDefinition>> GetAllAsync() =>
        await _db.UserTypeDefinitions.OrderBy(u => u.Name).ToListAsync();

    public async Task<UserTypeDefinition> CreateAsync(UserTypeDefinition definition)
    {
        definition.Id = Guid.NewGuid();
        definition.CreatedAt = DateTime.UtcNow;
        _db.UserTypeDefinitions.Add(definition);
        await _db.SaveChangesAsync();
        return definition;
    }
}
