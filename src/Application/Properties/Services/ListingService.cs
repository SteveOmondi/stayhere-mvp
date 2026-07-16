using Microsoft.Extensions.Logging;
using StayHere.Application.Common.Interfaces;
using StayHere.Application.Properties.Models;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Application.Properties.Services;

public class ListingService : IListingService
{
    public const int MaxListingImages = 15;

    private readonly IListingRepository _listingRepository;
    private readonly IPropertyRepository _propertyRepository;
    private readonly IPropertyTermsRepository _termsRepository;
    private readonly IEmbeddingService _embeddingService;
    private readonly ICategoryRepository _categoryRepository;
    private readonly ISubcategoryRepository _subcategoryRepository;
    private readonly ILogger<ListingService> _logger;

    public ListingService(
        IListingRepository listingRepository,
        IPropertyRepository propertyRepository,
        IPropertyTermsRepository termsRepository,
        IEmbeddingService embeddingService,
        ICategoryRepository categoryRepository,
        ISubcategoryRepository subcategoryRepository,
        ILogger<ListingService> logger)
    {
        _listingRepository = listingRepository;
        _propertyRepository = propertyRepository;
        _termsRepository = termsRepository;
        _embeddingService = embeddingService;
        _categoryRepository = categoryRepository;
        _subcategoryRepository = subcategoryRepository;
        _logger = logger;
    }

