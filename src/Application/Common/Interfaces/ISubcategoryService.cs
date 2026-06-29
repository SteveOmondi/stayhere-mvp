using StayHere.Application.Categories.Models;

namespace StayHere.Application.Common.Interfaces;

public interface ISubcategoryService
{
    Task<SubcategoryDto> CreateSubcategoryAsync(CreateSubcategoryRequest request);
    Task<SubcategoryDto?> GetSubcategoryByIdAsync(Guid id);
    Task<IEnumerable<SubcategoryDto>> GetAllSubcategoriesAsync();
    Task<IEnumerable<SubcategoryDto>> GetActiveSubcategoriesAsync();
    Task<IEnumerable<SubcategoryDto>> GetSubcategoriesByCategoryIdAsync(Guid categoryId);
    Task<IEnumerable<SubcategoryDto>> GetSubcategoriesByCityAsync(string city);
    Task<IEnumerable<SubcategoryDto>> GetSubcategoriesByCountryAsync(string country);
    Task<SubcategoryDto?> UpdateSubcategoryAsync(Guid id, UpdateSubcategoryRequest request);
    Task<bool> DeleteSubcategoryAsync(Guid id);
}
