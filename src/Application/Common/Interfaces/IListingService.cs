using StayHere.Application.Properties.Models;

namespace StayHere.Application.Common.Interfaces;

/// <summary>
/// Service for Listing (unit within a property) operations. All tenant-facing and search APIs use listings.
/// </summary>
public interface IListingService
{
    Task<ListingResponseDto> CreateListingAsync(Guid ownerId, CreateListingRequest request);
    Task<ListingResponseDto> CreateListingFromPropertyAsync(Guid propertyId, Guid ownerId, CreateListingFromPropertyRequest request);
    Task<ListingResponseDto?> GetListingByIdAsync(Guid id);
    Task<ListingResponseDto?> GetListingByCodeAsync(string listingCode);
    Task<PaginatedResult<ListingResponseDto>> GetAllListingsAsync(int page = 1, int pageSize = 20);
    Task<PaginatedResult<ListingResponseDto>> GetListingsByPropertyIdAsync(Guid propertyId, int page = 1, int pageSize = 20);
    Task<PaginatedResult<ListingResponseDto>> GetListingsByOwnerAsync(Guid ownerId, int page = 1, int pageSize = 20);
    Task<PaginatedResult<ListingResponseDto>> GetListingsByAgentAsync(Guid agentId, int page = 1, int pageSize = 20);
    Task<PaginatedResult<ListingResponseDto>> GetListingsByCityAsync(string city, int page = 1, int pageSize = 20);
    Task<PaginatedResult<ListingResponseDto>> GetListingsByCountyAsync(string county, int page = 1, int pageSize = 20);

    /// <summary>Elastic location: <paramref name="location"/> matches any of country, county, city, suburb, or street (case-insensitive substring).</summary>
    Task<PaginatedResult<ListingResponseDto>> GetListingsByElasticLocationAsync(string location, int page = 1, int pageSize = 20);
    Task<PaginatedResult<ListingResponseDto>> GetListingsByTypeAsync(string propertyType, int page = 1, int pageSize = 20);
    Task<PaginatedResult<ListingResponseDto>> GetListingsByListingTypeAsync(string listingType, int page = 1, int pageSize = 20);
    Task<IEnumerable<ListingResponseDto>> GetFeaturedListingsAsync(int limit = 10);
    Task<PaginatedResult<ListingResponseDto>> GetAvailableListingsAsync(int page = 1, int pageSize = 20);
    Task<PaginatedResult<ListingResponseDto>> SearchListingsAsync(ListingSearchRequest request);

    Task<ListingResponseDto?> UpdateListingAsync(Guid id, Guid requesterId, UpdateListingRequest request);

    /// <summary>Recomputes and stores the pgvector embedding via Google AI Studio. Owner or agent only.</summary>
    Task<ListingResponseDto?> RegenerateListingEmbeddingAsync(Guid id, Guid requesterId);
    Task<ListingResponseDto?> UpdateAvailabilityAsync(Guid id, Guid requesterId, UpdateAvailabilityRequest request);
    Task<ListingResponseDto?> UpdateRatingAsync(Guid id, UpdateRatingRequest request);
    Task<ListingResponseDto?> IncrementViewsAsync(Guid id);
    Task<ListingResponseDto?> UpdateFeaturedStatusAsync(Guid id, UpdateFeaturedRequest request);
    Task<ListingResponseDto?> AssignAgentAsync(Guid id, Guid ownerId, AssignAgentRequest request);
    Task<ListingResponseDto?> AssignCaretakerAsync(Guid id, Guid ownerId, AssignCaretakerRequest request);
    Task<ListingResponseDto?> RemoveAgentAsync(Guid id, Guid ownerId);
    Task<ListingResponseDto?> RemoveCaretakerAsync(Guid id, Guid ownerId);

    Task<bool> DeleteListingAsync(Guid id, Guid requesterId);
}
