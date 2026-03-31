using Microsoft.EntityFrameworkCore;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Infrastructure.Persistence;

public class EfCustomerRepository : ICustomerRepository
{
    private readonly StayHereDbContext _db;

    public EfCustomerRepository(StayHereDbContext db)
    {
        _db = db;
    }

    public async Task<Customer> AddAsync(Customer customer, CancellationToken cancellationToken = default)
    {
        _db.Customers.Add(customer);
        await _db.SaveChangesAsync(cancellationToken);
        return customer;
    }

    public async Task<Customer?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _db.Customers
            .Include(c => c.Properties)
            .Include(c => c.Documents)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
    }

    public async Task<Customer?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _db.Customers
            .FirstOrDefaultAsync(c => c.UserId == userId, cancellationToken);
    }

    public Task<Customer?> GetByPhoneAsync(string phone, CancellationToken cancellationToken = default) =>
        _db.Customers.FirstOrDefaultAsync(c => c.Phone == phone, cancellationToken);

    public async Task<IReadOnlyList<Customer>> GetByRegionAsync(Guid? countryId, Guid? cityId, CancellationToken cancellationToken = default)
    {
        var query = _db.Customers.AsQueryable();
        if (countryId.HasValue)
        {
            query = query.Where(c => c.CountryId == countryId);
        }
        if (cityId.HasValue)
        {
            query = query.Where(c => c.CityId == cityId);
        }

        return await query.ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Customer>> GetByListingAsync(Guid listingId, CancellationToken cancellationToken = default)
    {
        var customers = await _db.CustomerProperties
            .Where(cp => cp.ListingId == listingId)
            .Select(cp => cp.CustomerId)
            .Distinct()
            .ToListAsync(cancellationToken);

        return await _db.Customers
            .Where(c => customers.Contains(c.Id))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Customer>> GetAllAsync(CancellationToken cancellationToken = default) =>
        await _db.Customers.ToListAsync(cancellationToken);

    public async Task UpdateAsync(Customer customer, CancellationToken cancellationToken = default)
    {
        _db.Customers.Update(customer);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task DeactivateAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (customer is null) return;
        customer.AccountStatus = "Inactive";
        customer.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
    }
}