    private static List<string> NormalizeListingImages(IReadOnlyList<string>? images)
    {
        var list = images?
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => s.Trim())
            .ToList() ?? new List<string>();
        if (list.Count > MaxListingImages)
            throw new ArgumentException($"At most {MaxListingImages} images are allowed per listing.");
        return list;
    }

    public async Task<ListingResponseDto> CreateListingAsync(Guid ownerId, CreateListingRequest request)
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

        // Inherit shared amenities from property, merging with any request-specific ones
        var amenities = request.Amenities ?? new List<string>();
        if (property.SharedAmenities.Count > 0)
        {
            var merged = property.SharedAmenities.Union(amenities).ToList();
            amenities = merged;
        }

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
            Amenities = amenities,
            PrimaryImageUrl = request.PrimaryImageUrl,
            Images = NormalizeListingImages(request.Images),
            StructuredImages = MapToListingImages(request.StructuredImages),
            SizeSqft = request.SizeSqft,
            YearBuilt = request.YearBuilt,
            Developer = request.Developer,
            AvailabilityStatus = AvailabilityStatus.Available,
            Owner = request.Owner != null
                ? new PropertyContact(request.Owner.Name, request.Owner.Phone, request.Owner.Email)
                : new PropertyContact(string.Empty, string.Empty, null),
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
            CategoryId = request.CategoryId,
            SubcategoryId = request.SubcategoryId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _listingRepository.CreateAsync(listing);
        await TryComputeAndPersistEmbeddingAsync(listing);
        return await MapToResponseAsync(listing, property);
    }

    public async Task<ListingResponseDto> CreateListingFromPropertyAsync(Guid propertyId, Guid ownerId, CreateListingFromPropertyRequest request)
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

        var amenities = request.Amenities ?? new List<string>();
        if (property.SharedAmenities.Count > 0)
        {
            amenities = property.SharedAmenities.Union(amenities).ToList();
        }

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
            Amenities = amenities,
            PrimaryImageUrl = request.PrimaryImageUrl,
            Images = NormalizeListingImages(request.Images),
            StructuredImages = MapToListingImages(request.StructuredImages),
            SizeSqft = request.SizeSqft,
            YearBuilt = request.YearBuilt,
            Developer = request.Developer,
            AvailabilityStatus = AvailabilityStatus.Available,
            Owner = request.Owner != null
                ? new PropertyContact(request.Owner.Name, request.Owner.Phone, request.Owner.Email)
                : new PropertyContact(string.Empty, string.Empty, null),
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
            CategoryId = request.CategoryId,
            SubcategoryId = request.SubcategoryId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _listingRepository.CreateAsync(listing);
        await TryComputeAndPersistEmbeddingAsync(listing);
        return await MapToResponseAsync(listing, property);
    }

    public async Task<ListingResponseDto?> GetListingByIdAsync(Guid id)
    {
        var listing = await _listingRepository.GetByIdAsync(id);
        return listing == null ? null : await MapToResponseAsync(listing);
    }

    public async Task<ListingResponseDto?> GetListingByCodeAsync(string listingCode)
    {
        var listing = await _listingRepository.GetByListingCodeAsync(listingCode);
        return listing == null ? null : await MapToResponseAsync(listing);
    }

    public async Task<PaginatedResult<ListingResponseDto>> GetAllListingsAsync(int page = 1, int pageSize = 20)
    {
        var listings = await _listingRepository.GetAllAsync(page, pageSize);
        var totalCount = await _listingRepository.GetTotalCountAsync();
        return await CreatePaginatedResponseAsync(listings, totalCount, page, pageSize);
    }

    public async Task<PaginatedResult<ListingResponseDto>> GetListingsByPropertyIdAsync(Guid propertyId, int page = 1, int pageSize = 20)
    {
        var listings = await _listingRepository.GetByPropertyIdAsync(propertyId);
        var list = listings.ToList();
        var paged = list.Skip((page - 1) * pageSize).Take(pageSize);
        return await CreatePaginatedResponseAsync(paged, list.Count, page, pageSize);
    }

    public async Task<PaginatedResult<ListingResponseDto>> GetListingsByOwnerAsync(Guid ownerId, int page = 1, int pageSize = 20)
    {
        var listings = await _listingRepository.GetByOwnerIdAsync(ownerId);
        var list = listings.ToList();
        var paged = list.Skip((page - 1) * pageSize).Take(pageSize);
        return await CreatePaginatedResponseAsync(paged, list.Count, page, pageSize);
    }

    public async Task<PaginatedResult<ListingResponseDto>> GetListingsByAgentAsync(Guid agentId, int page = 1, int pageSize = 20)
    {
        var listings = await _listingRepository.GetByAgentIdAsync(agentId);
        var list = listings.ToList();
        var paged = list.Skip((page - 1) * pageSize).Take(pageSize);
        return await CreatePaginatedResponseAsync(paged, list.Count, page, pageSize);
    }

    public async Task<PaginatedResult<ListingResponseDto>> GetListingsByCityAsync(string city, int page = 1, int pageSize = 20)
    {
        var listings = await _listingRepository.GetByCityAsync(city, page, pageSize);
        return await CreatePaginatedResponseAsync(listings, listings.Count(), page, pageSize);
    }

    public async Task<PaginatedResult<ListingResponseDto>> GetListingsByCountyAsync(string county, int page = 1, int pageSize = 20)
    {
        var listings = await _listingRepository.GetByCountyAsync(county, page, pageSize);
        return await CreatePaginatedResponseAsync(listings, listings.Count(), page, pageSize);
    }

    public async Task<PaginatedResult<ListingResponseDto>> GetListingsByElasticLocationAsync(string location, int page = 1, int pageSize = 20)
    {
        var criteria = new ListingSearchCriteria
        {
            LocationText = TrimOrNull(location),
            Page = page,
            PageSize = pageSize,
            SortDescending = true
        };
        var listings = await _listingRepository.SearchAsync(criteria);
        return await CreatePaginatedResponseAsync(listings, listings.Count(), page, pageSize);
    }

    public async Task<PaginatedResult<ListingResponseDto>> GetListingsByTypeAsync(string propertyType, int page = 1, int pageSize = 20)
    {
        var type = ParsePropertyType(propertyType);
        var listings = await _listingRepository.GetByPropertyTypeAsync(type, page, pageSize);
        return await CreatePaginatedResponseAsync(listings, listings.Count(), page, pageSize);
    }

    public async Task<PaginatedResult<ListingResponseDto>> GetListingsByListingTypeAsync(string listingType, int page = 1, int pageSize = 20)
    {
        var type = ParseListingType(listingType);
        var listings = await _listingRepository.GetByListingTypeAsync(type, page, pageSize);
        return await CreatePaginatedResponseAsync(listings, listings.Count(), page, pageSize);
    }

    public async Task<IEnumerable<ListingResponseDto>> GetFeaturedListingsAsync(int limit = 10)
    {
        var listings = await _listingRepository.GetFeaturedAsync(limit);
        var result = await CreatePaginatedResponseAsync(listings, 0, 1, int.MaxValue);
        return result.Items;
    }

    public async Task<PaginatedResult<ListingResponseDto>> GetAvailableListingsAsync(int page = 1, int pageSize = 20)
    {
        var listings = await _listingRepository.GetAvailableAsync(page, pageSize);
        return await CreatePaginatedResponseAsync(listings, listings.Count(), page, pageSize);
    }

    public async Task<PaginatedResult<ListingResponseDto>> SearchListingsAsync(ListingSearchRequest request)
    {
        var criteria = new ListingSearchCriteria
        {
            PropertyId = request.PropertyId,
            City = request.City,
            County = request.County,
            Country = request.Country,
            Suburb = request.Suburb,
            Street = request.Street,
            LocationText = TrimOrNull(request.Location),
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
            CategoryId = request.CategoryId,
            SubcategoryId = request.SubcategoryId,
            Page = request.Page,
            PageSize = request.PageSize,
            SortBy = request.SortBy,
            SortDescending = request.SortDescending
        };
        var totalCount = await _listingRepository.GetSearchCountAsync(criteria);
        var listings = await _listingRepository.SearchAsync(criteria);
        return await CreatePaginatedResponseAsync(listings, totalCount, request.Page, request.PageSize);
    }

    public async Task<ListingResponseDto?> UpdateListingAsync(Guid id, Guid requesterId, UpdateListingRequest request)
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
        if (request.PrimaryImageUrl != null) listing.PrimaryImageUrl = request.PrimaryImageUrl;
        if (request.Images != null) listing.Images = NormalizeListingImages(request.Images);
        if (request.StructuredImages != null) listing.StructuredImages = MapToListingImages(request.StructuredImages);
        if (request.SizeSqft.HasValue) listing.SizeSqft = request.SizeSqft;
        if (request.YearBuilt.HasValue) listing.YearBuilt = request.YearBuilt;
        if (request.Developer != null) listing.Developer = request.Developer;
        if (request.AvailabilityStatus != null) listing.AvailabilityStatus = ParseAvailabilityStatus(request.AvailabilityStatus);
        if (request.Owner != null) listing.Owner = new PropertyContact(request.Owner.Name, request.Owner.Phone, request.Owner.Email);
        if (request.Agent != null) listing.Agent = new PropertyContact(request.Agent.Name, request.Agent.Phone, request.Agent.Email);
        if (request.IsFeatured.HasValue) listing.IsFeatured = request.IsFeatured.Value;
        if (request.RecommendedScore.HasValue) listing.RecommendedScore = request.RecommendedScore.Value;
        if (request.CategoryId.HasValue) listing.CategoryId = request.CategoryId.Value;
        if (request.SubcategoryId.HasValue) listing.SubcategoryId = request.SubcategoryId.Value;
        listing.UpdatedAt = DateTime.UtcNow;

        await TryComputeEmbeddingOnListingAsync(listing);
        await _listingRepository.UpdateAsync(listing);
        return await MapToResponseAsync(listing);
    }

    public async Task<ListingResponseDto?> RegenerateListingEmbeddingAsync(Guid id, Guid requesterId)
    {
        var listing = await _listingRepository.GetByIdAsync(id);
        if (listing == null) return null;
        if (listing.OwnerId != requesterId && listing.AgentId != requesterId)
            throw new UnauthorizedAccessException("You don't have permission to update this listing");

        await TryComputeEmbeddingOnListingAsync(listing);
        listing.UpdatedAt = DateTime.UtcNow;
        await _listingRepository.UpdateAsync(listing);
        return await MapToResponseAsync(listing);
    }

    public async Task<ListingResponseDto?> UpdateAvailabilityAsync(Guid id, Guid requesterId, UpdateAvailabilityRequest request)
    {
        var listing = await _listingRepository.GetByIdAsync(id);
        if (listing == null) return null;
        if (listing.OwnerId != requesterId && listing.AgentId != requesterId)
            throw new UnauthorizedAccessException("You don't have permission to update this listing");
        listing.AvailabilityStatus = ParseAvailabilityStatus(request.AvailabilityStatus);
        listing.UpdatedAt = DateTime.UtcNow;
        await _listingRepository.UpdateAsync(listing);
        return await MapToResponseAsync(listing);
    }

    public async Task<ListingResponseDto?> UpdateRatingAsync(Guid id, UpdateRatingRequest request)
    {
        var listing = await _listingRepository.GetByIdAsync(id);
        if (listing == null) return null;
        var totalRating = listing.Rating * listing.RatingCount;
        listing.RatingCount++;
        listing.Rating = (totalRating + request.NewRating) / listing.RatingCount;
        listing.UpdatedAt = DateTime.UtcNow;
        await _listingRepository.UpdateAsync(listing);
        return await MapToResponseAsync(listing);
    }

    public async Task<ListingResponseDto?> IncrementViewsAsync(Guid id)
    {
        var listing = await _listingRepository.GetByIdAsync(id);
        if (listing == null) return null;
        listing.Views++;
        listing.UpdatedAt = DateTime.UtcNow;
        await _listingRepository.UpdateAsync(listing);
        return await MapToResponseAsync(listing);
    }

    public async Task<ListingResponseDto?> UpdateFeaturedStatusAsync(Guid id, UpdateFeaturedRequest request)
    {
        var listing = await _listingRepository.GetByIdAsync(id);
        if (listing == null) return null;
        listing.IsFeatured = request.IsFeatured;
        listing.UpdatedAt = DateTime.UtcNow;
        await _listingRepository.UpdateAsync(listing);
        return await MapToResponseAsync(listing);
    }

    public async Task<ListingResponseDto?> AssignAgentAsync(Guid id, Guid ownerId, AssignAgentRequest request)
    {
        var listing = await _listingRepository.GetByIdAsync(id);
        if (listing == null) return null;
        if (listing.OwnerId != ownerId)
            throw new UnauthorizedAccessException("Only the owner can assign an agent");
        listing.AgentId = request.AgentId;
        listing.Agent = new PropertyContact(request.AgentName, request.AgentPhone, request.AgentEmail);
        listing.UpdatedAt = DateTime.UtcNow;
        await _listingRepository.UpdateAsync(listing);
        return await MapToResponseAsync(listing);
    }

    public async Task<ListingResponseDto?> AssignCaretakerAsync(Guid id, Guid ownerId, AssignCaretakerRequest request)
    {
        var listing = await _listingRepository.GetByIdAsync(id);
        if (listing == null) return null;
        if (listing.OwnerId != ownerId)
            throw new UnauthorizedAccessException("Only the owner can assign a caretaker");
        listing.CaretakerId = request.CaretakerId;
        listing.Caretaker = new PropertyContact(request.CaretakerName ?? "", request.CaretakerPhone ?? "", request.CaretakerEmail);
        listing.UpdatedAt = DateTime.UtcNow;
        await _listingRepository.UpdateAsync(listing);
        return await MapToResponseAsync(listing);
    }

    public async Task<ListingResponseDto?> RemoveAgentAsync(Guid id, Guid ownerId)
    {
        var listing = await _listingRepository.GetByIdAsync(id);
        if (listing == null) return null;
        if (listing.OwnerId != ownerId)
            throw new UnauthorizedAccessException("Only the owner can remove an agent");
        listing.AgentId = null;
        listing.Agent = null;
        listing.UpdatedAt = DateTime.UtcNow;
        await _listingRepository.UpdateAsync(listing);
        return await MapToResponseAsync(listing);
    }

    public async Task<ListingResponseDto?> RemoveCaretakerAsync(Guid id, Guid ownerId)
    {
        var listing = await _listingRepository.GetByIdAsync(id);
        if (listing == null) return null;
        if (listing.OwnerId != ownerId)
            throw new UnauthorizedAccessException("Only the owner can remove a caretaker");
        listing.CaretakerId = null;
        listing.Caretaker = null;
        listing.UpdatedAt = DateTime.UtcNow;
        await _listingRepository.UpdateAsync(listing);
        return await MapToResponseAsync(listing);
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

    private static string? TrimOrNull(string? s) =>
        string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    private async Task<ListingResponseDto> MapToResponseAsync(Listing listing, Property? property = null)
    {
        property ??= await _propertyRepository.GetByIdAsync(listing.PropertyId);
        var terms = await _termsRepository.GetActiveByListingIdAsync(listing.Id);

        string? categoryName = null;
        string? subcategoryName = null;
        if (listing.CategoryId.HasValue)
            categoryName = (await _categoryRepository.GetByIdAsync(listing.CategoryId.Value))?.Name;
        if (listing.SubcategoryId.HasValue)
            subcategoryName = (await _subcategoryRepository.GetByIdAsync(listing.SubcategoryId.Value))?.Name;

        return BuildResponseDto(listing, property, terms, categoryName, subcategoryName);
    }

    private async Task<PaginatedResult<ListingResponseDto>> CreatePaginatedResponseAsync(
        IEnumerable<Listing> listings, int totalCount, int page, int pageSize)
    {
        var list = listings.ToList();

        var propertyIds = list.Select(l => l.PropertyId).Distinct();
        var properties  = await _propertyRepository.GetByIdsAsync(propertyIds);

        var listingIds = list.Select(l => l.Id);
        var termsMap   = await _termsRepository.GetActiveByListingIdsAsync(listingIds);

        // Fetch unique categories upfront (bounded by distinct category count, not listing count)
        var catIds  = list.Where(l => l.CategoryId.HasValue).Select(l => l.CategoryId!.Value).Distinct().ToList();
        var subIds  = list.Where(l => l.SubcategoryId.HasValue).Select(l => l.SubcategoryId!.Value).Distinct().ToList();
        var catNames = new Dictionary<Guid, string>();
        var subNames = new Dictionary<Guid, string>();
        foreach (var cid in catIds)
        {
            var c = await _categoryRepository.GetByIdAsync(cid);
            if (c != null) catNames[cid] = c.Name;
        }
        foreach (var sid in subIds)
        {
            var s = await _subcategoryRepository.GetByIdAsync(sid);
            if (s != null) subNames[sid] = s.Name;
        }

        var items = list.Select(l => BuildResponseDto(
            l,
            properties.GetValueOrDefault(l.PropertyId),
            termsMap.GetValueOrDefault(l.Id),
            l.CategoryId.HasValue    ? catNames.GetValueOrDefault(l.CategoryId.Value)    : null,
            l.SubcategoryId.HasValue ? subNames.GetValueOrDefault(l.SubcategoryId.Value) : null
        )).ToList();

        var totalPages = pageSize > 0 ? (int)Math.Ceiling(totalCount / (double)pageSize) : 1;
        return new PaginatedResult<ListingResponseDto>(items, totalCount, page, pageSize, totalPages);
    }

    private static ListingResponseDto BuildResponseDto(
        Listing listing,
        Property? property,
        PropertyTerms? terms,
        string? categoryName,
        string? subcategoryName)
    {
        var rules = property?.Rules.Select(r => new HouseRuleDto(r.Type, r.Description)).ToList()
                    ?? new List<HouseRuleDto>();

        return new ListingResponseDto(
            Id: listing.Id,
            ListingCode: listing.ListingCode,
            Title: listing.Title,
            Description: listing.Description,
            AvailabilityStatus: listing.AvailabilityStatus.ToString(),
            IsFeatured: listing.IsFeatured,
            RecommendedScore: listing.RecommendedScore,
            ListedDate: listing.ListedDate,
            Views: listing.Views,
            Rating: listing.Rating,
            RatingCount: listing.RatingCount,
            CreatedAt: listing.CreatedAt,
            UpdatedAt: listing.UpdatedAt,
            Property: new ListingPropertyInfo(
                Id: listing.PropertyId,
                PropertyCode: property?.PropertyCode ?? "",
                BuildingName: property?.BuildingName ?? "",
                YearBuilt: property?.YearBuilt,
                TotalFloors: property?.TotalFloors ?? 0,
                TotalUnits: property?.TotalUnits ?? 0
            ),
            Unit: new ListingUnitInfo(
                Number: listing.UnitNumber,
                Floor: listing.FloorNumber,
                PropertyType: listing.PropertyType.ToString(),
                ListingType: listing.ListingType.ToString(),
                Bedrooms: listing.Bedrooms,
                Bathrooms: listing.Bathrooms,
                SizeSqft: listing.SizeSqft,
                YearBuilt: listing.YearBuilt,
                IsFurnished: listing.IsFurnished,
                Developer: listing.Developer
            ),
            Location: new LocationDto(
                listing.Location.Country,
                listing.Location.County,
                listing.Location.City,
                listing.Location.Suburb,
                listing.Location.Street,
                listing.Location.Latitude,
                listing.Location.Longitude
            ),
            Pricing: new ListingPricingDto(listing.Price, listing.PriceCurrency),
            Owner: new ListingOwnerDto(listing.OwnerId, listing.Owner.Name, listing.Owner.Phone, listing.Owner.Email),
            Agent: listing.Agent != null
                ? new ListingAgentDto(listing.AgentId ?? Guid.Empty, listing.Agent.Name, listing.Agent.Phone, listing.Agent.Email)
                : null,
            Caretaker: listing.CaretakerId.HasValue && listing.Caretaker != null
                ? new ListingCaretakerDto(listing.CaretakerId.Value, listing.Caretaker.Name, listing.Caretaker.Phone, listing.Caretaker.Email)
                : listing.CaretakerId.HasValue ? new ListingCaretakerDto(listing.CaretakerId.Value, "", "", null) : null,
            Images: new ListingImagesDto(
                Primary: listing.PrimaryImageUrl ?? listing.Images.FirstOrDefault(),
                Exterior: listing.StructuredImages.Exterior,
                LivingRoom: listing.StructuredImages.LivingRoom,
                Kitchen: listing.StructuredImages.Kitchen,
                DiningArea: listing.StructuredImages.DiningArea,
                Bedroom: listing.StructuredImages.Bedroom,
                Bathroom: listing.StructuredImages.Bathroom,
                Balcony: listing.StructuredImages.Balcony,
                Other: listing.StructuredImages.Other
            ),
            Amenities: listing.Amenities,
            Rules: rules,
            Terms: terms != null ? MapToTermsDto(terms) : null,
            Category: listing.CategoryId.HasValue && categoryName != null
                ? new ListingCategoryDto(listing.CategoryId.Value, categoryName)
                : null,
            Subcategory: listing.SubcategoryId.HasValue && subcategoryName != null
                ? new ListingCategoryDto(listing.SubcategoryId.Value, subcategoryName)
                : null
        );
    }

    private static ListingTermsDto MapToTermsDto(PropertyTerms terms) => new(
        Id: terms.Id,
        MinLeasePeriod: terms.MinimumLeasePeriod,
        NoticePeriod: terms.NoticePeriod,
        Deposits: new ListingDepositsDto(
            Security: terms.SecurityDeposit,
            Water: terms.WaterDeposit,
            Electricity: terms.ElectricityDeposit,
            Token: terms.TokenDeposit,
            Garbage: terms.GarbageDeposit,
            Admin: terms.AdminFee,
            Currency: terms.Currency ?? "KES"
        ),
        PetPolicy: terms.PetPolicy,
        PaymentTerms: terms.PaymentTerms,
        PaymentMethods: new ListingPaymentMethodsDto(
            MpesaPaybill: terms.MpesaPaybill,
            MpesaTill: terms.MpesaTill,
            MpesaAccountNumber: terms.MpesaAccountNumber,
            BankName: terms.BankName,
            BankAccountName: terms.BankAccountName,
            BankAccountNumber: terms.BankAccountNumber,
            BankBranch: terms.BankBranch,
            Instructions: terms.PaymentInstructions
        ),
        HouseRules: terms.HouseRules,
        OnboardingInstructions: terms.OnboardingInstructions,
        AccessInstructions: terms.AccessInstructions,
        ItemsToCarry: terms.ItemsToCarry
    );

    private static ListingImages MapToListingImages(ListingImagesDto? dto)
    {
        if (dto == null) return ListingImages.Empty();
        return new ListingImages(
            Exterior: dto.Exterior ?? [],
            LivingRoom: dto.LivingRoom ?? [],
            Kitchen: dto.Kitchen ?? [],
            DiningArea: dto.DiningArea ?? [],
            Bedroom: dto.Bedroom ?? [],
            Bathroom: dto.Bathroom ?? [],
            Balcony: dto.Balcony ?? [],
            Other: dto.Other ?? []
        );
    }

    private async Task TryComputeAndPersistEmbeddingAsync(Listing listing)
    {
        await TryComputeEmbeddingOnListingAsync(listing);
        if (listing.Embedding == null)
            return;
        try
        {
            await _listingRepository.UpdateAsync(listing);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to persist embedding for listing {ListingId}", listing.Id);
        }
    }

    private async Task TryComputeEmbeddingOnListingAsync(Listing listing)
    {
        try
        {
            var property = await _propertyRepository.GetByIdAsync(listing.PropertyId);
            var text = ListingEmbeddingTextBuilder.Build(listing, property?.BuildingName);
            listing.Embedding = await _embeddingService.EmbedAsync(text);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to compute embedding for listing {ListingId}", listing.Id);
        }
    }

    private static PropertyType ParsePropertyType(string value) =>
        Enum.TryParse<PropertyType>(value, true, out var result) ? result : PropertyType.Apartment;
    private static ListingType ParseListingType(string value) =>
        Enum.TryParse<ListingType>(value, true, out var result) ? result : ListingType.Rent;
    private static AvailabilityStatus ParseAvailabilityStatus(string value) =>
        Enum.TryParse<AvailabilityStatus>(value, true, out var result) ? result : AvailabilityStatus.Available;
}
