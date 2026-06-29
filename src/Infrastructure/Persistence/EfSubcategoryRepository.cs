using Microsoft.EntityFrameworkCore;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Infrastructure.Persistence;

public class EfSubcategoryRepository : ISubcategoryRepository
{
    private readonly StayHereDbContext _context;

    public EfSubcategoryRepository(StayHereDbContext context) => _context = context;

    public async Task<Subcategory?> GetByIdAsync(Guid id) =>
        await _context.Subcategories.FindAsync(id);

    public async Task<IEnumerable<Subcategory>> GetAllAsync() =>
        await _context.Subcategories
            .OrderBy(s => s.SortOrder).ThenBy(s => s.Name)
            .ToListAsync();

    public async Task<IEnumerable<Subcategory>> GetActiveAsync() =>
        await _context.Subcategories
            .Where(s => s.IsActive)
            .OrderBy(s => s.SortOrder).ThenBy(s => s.Name)
            .ToListAsync();

    public async Task<IEnumerable<Subcategory>> GetByCategoryIdAsync(Guid categoryId) =>
        await _context.Subcategories
            .Where(s => s.CategoryId == categoryId && s.IsActive)
            .OrderBy(s => s.SortOrder).ThenBy(s => s.Name)
            .ToListAsync();

    public async Task<IEnumerable<Subcategory>> GetByCityAsync(string city) =>
        await _context.Subcategories
            .Where(s => s.City.ToLower() == city.ToLower())
            .OrderBy(s => s.SortOrder).ThenBy(s => s.Name)
            .ToListAsync();

    public async Task<IEnumerable<Subcategory>> GetByCountryAsync(string country) =>
        await _context.Subcategories
            .Where(s => s.Country.ToLower() == country.ToLower())
            .OrderBy(s => s.SortOrder).ThenBy(s => s.Name)
            .ToListAsync();

    public async Task CreateAsync(Subcategory subcategory)
    {
        _context.Subcategories.Add(subcategory);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Subcategory subcategory)
    {
        _context.Subcategories.Update(subcategory);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var subcategory = await _context.Subcategories.FindAsync(id);
        if (subcategory != null)
        {
            subcategory.IsActive = false;
            subcategory.UpdatedAt = DateTime.UtcNow;
            _context.Subcategories.Update(subcategory);
            await _context.SaveChangesAsync();
        }
    }
}
