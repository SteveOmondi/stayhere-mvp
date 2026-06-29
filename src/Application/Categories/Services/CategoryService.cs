using StayHere.Application.Categories.Models;
using StayHere.Application.Common.Interfaces;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Application.Categories.Services;

public class CategoryService : ICategoryService
{
    private readonly ICategoryRepository _categoryRepository;

    public CategoryService(ICategoryRepository categoryRepository)
    {
        _categoryRepository = categoryRepository;
    }

    public async Task<CategoryDto> CreateCategoryAsync(CreateCategoryRequest request)
    {
        var category = new Category
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Slug = request.Slug,
            Description = request.Description,
            IconUrl = request.IconUrl,
            IsActive = request.IsActive,
            SortOrder = request.SortOrder,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _categoryRepository.CreateAsync(category);
        return MapToDto(category);
    }

    public async Task<CategoryDto?> GetCategoryByIdAsync(Guid id)
    {
        var category = await _categoryRepository.GetByIdAsync(id);
        return category == null ? null : MapToDto(category);
    }

    public async Task<IEnumerable<CategoryDto>> GetAllCategoriesAsync()
    {
        var categories = await _categoryRepository.GetAllAsync();
        return categories.Select(MapToDto);
    }

    public async Task<IEnumerable<CategoryDto>> GetActiveCategoriesAsync()
    {
        var categories = await _categoryRepository.GetActiveAsync();
        return categories.Select(MapToDto);
    }

    public async Task<CategoryDto?> UpdateCategoryAsync(Guid id, UpdateCategoryRequest request)
    {
        var category = await _categoryRepository.GetByIdAsync(id);
        if (category == null) return null;

        if (request.Name != null) category.Name = request.Name;
        if (request.Slug != null) category.Slug = request.Slug;
        if (request.Description != null) category.Description = request.Description;
        if (request.IconUrl != null) category.IconUrl = request.IconUrl;
        if (request.IsActive.HasValue) category.IsActive = request.IsActive.Value;
        if (request.SortOrder.HasValue) category.SortOrder = request.SortOrder.Value;
        category.UpdatedAt = DateTime.UtcNow;

        await _categoryRepository.UpdateAsync(category);
        return MapToDto(category);
    }

    public async Task<bool> DeleteCategoryAsync(Guid id)
    {
        var category = await _categoryRepository.GetByIdAsync(id);
        if (category == null) return false;

        await _categoryRepository.DeleteAsync(id);
        return true;
    }

    private static CategoryDto MapToDto(Category c) =>
        new(c.Id, c.Name, c.Slug, c.Description, c.IconUrl, c.IsActive, c.SortOrder, c.CreatedAt, c.UpdatedAt);
}
