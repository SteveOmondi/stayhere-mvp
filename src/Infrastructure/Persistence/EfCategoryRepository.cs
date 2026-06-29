using Microsoft.EntityFrameworkCore;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Infrastructure.Persistence;

public class EfCategoryRepository : ICategoryRepository
{
    private readonly StayHereDbContext _context;

    public EfCategoryRepository(StayHereDbContext context) => _context = context;

    public async Task<Category?> GetByIdAsync(Guid id) =>
        await _context.Categories.FindAsync(id);

    public async Task<IEnumerable<Category>> GetAllAsync() =>
        await _context.Categories
            .OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
            .ToListAsync();

    public async Task<IEnumerable<Category>> GetActiveAsync() =>
        await _context.Categories
            .Where(c => c.IsActive)
            .OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
            .ToListAsync();

    public async Task CreateAsync(Category category)
    {
        _context.Categories.Add(category);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Category category)
    {
        _context.Categories.Update(category);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category != null)
        {
            category.IsActive = false;
            category.UpdatedAt = DateTime.UtcNow;
            _context.Categories.Update(category);
            await _context.SaveChangesAsync();
        }
    }
}
