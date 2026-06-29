using StayHere.Domain.Entities;

namespace StayHere.Domain.Repositories;

public interface ICategoryRepository
{
    Task<Category?> GetByIdAsync(Guid id);
    Task<IEnumerable<Category>> GetAllAsync();
    Task<IEnumerable<Category>> GetActiveAsync();
    Task CreateAsync(Category category);
    Task UpdateAsync(Category category);
    Task DeleteAsync(Guid id);
}
