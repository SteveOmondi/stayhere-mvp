using StayHere.Domain.Entities;

namespace StayHere.Domain.Repositories;

public interface IRoleDefinitionRepository
{
    Task<IEnumerable<RoleDefinition>> GetAllAsync();
    Task<RoleDefinition> CreateAsync(RoleDefinition definition);
}
