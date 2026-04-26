using StayHere.Domain.Entities;

namespace StayHere.Domain.Repositories;

public interface IListingRepository
{
    Task<Listing?> GetByIdAsync(Guid id);
    Task<Listing?> GetByListingCodeAsync(string listingCode);
    Task<IEnumerable<Listing>> GetAllAsync(int page = 1, int pageSize = 20);
    Task<IEnumerable<Listing>> GetByPropertyIdAsync(Guid propertyId);
    Task<IEnumerable<Listing>> GetByOwnerIdAsync(Guid ownerId);
    Task<IEnumerable<Listing>> GetByAgentIdAsync(Guid agentId);
    Task<IEnumerable<Listing>> GetByCaretakerIdAsync(Guid caretakerId);
    Task<IEnumerable<Listing>> GetByCityAsync(string city, int page = 1, int pageSize = 20);
    Task<IEnumerable<Listing>> GetByCountyAsync(string county, int page = 1, int pageSize = 20);
    Task<IEnumerable<Listing>> GetByPropertyTypeAsync(PropertyType propertyType, int page = 1, int pageSize = 20);
    Task<IEnumerable<Listing>> GetByListingTypeAsync(ListingType listingType, int page = 1, int pageSize = 20);
    Task<IEnumerable<Listing>> GetFeaturedAsync(int limit = 10);
    Task<IEnumerable<Listing>> GetAvailableAsync(int page = 1, int pageSize = 20);
    Task<IEnumerable<Listing>> SearchAsync(ListingSearchCriteria criteria);
    Task<int> GetTotalCountAsync();
    Task CreateAsync(Listing listing);
    Task UpdateAsync(Listing listing);
    Task DeleteAsync(Guid id);
    Task<string> GenerateListingCodeAsync();

    /// <summary>Order by pgvector cosine distance; similarity is 1 minus distance.</summary>
    Task<IReadOnlyList<(Listing Listing, double Similarity)>> SearchByEmbeddingSimilarityAsync(
        float[] queryEmbedding,
        int topK,
        CancellationToken cancellationToken = default);
}

public class ListingSearchCriteria
{
    public Guid? PropertyId { get; set; }
    public string? City { get; set; }
    public string? County { get; set; }
    public string? Country { get; set; }
    /// <summary>Case-insensitive partial match on <see cref="Listing.Location"/> suburb.</summary>
    public string? Suburb { get; set; }
    /// <summary>Case-insensitive partial match on <see cref="Listing.Location"/> street.</summary>
    public string? Street { get; set; }
    /// <summary>Case-insensitive partial match on any of country, county, city, suburb, or street (OR).</summary>
    public string? LocationText { get; set; }
    public PropertyType? PropertyType { get; set; }
    public ListingType? ListingType { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public int? MinBedrooms { get; set; }
    public int? MaxBedrooms { get; set; }
    public int? MinBathrooms { get; set; }
    public bool? IsFurnished { get; set; }
    public AvailabilityStatus? AvailabilityStatus { get; set; }
    public bool? IsFeatured { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? SortBy { get; set; }
    public bool SortDescending { get; set; } = true;
}
