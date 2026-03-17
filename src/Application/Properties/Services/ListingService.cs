using StayHere.Application.Common.Interfaces;
using StayHere.Application.Properties.Models;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Application.Properties.Services;

public class ListingService : IListingService
{
    private readonly IListingRepository _listingRepository;
    private readonly IPropertyRepository _propertyRepository;

    public ListingService(IListingRepository listingRepository, IPropertyRepository propertyRepository)
    {
        _listingRepository = listingRepository;
        _propertyRepository = propertyRepository;
    }

    public async Task<ListingDto> CreateListingAsync(Guid ownerId, CreateListingRequest request)
    {
        var property = await _propertyRepository.GetByIdAsync(request.PropertyId);
        if (property == null)
            throw new ArgumentException("Property not found", nameof(request.PropertyId));
        if (property.OwnerId != ownerId)
            throw new UnauthorizedAccessException("You don't own this property");

        var listingCode = await _listingRepository.GenerateListingCodeAsync();
        var location = request.Location ?? new LocationDto(
            property.Location.Country,
            property.Location.County,
            property.Location.City,
            property.Location.Suburb,
            property.Location.Street,
            property.Location.Latitude,
            property.Location.Longitude
        );

        var listing = new Listing
        {
            Id = Guid.NewGuid(),
            ListingCode = listingCode,
            PropertyId = request.PropertyId,
            UnitNumber = request.UnitNumber,
            FloorNumber = request.FloorNumber,
            Title = request.Title,
            Description = request.Description,
            Price = request.Price,
            PriceCurrency = request.PriceCurrency ?? "KES",
            PropertyType = ParsePropertyType(request.PropertyType),
            ListingType = ParseListingType(request.ListingType),
            Bedrooms = request.Bedrooms,
            Bathrooms = request.Bathrooms,
            IsFurnished = request.IsFurnished,
            Location = new PropertyLocation(location.Country, location.County, location.City, location.Suburb, location.Street, location.Latitude, location.Longitude),
            Amenities = request.Amenities ?? new List<string>(),
            Images = request.Images ?? new List<string>(),
            SizeSqft = request.SizeSqft,
            YearBuilt = request.YearBuilt,
            Developer = request.Developer,
            AvailabilityStatus = AvailabilityStatus.Available,
            Owner = new PropertyContact(request.Owner.Name, request.Owner.Phone, request.Owner.Email),
            Agent = request.Agent != null ? new PropertyContact(request.Agent.Name, request.Agent.Phone, request.Agent.Email) : null,
            OwnerId = ownerId,
            AgentId = null,
            CaretakerId = null,
            ListedDate = DateTime.UtcNow,
            Views = 0,
            Rating = 0,
            RatingCount = 0,
            IsFeatured = false,
            RecommendedScore = 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _listingRepository.CreateAsync(listing);
        return await MapToDtoAsync(listing);
    }

    public async Task<ListingDto> CreateListingFromPropertyAsync(Guid propertyId, Guid ownerId, CreateListingFromPropertyRequest request)
    {
        var property = await _propertyRepository.GetByIdAsync(propertyId);
        if (property == null)
            throw new ArgumentException("Property not found", nameof(propertyId));
        if (property.OwnerId != ownerId)
            throw new UnauthorizedAccessException("You don't own this property");

        var listingCode = await _listingRepository.GenerateListingCodeAsync();
        var location = request.Location ?? new LocationDto(
            property.Location.Country,
            property.Location.County,
            property.Location.City,
            property.Location.Suburb,
            property.Location.Street,
            property.Location.Latitude,
            property.Location.Longitude
        );

        var listing = new Listing
        {
            Id = Guid.NewGuid(),
            ListingCode = listingCode,
            PropertyId = propertyId,
            UnitNumber = request.UnitNumber,
            FloorNumber = request.FloorNumber,
            Title = request.Title,
            Description = request.Description,
            Price = request.Price,
            PriceCurrency = request.PriceCurrency ?? "KES",
            PropertyType = ParsePropertyType(request.PropertyType),
            ListingType = ParseListingType(request.ListingType),
            Bedrooms = request.Bedrooms,
            Bathrooms = request.Bathrooms,
            IsFurnished = request.IsFurnished,
            Location = new PropertyLocation(location.Country, location.County, location.City, location.Suburb, location.Street, location.Latitude, location.Longitude),
            Amenities = request.Amenities ?? new List<string>(),
            Images = request.Images ?? new List<string>(),
            SizeSqft = request.SizeSqft,
            YearBuilt = request.YearBuilt,
            Developer = request.Developer,
            AvailabilityStatus = AvailabilityStatus.Available,
            Owner = new PropertyContact(request.Owner.Name, request.Owner.Phone, request.Owner.Email),
            Agent = request.Agent != null ? new PropertyContact(request.Agent.Name, request.Agent.Phone, request.Agent.Email) : null,
            OwnerId = ownerId,
            AgentId = null,
            CaretakerId = null,
            ListedDate = DateTime.UtcNow,
            Views = 0,
            Rating = 0,
            RatingCount = 0,
            IsFeatured = false,
            RecommendedScore = 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _listingRepository.CreateAsync(listing);
        return await MapToDtoAsync(listing);
    }

    public async Task<ListingDto?> GetListingByIdAsync(Guid id)
    {
        var listing = await _listingRepository.GetByIdAsync(id);
        return listing == null ? null : await MapToDtoAsync(listing);
    }

    public async Task<ListingDto?> GetListingByCodeAsync(string listingCode)
    {
        var listing = await _listingRepository.GetByListingCodeAsync(listingCode);
        return listing == null ? null : await MapToDtoAsync(listing);
    }

    public async Task<PaginatedResult<ListingListDto>> GetAllListingsAsync(int page = 1, int pageSize = 20)
    {
        var listings = await _listingRepository.GetAllAsync(page, pageSize);
        var totalCount = await _listingRepository.GetTotalCountAsync();
        return CreatePaginatedResult(listings, totalCount, page, pageSize);
    }

    public async Task<PaginatedResult<ListingListDto>> GetListingsByPropertyIdAsync(Guid propertyId, int page = 1, int pageSize = 20)
    {
        var listings = await _listingRepository.GetByPropertyIdAsync(propertyId);
        var list = listings.ToList();
        var paged = list.Skip((page - 1) * pageSize).Take(pageSize);
        return CreatePaginatedResult(paged, list.Count, page, pageSize);
    }

    public async Task<PaginatedResult<ListingListDto>> GetListingsByOwnerAsync(Guid ownerId, int page = 1, int pageSize = 20)
    {
        var listings = await _listingRepository.GetByOwnerIdAsync(ownerId);
        var list = listings.ToList();
        var paged = list.Skip((page - 1) * pageSize).Take(pageSize);
        return CreatePaginatedResult(paged, list.Count, page, pageSize);
    }

    public async Task<PaginatedResult<ListingListDto>> GetListingsByAgentAsync(Guid agentId, int page = 1, int pageSize = 20)
    {
        var listings = await _listingRepository.GetByAgentIdAsync(agentId);
        var list = listings.ToList();
        var paged = list.Skip((page - 1) * pageSize).Take(pageSize);
        return CreatePaginatedResult(paged, list.Count, page, pageSize);
    }

    public async Task<PaginatedResult<ListingListDto>> GetListingsByCityAsync(string city, int page = 1, int pageSize = 20)
    {
        var listings = await _listingRepository.GetByCityAsync(city, page, pageSize);
        return CreatePaginatedResult(listings, listings.Count(), page, pageSize);
    }

    public async Task<PaginatedResult<ListingListDto>> GetListingsByCountyAsync(string county, int page = 1, int pageSize = 20)
    {
        var listings = await _listingRepository.GetByCountyAsync(county, page, pageSize);
        return CreatePaginatedResult(listings, listings.Count(), page, pageSize);
    }

    public async Task<PaginatedResult<ListingListDto>> GetListingsByTypeAsync(string propertyType, int page = 1, int pageSize = 20)
    {
        var type = ParsePropertyType(propertyType);
        var listings = await _listingRepository.GetByPropertyTypeAsync(type, page, pageSize);
        return CreatePaginatedResult(listings, listings.Count(), page, pageSize);
    }

    public async Task<PaginatedResult<ListingListDto>> GetListingsByListingTypeAsync(string listingType, int page = 1, int pageSize = 20)
    {
        var type = ParseListingType(listingType);
        var listings = await _listingRepository.GetByListingTypeAsync(type, page, pageSize);
        return CreatePaginatedResult(listings, listings.Count(), page, pageSize);
    }

    public async Task<IEnumerable<ListingListDto>> GetFeaturedListingsAsync(int limit = 10)
    {
        var listings = await _listingRepository.GetFeaturedAsync(limit);
        return listings.Select(l => MapToListDto(l));
    }

    public async Task<PaginatedResult<ListingListDto>> GetAvailableListingsAsync(int page = 1, int pageSize = 20)
    {
        var listings = await _listingRepository.GetAvailableAsync(page, pageSize);
        return CreatePaginatedResult(listings, listings.Count(), page, pageSize);
    }

    public async Task<PaginatedResult<ListingListDto>> SearchListingsAsync(ListingSearchRequest request)
    {
        var criteria = new ListingSearchCriteria
        {
            PropertyId = request.PropertyId,
            City = request.City,
            County = request.County,
            Country = request.Country,
            PropertyType = string.IsNullOrEmpty(request.PropertyType) ? null : ParsePropertyType(request.PropertyType),
            ListingType = string.IsNullOrEmpty(request.ListingType) ? null : ParseListingType(request.ListingType),
            MinPrice = request.MinPrice,
            MaxPrice = request.MaxPrice,
            MinBedrooms = request.MinBedrooms,
            MaxBedrooms = request.MaxBedrooms,
            MinBathrooms = request.MinBathrooms,
            IsFurnished = request.IsFurnished,
            AvailabilityStatus = string.IsNullOrEmpty(request.AvailabilityStatus) ? null : ParseAvailabilityStatus(request.AvailabilityStatus),
            IsFeatured = request.IsFeatured,
            Page = request.Page,
            PageSize = request.PageSize,
            SortBy = request.SortBy,
            SortDescending = request.SortDescending
        };
        var listings = await _listingRepository.SearchAsync(criteria);
        return CreatePaginatedResult(listings, listings.Count(), request.Page, request.PageSize);
    }

    public async Task<ListingDto?> UpdateListingAsync(Guid id, Guid requesterId, UpdateListingRequest request)
    {
        var listing = await _listingRepository.GetByIdAsync(id);
        if (listing == null) return null;
        if (listing.OwnerId != requesterId && listing.AgentId != requesterId)
            throw new UnauthorizedAccessException("You don't have permission to update this listing");

        if (request.Title != null) listing.Title = request.Title;
        if (request.Description != null) listing.Description = request.Description;
        if (request.Price.HasValue) listing.Price = request.Price.Value;
        if (request.PriceCurrency != null) listing.PriceCurrency = request.PriceCurrency;
        if (request.PropertyType != null) listing.PropertyType = ParsePropertyType(request.PropertyType);
        if (request.ListingType != null) listing.ListingType = ParseListingType(request.ListingType);
        if (request.Bedrooms.HasValue) listing.Bedrooms = request.Bedrooms.Value;
        if (request.Bathrooms.HasValue) listing.Bathrooms = request.Bathrooms.Value;
        if (request.IsFurnished.HasValue) listing.IsFurnished = request.IsFurnished.Value;
        if (request.Location != null)
            listing.Location = new PropertyLocation(request.Location.Country, request.Location.County, request.Location.City, request.Location.Suburb, request.Location.Street, request.Location.Latitude, request.Location.Longitude);
        if (request.Amenities != null) listing.Amenities = request.Amenities;
        if (request.Images != null) listing.Images = request.Images;
        if (request.SizeSqft.HasValue) listing.SizeSqft = request.SizeSqft;
        if (request.YearBuilt.HasValue) listing.YearBuilt = request.YearBuilt;
        if (request.Developer != null) listing.Developer = request.Developer;
        if (request.AvailabilityStatus != null) listing.AvailabilityStatus = ParseAvailabilityStatus(request.AvailabilityStatus);
        if (request.Owner != null) listing.Owner = new PropertyContact(request.Owner.Name, request.Owner.Phone, request.Owner.Email);
        if (request.Agent != null) listing.Agent = new PropertyContact(request.Agent.Name, request.Agent.Phone, request.Agent.Email);
        if (request.IsFeatured.HasValue) listing.IsFeatured = request.IsFeatured.Value;
        if (request.RecommendedScore.HasValue) listing.RecommendedScore = request.RecommendedScore.Value;
        listing.UpdatedAt = DateTime.UtcNow;

        await _listingRepository.UpdateAsync(listing);
        return await MapToDtoAsync(listing);
    }

    public async Task<ListingDto?> UpdateAvailabilityAsync(Guid id, Guid requesterId, UpdateAvailabilityRequest request)
    {
        var listing = await _listingRepository.GetByIdAsync(id);
        if (listing == null) return null;
        if (listing.OwnerId != requesterId && listing.AgentId != requesterId)
            throw new UnauthorizedAccessException("You don't have permission to update this listing");
        listing.AvailabilityStatus = ParseAvailabilityStatus(request.AvailabilityStatus);
        listing.UpdatedAt = DateTime.UtcNow;
        await _listingRepository.UpdateAsync(listing);
        return await MapToDtoAsync(listing);
    }

    public async Task<ListingDto?> UpdateRatingAsync(Guid id, UpdateRatingRequest request)
    {
        var listing = await _listingRepository.GetByIdAsync(id);
        if (listing == null) return null;
        var totalRating = listing.Rating * listing.RatingCount;
        listing.RatingCount++;
        listing.Rating = (totalRating + request.NewRating) / listing.RatingCount;
        listing.UpdatedAt = DateTime.UtcNow;
        await _listingRepository.UpdateAsync(listing);
        return await MapToDtoAsync(listing);
    }

    public async Task<ListingDto?> IncrementViewsAsync(Guid id)
    {
        var listing = await _listingRepository.GetByIdAsync(id);
        if (listing == null) return null;
        listing.Views++;
        listing.UpdatedAt = DateTime.UtcNow;
        await _listingRepository.UpdateAsync(listing);
        return await MapToDtoAsync(listing);
    }

    public async Task<ListingDto?> UpdateFeaturedStatusAsync(Guid id, UpdateFeaturedRequest request)
    {
        var listing = await _listingRepository.GetByIdAsync(id);
        if (listing == null) return null;
        listing.IsFeatured = request.IsFeatured;
        listing.UpdatedAt = DateTime.UtcNow;
        await _listingRepository.UpdateAsync(listing);
        return await MapToDtoAsync(listing);
    }

    public async Task<ListingDto?> AssignAgentAsync(Guid id, Guid ownerId, AssignAgentRequest request)
    {
        var listing = await _listingRepository.GetByIdAsync(id);
        if (listing == null) return null;
        if (listing.OwnerId != ownerId)
            throw new UnauthorizedAccessException("Only the owner can assign an agent");
        listing.AgentId = request.AgentId;
        listing.Agent = new PropertyContact(request.AgentName, request.AgentPhone, request.AgentEmail);
        listing.UpdatedAt = DateTime.UtcNow;
        await _listingRepository.UpdateAsync(listing);
        return await MapToDtoAsync(listing);
    }

    public async Task<ListingDto?> AssignCaretakerAsync(Guid id, Guid ownerId, AssignCaretakerRequest request)
    {
        var listing = await _listingRepository.GetByIdAsync(id);
        if (listing == null) return null;
        if (listing.OwnerId != ownerId)
            throw new UnauthorizedAccessException("Only the owner can assign a caretaker");
        listing.CaretakerId = request.CaretakerId;
        listing.UpdatedAt = DateTime.UtcNow;
        await _listingRepository.UpdateAsync(listing);
        return await MapToDtoAsync(listing);
    }

    public async Task<ListingDto?> RemoveAgentAsync(Guid id, Guid ownerId)
    {
        var listing = await _listingRepository.GetByIdAsync(id);
        if (listing == null) return null;
        if (listing.OwnerId != ownerId)
            throw new UnauthorizedAccessException("Only the owner can remove an agent");
        listing.AgentId = null;
        listing.Agent = null;
        listing.UpdatedAt = DateTime.UtcNow;
        await _listingRepository.UpdateAsync(listing);
        return await MapToDtoAsync(listing);
    }

    public async Task<ListingDto?> RemoveCaretakerAsync(Guid id, Guid ownerId)
    {
        var listing = await _listingRepository.GetByIdAsync(id);
        if (listing == null) return null;
        if (listing.OwnerId != ownerId)
            throw new UnauthorizedAccessException("Only the owner can remove a caretaker");
        listing.CaretakerId = null;
        listing.UpdatedAt = DateTime.UtcNow;
        await _listingRepository.UpdateAsync(listing);
        return await MapToDtoAsync(listing);
    }

    public async Task<bool> DeleteListingAsync(Guid id, Guid requesterId)
    {
        var listing = await _listingRepository.GetByIdAsync(id);
        if (listing == null) return false;
        if (listing.OwnerId != requesterId)
            throw new UnauthorizedAccessException("Only the owner can delete a listing");
        await _listingRepository.DeleteAsync(id);
        return true;
    }

    private async Task<ListingDto> MapToDtoAsync(Listing listing)
    {
        var property = await _propertyRepository.GetByIdAsync(listing.PropertyId);
        return new ListingDto(
            listing.Id,
            listing.ListingCode,
            listing.PropertyId,
            property?.PropertyCode ?? "",
            property?.BuildingName ?? "",
            listing.UnitNumber,
            listing.FloorNumber,
            listing.Title,
            listing.Description,
            listing.Price,
            listing.PriceCurrency,
            listing.PropertyType.ToString(),
            listing.ListingType.ToString(),
            listing.Bedrooms,
            listing.Bathrooms,
            listing.IsFurnished,
            new LocationDto(listing.Location.Country, listing.Location.County, listing.Location.City, listing.Location.Suburb, listing.Location.Street, listing.Location.Latitude, listing.Location.Longitude),
            listing.Amenities,
            listing.Images,
            listing.SizeSqft,
            listing.YearBuilt,
            listing.Developer,
            listing.AvailabilityStatus.ToString(),
            new OwnerContactDto(listing.Owner.Name, listing.Owner.Phone, listing.Owner.Email),
            listing.Agent != null ? new AgentContactDto(listing.Agent.Name, listing.Agent.Phone, listing.Agent.Email) : null,
            listing.OwnerId,
            listing.AgentId,
            listing.CaretakerId,
            listing.ListedDate,
            listing.Views,
            listing.Rating,
            listing.RatingCount,
            listing.IsFeatured,
            listing.RecommendedScore,
            listing.CreatedAt,
            listing.UpdatedAt
        );
    }

    private static ListingListDto MapToListDto(Listing listing, string? buildingName = null)
    {
        return new ListingListDto(
            listing.Id,
            listing.ListingCode,
            listing.PropertyId,
            buildingName ?? "",
            listing.UnitNumber,
            listing.FloorNumber,
            listing.Title,
            listing.Price,
            listing.PriceCurrency,
            listing.PropertyType.ToString(),
            listing.ListingType.ToString(),
            listing.Bedrooms,
            listing.Bathrooms,
            listing.Location.City,
            listing.Location.County,
            listing.Images.FirstOrDefault(),
            listing.AvailabilityStatus.ToString(),
            listing.Views,
            listing.Rating,
            listing.IsFeatured,
            listing.ListedDate
        );
    }

    private async Task<PaginatedResult<ListingListDto>> CreatePaginatedResultWithBuildingNames(IEnumerable<Listing> listings, int totalCount, int page, int pageSize)
    {
        var list = listings.ToList();
        var propertyIds = list.Select(l => l.PropertyId).Distinct().ToList();
        var properties = new Dictionary<Guid, Property>();
        foreach (var id in propertyIds)
        {
            var p = await _propertyRepository.GetByIdAsync(id);
            if (p != null) properties[id] = p;
        }
        var items = list.Select(l => MapToListDto(l, properties.GetValueOrDefault(l.PropertyId)?.BuildingName));
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
        return new PaginatedResult<ListingListDto>(items, totalCount, page, pageSize, totalPages);
    }

    private static PaginatedResult<ListingListDto> CreatePaginatedResult(IEnumerable<Listing> listings, int totalCount, int page, int pageSize)
    {
        var items = listings.Select(l => MapToListDto(l));
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
        return new PaginatedResult<ListingListDto>(items, totalCount, page, pageSize, totalPages);
    }

    private static PropertyType ParsePropertyType(string value) =>
        Enum.TryParse<PropertyType>(value, true, out var result) ? result : PropertyType.Apartment;
    private static ListingType ParseListingType(string value) =>
        Enum.TryParse<ListingType>(value, true, out var result) ? result : ListingType.Rent;
    private static AvailabilityStatus ParseAvailabilityStatus(string value) =>
        Enum.TryParse<AvailabilityStatus>(value, true, out var result) ? result : AvailabilityStatus.Available;
}
