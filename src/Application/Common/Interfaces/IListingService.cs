using StayHere.Application.Properties.Models;

namespace StayHere.Application.Common.Interfaces;

/// <summary>
/// Service for Listing (unit within a property) operations. All tenant-facing and search APIs use listings.
/// </summary>
public interface IListingService
{
    Task<ListingDto> CreateListingAsync(Guid ownerId, CreateListingRequest request);
    Task<ListingDto> CreateListingFromPropertyAsync(Guid propertyId, Guid ownerId, CreateListingFromPropertyRequest request);
    Task<ListingDto?> GetListingByIdAsync(Guid id);
    Task<ListingDto?> GetListingByCodeAsync(string listingCode);
    Task<PaginatedResult<ListingListDto>> GetAllListingsAsync(int page = 1, int pageSize = 20);
    Task<PaginatedResult<ListingListDto>> GetListingsByPropertyIdAsync(Guid propertyId, int page = 1, int pageSize = 20);
    Task<PaginatedResult<ListingListDto>> GetListingsByOwnerAsync(Guid ownerId, int page = 1, int pageSize = 20);
    Task<PaginatedResult<ListingListDto>> GetListingsByAgentAsync(Guid agentId, int page = 1, int pageSize = 20);
    Task<PaginatedResult<ListingListDto>> GetListingsByCityAsync(string city, int page = 1, int pageSize = 20);
    Task<PaginatedResult<ListingListDto>> GetListingsByCountyAsync(string county, int page = 1, int pageSize = 20);

    /// <summary>Elastic location: <paramref name="location"/> matches any of country, county, city, suburb, or street (case-insensitive substring).</summary>
    Task<PaginatedResult<ListingListDto>> GetListingsByElasticLocationAsync(string location, int page = 1, int pageSize = 20);
    Task<PaginatedResult<ListingListDto>> GetListingsByTypeAsync(string propertyType, int page = 1, int pageSize = 20);
    Task<PaginatedResult<ListingListDto>> GetListingsByListingTypeAsync(string listingType, int page = 1, int pageSize = 20);
    Task<IEnumerable<ListingListDto>> GetFeaturedListingsAsync(int limit = 10);
    Task<PaginatedResult<ListingListDto>> GetAvailableListingsAsync(int page = 1, int pageSize = 20);
    Task<PaginatedResult<ListingListDto>> SearchListingsAsync(ListingSearchRequest request);

    Task<ListingDto?> UpdateListingAsync(Guid id, Guid requesterId, UpdateListingRequest request);

    /// <summary>Recomputes and stores the pgvector embedding (OpenRouter). Owner or agent only.</summary>
    Task<ListingDto?> RegenerateListingEmbeddingAsync(Guid id, Guid requesterId);
    Task<ListingDto?> UpdateAvailabilityAsync(Guid id, Guid requesterId, UpdateAvailabilityRequest request);
    Task<ListingDto?> UpdateRatingAsync(Guid id, UpdateRatingRequest request);
    Task<ListingDto?> IncrementViewsAsync(Guid id);
    Task<ListingDto?> UpdateFeaturedStatusAsync(Guid id, UpdateFeaturedRequest request);
    Task<ListingDto?> AssignAgentAsync(Guid id, Guid ownerId, AssignAgentRequest request);
    Task<ListingDto?> AssignCaretakerAsync(Guid id, Guid ownerId, AssignCaretakerRequest request);
    Task<ListingDto?> RemoveAgentAsync(Guid id, Guid ownerId);
    Task<ListingDto?> RemoveCaretakerAsync(Guid id, Guid ownerId);

    Task<bool> DeleteListingAsync(Guid id, Guid requesterId);
}
