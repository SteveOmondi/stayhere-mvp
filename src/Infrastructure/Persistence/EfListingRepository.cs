using Microsoft.EntityFrameworkCore;
using Npgsql;
using Pgvector;
using StayHere.Domain;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Infrastructure.Persistence;

public class EfListingRepository : IListingRepository
{
    private readonly StayHereDbContext _context;

    public EfListingRepository(StayHereDbContext context)
    {
        _context = context;
    }

    public async Task<Listing?> GetByIdAsync(Guid id)
    {
        return await _context.Listings.FindAsync(id);
    }

    public async Task<Listing?> GetByListingCodeAsync(string listingCode)
    {
        return await _context.Listings
            .FirstOrDefaultAsync(l => l.ListingCode == listingCode);
    }

    public async Task<IEnumerable<Listing>> GetAllAsync(int page = 1, int pageSize = 20)
    {
        return await _context.Listings
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<IEnumerable<Listing>> GetByPropertyIdAsync(Guid propertyId)
    {
        return await _context.Listings
            .Where(l => l.PropertyId == propertyId)
            .OrderBy(l => l.FloorNumber)
            .ThenBy(l => l.UnitNumber)
            .ToListAsync();
    }

    public async Task<IEnumerable<Listing>> GetByOwnerIdAsync(Guid ownerId)
    {
        return await _context.Listings
            .Where(l => l.OwnerId == ownerId)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Listing>> GetByAgentIdAsync(Guid agentId)
    {
        return await _context.Listings
            .Where(l => l.AgentId == agentId)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Listing>> GetByCaretakerIdAsync(Guid caretakerId)
    {
        return await _context.Listings
            .Where(l => l.CaretakerId == caretakerId)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Listing>> GetByCityAsync(string city, int page = 1, int pageSize = 20)
    {
        return await _context.Listings
            .Where(l => l.Location.City.ToLower() == city.ToLower())
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<IEnumerable<Listing>> GetByCountyAsync(string county, int page = 1, int pageSize = 20)
    {
        return await _context.Listings
            .Where(l => l.Location.County.ToLower() == county.ToLower())
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<IEnumerable<Listing>> GetByPropertyTypeAsync(PropertyType propertyType, int page = 1, int pageSize = 20)
    {
        return await _context.Listings
            .Where(l => l.PropertyType == propertyType)
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<IEnumerable<Listing>> GetByListingTypeAsync(ListingType listingType, int page = 1, int pageSize = 20)
    {
        return await _context.Listings
            .Where(l => l.ListingType == listingType)
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<IEnumerable<Listing>> GetFeaturedAsync(int limit = 10)
    {
        return await _context.Listings
            .Where(l => l.IsFeatured && l.AvailabilityStatus == AvailabilityStatus.Available)
            .OrderByDescending(l => l.RecommendedScore)
            .ThenByDescending(l => l.Rating)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<IEnumerable<Listing>> GetAvailableAsync(int page = 1, int pageSize = 20)
    {
        return await _context.Listings
            .Where(l => l.AvailabilityStatus == AvailabilityStatus.Available)
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<IEnumerable<Listing>> SearchAsync(ListingSearchCriteria criteria)
    {
        var query = _context.Listings.AsQueryable();

        if (criteria.PropertyId.HasValue)
            query = query.Where(l => l.PropertyId == criteria.PropertyId.Value);
        if (!string.IsNullOrEmpty(criteria.City))
            query = query.Where(l => l.Location.City.ToLower() == criteria.City.ToLower());
        if (!string.IsNullOrEmpty(criteria.County))
            query = query.Where(l => l.Location.County.ToLower() == criteria.County.ToLower());
        if (!string.IsNullOrEmpty(criteria.Country))
            query = query.Where(l => l.Location.Country.ToLower() == criteria.Country.ToLower());
        if (!string.IsNullOrWhiteSpace(criteria.Suburb))
        {
            var s = criteria.Suburb.Trim().ToLowerInvariant();
            query = query.Where(l => l.Location.Suburb != null && l.Location.Suburb.ToLower().Contains(s));
        }

        if (!string.IsNullOrWhiteSpace(criteria.Street))
        {
            var s = criteria.Street.Trim().ToLowerInvariant();
            query = query.Where(l => l.Location.Street != null && l.Location.Street.ToLower().Contains(s));
        }

        if (!string.IsNullOrWhiteSpace(criteria.LocationText))
        {
            var t = criteria.LocationText.Trim().ToLowerInvariant();
            query = query.Where(l =>
                l.Location.Country.ToLower().Contains(t) ||
                l.Location.County.ToLower().Contains(t) ||
                l.Location.City.ToLower().Contains(t) ||
                (l.Location.Suburb != null && l.Location.Suburb.ToLower().Contains(t)) ||
                (l.Location.Street != null && l.Location.Street.ToLower().Contains(t)));
        }

        if (criteria.PropertyType.HasValue)
            query = query.Where(l => l.PropertyType == criteria.PropertyType.Value);
        if (criteria.ListingType.HasValue)
            query = query.Where(l => l.ListingType == criteria.ListingType.Value);
        if (criteria.MinPrice.HasValue)
            query = query.Where(l => l.Price >= criteria.MinPrice.Value);
        if (criteria.MaxPrice.HasValue)
            query = query.Where(l => l.Price <= criteria.MaxPrice.Value);
        if (criteria.MinBedrooms.HasValue)
            query = query.Where(l => l.Bedrooms >= criteria.MinBedrooms.Value);
        if (criteria.MaxBedrooms.HasValue)
            query = query.Where(l => l.Bedrooms <= criteria.MaxBedrooms.Value);
        if (criteria.MinBathrooms.HasValue)
            query = query.Where(l => l.Bathrooms >= criteria.MinBathrooms.Value);
        if (criteria.IsFurnished.HasValue)
            query = query.Where(l => l.IsFurnished == criteria.IsFurnished.Value);
        if (criteria.AvailabilityStatus.HasValue)
            query = query.Where(l => l.AvailabilityStatus == criteria.AvailabilityStatus.Value);
        if (criteria.IsFeatured.HasValue)
            query = query.Where(l => l.IsFeatured == criteria.IsFeatured.Value);

        query = criteria.SortBy?.ToLower() switch
        {
            "price" => criteria.SortDescending ? query.OrderByDescending(l => l.Price) : query.OrderBy(l => l.Price),
            "rating" => criteria.SortDescending ? query.OrderByDescending(l => l.Rating) : query.OrderBy(l => l.Rating),
            "views" => criteria.SortDescending ? query.OrderByDescending(l => l.Views) : query.OrderBy(l => l.Views),
            "bedrooms" => criteria.SortDescending ? query.OrderByDescending(l => l.Bedrooms) : query.OrderBy(l => l.Bedrooms),
            "listed_date" => criteria.SortDescending ? query.OrderByDescending(l => l.ListedDate) : query.OrderBy(l => l.ListedDate),
            _ => criteria.SortDescending ? query.OrderByDescending(l => l.CreatedAt) : query.OrderBy(l => l.CreatedAt)
        };

        return await query
            .Skip((criteria.Page - 1) * criteria.PageSize)
            .Take(criteria.PageSize)
            .ToListAsync();
    }

    public async Task<int> GetTotalCountAsync()
    {
        return await _context.Listings.CountAsync();
    }

    public async Task CreateAsync(Listing listing)
    {
        _context.Listings.Add(listing);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Listing listing)
    {
        _context.Listings.Update(listing);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var listing = await _context.Listings.FindAsync(id);
        if (listing != null)
        {
            _context.Listings.Remove(listing);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<string> GenerateListingCodeAsync()
    {
        var count = await _context.Listings.CountAsync();
        return $"L{(count + 1001):D4}";
    }

    public async Task<IReadOnlyList<(Listing Listing, double Similarity)>> SearchByEmbeddingSimilarityAsync(
        float[] queryEmbedding,
        int topK,
        CancellationToken cancellationToken = default)
    {
        if (queryEmbedding.Length != StayHereEmbeddingDimensions.Default)
            throw new ArgumentException($"Query embedding must have length {StayHereEmbeddingDimensions.Default}.", nameof(queryEmbedding));

        var conn = (NpgsqlConnection)_context.Database.GetDbConnection();
        await _context.Database.OpenConnectionAsync(cancellationToken);

        var ids = new List<Guid>();
        var sims = new List<double>();

        await using (var cmd = new NpgsqlCommand(
            """
            SELECT id, (1 - (embedding <=> @q::vector))::double precision AS sim
            FROM listings
            WHERE embedding IS NOT NULL
              AND availability_status = 'Available'
            ORDER BY embedding <=> @q::vector
            LIMIT @lim
            """,
            conn))
        {
            cmd.Parameters.AddWithValue("q", new Vector(queryEmbedding));
            cmd.Parameters.AddWithValue("lim", topK);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                ids.Add(reader.GetGuid(0));
                sims.Add(reader.GetDouble(1));
            }
        }

        if (ids.Count == 0)
            return Array.Empty<(Listing, double)>();

        var listings = await _context.Listings
            .Where(l => ids.Contains(l.Id))
            .ToListAsync(cancellationToken);

        var result = new List<(Listing, double)>();
        for (var i = 0; i < ids.Count; i++)
        {
            var listing = listings.FirstOrDefault(l => l.Id == ids[i]);
            if (listing != null)
                result.Add((listing, sims[i]));
        }

        return result;
    }
}
