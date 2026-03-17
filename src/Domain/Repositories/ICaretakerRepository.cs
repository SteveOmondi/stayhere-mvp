using StayHere.Domain.Entities;

namespace StayHere.Domain.Repositories;

public interface ICaretakerRepository
{
    Task<Caretaker?> GetByIdAsync(Guid id);
    Task<IEnumerable<Caretaker>> GetByOwnerIdAsync(Guid propertyOwnerId);
    Task CreateAsync(Caretaker caretaker);
    Task UpdateAsync(Caretaker caretaker);
}
