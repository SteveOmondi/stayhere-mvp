using StayHere.Application.Categories.Models;
using StayHere.Application.Common.Interfaces;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Application.Categories.Services;

public class SubcategoryService : ISubcategoryService
{
    private readonly ISubcategoryRepository _subcategoryRepository;

    public SubcategoryService(ISubcategoryRepository subcategoryRepository)
    {
        _subcategoryRepository = subcategoryRepository;
    }

    public async Task<SubcategoryDto> CreateSubcategoryAsync(CreateSubcategoryRequest request)
    {
        var subcategory = new Subcategory
        {
            Id = Guid.NewGuid(),
            CategoryId = request.CategoryId,
            Name = request.Name,
            Slug = request.Slug,
            Description = request.Description,
            IconUrl = request.IconUrl,
            Country = request.Country,
            City = request.City,
            IsActive = request.IsActive,
            SortOrder = request.SortOrder,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _subcategoryRepository.CreateAsync(subcategory);
        return MapToDto(subcategory);
    }

    public async Task<SubcategoryDto?> GetSubcategoryByIdAsync(Guid id)
    {
        var subcategory = await _subcategoryRepository.GetByIdAsync(id);
        return subcategory == null ? null : MapToDto(subcategory);
    }

    public async Task<IEnumerable<SubcategoryDto>> GetAllSubcategoriesAsync()
    {
        var subcategories = await _subcategoryRepository.GetAllAsync();
        return subcategories.Select(MapToDto);
    }

    public async Task<IEnumerable<SubcategoryDto>> GetActiveSubcategoriesAsync()
    {
        var subcategories = await _subcategoryRepository.GetActiveAsync();
        return subcategories.Select(MapToDto);
    }

    public async Task<IEnumerable<SubcategoryDto>> GetSubcategoriesByCategoryIdAsync(Guid categoryId)
    {
        var subcategories = await _subcategoryRepository.GetByCategoryIdAsync(categoryId);
        return subcategories.Select(MapToDto);
    }

    public async Task<IEnumerable<SubcategoryDto>> GetSubcategoriesByCityAsync(string city)
    {
        var subcategories = await _subcategoryRepository.GetByCityAsync(city);
        return subcategories.Select(MapToDto);
    }

    public async Task<IEnumerable<SubcategoryDto>> GetSubcategoriesByCountryAsync(string country)
    {
        var subcategories = await _subcategoryRepository.GetByCountryAsync(country);
        return subcategories.Select(MapToDto);
    }

    public async Task<SubcategoryDto?> UpdateSubcategoryAsync(Guid id, UpdateSubcategoryRequest request)
    {
        var subcategory = await _subcategoryRepository.GetByIdAsync(id);
        if (subcategory == null) return null;

        if (request.CategoryId.HasValue) subcategory.CategoryId = request.CategoryId.Value;
        if (request.Name != null) subcategory.Name = request.Name;
        if (request.Slug != null) subcategory.Slug = request.Slug;
        if (request.Description != null) subcategory.Description = request.Description;
        if (request.IconUrl != null) subcategory.IconUrl = request.IconUrl;
        if (request.Country != null) subcategory.Country = request.Country;
        if (request.City != null) subcategory.City = request.City;
        if (request.IsActive.HasValue) subcategory.IsActive = request.IsActive.Value;
        if (request.SortOrder.HasValue) subcategory.SortOrder = request.SortOrder.Value;
        subcategory.UpdatedAt = DateTime.UtcNow;

        await _subcategoryRepository.UpdateAsync(subcategory);
        return MapToDto(subcategory);
    }

    public async Task<bool> DeleteSubcategoryAsync(Guid id)
    {
        var subcategory = await _subcategoryRepository.GetByIdAsync(id);
        if (subcategory == null) return false;

        await _subcategoryRepository.DeleteAsync(id);
        return true;
    }

    private static SubcategoryDto MapToDto(Subcategory s) =>
        new(s.Id, s.CategoryId, s.Name, s.Slug, s.Description, s.IconUrl, s.Country, s.City, s.IsActive, s.SortOrder, s.CreatedAt, s.UpdatedAt);
}
