using StayHere.Domain.Entities;

namespace StayHere.Domain.Repositories;

public interface ISubcategoryRepository
{
    Task<Subcategory?> GetByIdAsync(Guid id);
    Task<IEnumerable<Subcategory>> GetAllAsync();
    Task<IEnumerable<Subcategory>> GetActiveAsync();
    Task<IEnumerable<Subcategory>> GetByCategoryIdAsync(Guid categoryId);
    Task<IEnumerable<Subcategory>> GetByCityAsync(string city);
    Task<IEnumerable<Subcategory>> GetByCountryAsync(string country);
    Task CreateAsync(Subcategory subcategory);
    Task UpdateAsync(Subcategory subcategory);
    Task DeleteAsync(Guid id);
}
