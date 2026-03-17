using StayHere.Application.Categories.Models;

namespace StayHere.Application.Common.Interfaces;

public interface ICategoryService
{
    Task<CategoryDto> CreateCategoryAsync(CreateCategoryRequest request);
    Task<CategoryDto?> GetCategoryByIdAsync(Guid id);
    Task<IEnumerable<CategoryDto>> GetAllCategoriesAsync();
    Task<IEnumerable<CategoryDto>> GetCategoriesByCityAsync(string city);
    Task<IEnumerable<CategoryDto>> GetCategoriesByCountryAsync(string country);
    Task<IEnumerable<CategoryDto>> GetActiveCategoriesAsync();
    Task<CategoryDto?> UpdateCategoryAsync(Guid id, UpdateCategoryRequest request);
    Task<bool> DeleteCategoryAsync(Guid id);
}
