using StayHere.Domain.Entities;

namespace StayHere.Domain.Repositories;

public interface IAgentRepository
{
    Task<Agent?> GetByIdAsync(Guid id);
    Task<IEnumerable<Agent>> GetByOwnerIdAsync(Guid propertyOwnerId);
    Task CreateAsync(Agent agent);
    Task UpdateAsync(Agent agent);
}
