using StayHere.Domain.Entities;

namespace StayHere.Domain.Repositories;

public interface IUserTypeDefinitionRepository
{
    Task<IEnumerable<UserTypeDefinition>> GetAllAsync();
    Task<UserTypeDefinition> CreateAsync(UserTypeDefinition definition);
}
