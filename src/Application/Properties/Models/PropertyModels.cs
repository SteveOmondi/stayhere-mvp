namespace StayHere.Application.Properties.Models;

// ----- Property (building/complex) -----

public record CreatePropertyRequest(
    string BuildingName,
    string? Description,
    int TotalUnits,
    int TotalFloors,
    LocationDto Location
);

public record UpdatePropertyRequest(
    string? BuildingName,
    string? Description,
    int? TotalUnits,
    int? TotalFloors,
    LocationDto? Location
);

public record PropertyDto(
    Guid Id,
    string PropertyCode,
    string BuildingName,
    string? Description,
    int TotalUnits,
    int TotalFloors,
    LocationDto Location,
    Guid OwnerId,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record PropertyListDto(
    Guid Id,
    string PropertyCode,
    string BuildingName,
    int TotalUnits,
    int TotalFloors,
    string City,
    string County
);

// ----- Listing (unit within a property) -----

public record CreateListingRequest(
    Guid PropertyId,
    string UnitNumber,
    int FloorNumber,
    string Title,
    string? Description,
    decimal Price,
    string PriceCurrency,
    string PropertyType,
    string ListingType,
    int Bedrooms,
    int Bathrooms,
    bool IsFurnished,
    LocationDto Location,
    List<string>? Amenities,
    List<string>? Images,
    int? SizeSqft,
    int? YearBuilt,
    string? Developer,
    OwnerContactDto Owner,
    AgentContactDto? Agent
);

public record CreateListingFromPropertyRequest(
    string UnitNumber,
    int FloorNumber,
    string Title,
    string? Description,
    decimal Price,
    string PriceCurrency,
    string PropertyType,
    string ListingType,
    int Bedrooms,
    int Bathrooms,
    bool IsFurnished,
    LocationDto? Location,
    List<string>? Amenities,
    List<string>? Images,
    int? SizeSqft,
    int? YearBuilt,
    string? Developer,
    OwnerContactDto Owner,
    AgentContactDto? Agent
);

public record UpdateListingRequest(
    string? Title,
    string? Description,
    decimal? Price,
    string? PriceCurrency,
    string? PropertyType,
    string? ListingType,
    int? Bedrooms,
    int? Bathrooms,
    bool? IsFurnished,
    LocationDto? Location,
    List<string>? Amenities,
    List<string>? Images,
    int? SizeSqft,
    int? YearBuilt,
    string? Developer,
    string? AvailabilityStatus,
    OwnerContactDto? Owner,
    AgentContactDto? Agent,
    bool? IsFeatured,
    decimal? RecommendedScore
);

public record ListingDto(
    Guid Id,
    string ListingCode,
    Guid PropertyId,
    string PropertyCode,
    string BuildingName,
    string UnitNumber,
    int FloorNumber,
    string Title,
    string? Description,
    decimal Price,
    string PriceCurrency,
    string PropertyType,
    string ListingType,
    int Bedrooms,
    int Bathrooms,
    bool IsFurnished,
    LocationDto Location,
    List<string> Amenities,
    List<string> Images,
    int? SizeSqft,
    int? YearBuilt,
    string? Developer,
    string AvailabilityStatus,
    OwnerContactDto Owner,
    AgentContactDto? Agent,
    Guid OwnerId,
    Guid? AgentId,
    Guid? CaretakerId,
    DateTime ListedDate,
    int Views,
    decimal Rating,
    int RatingCount,
    bool IsFeatured,
    decimal RecommendedScore,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record ListingListDto(
    Guid Id,
    string ListingCode,
    Guid PropertyId,
    string BuildingName,
    string UnitNumber,
    int FloorNumber,
    string Title,
    decimal Price,
    string PriceCurrency,
    string PropertyType,
    string ListingType,
    int Bedrooms,
    int Bathrooms,
    string City,
    string County,
    string? PrimaryImage,
    string AvailabilityStatus,
    int Views,
    decimal Rating,
    bool IsFeatured,
    DateTime ListedDate
);

public record UpdateAvailabilityRequest(string AvailabilityStatus);

public record UpdateRatingRequest(decimal NewRating);

public record UpdateFeaturedRequest(bool IsFeatured);

public record AssignAgentRequest(
    Guid AgentId,
    string AgentName,
    string AgentPhone,
    string? AgentEmail
);

public record AssignCaretakerRequest(Guid CaretakerId);

public record ListingSearchRequest(
    Guid? PropertyId,
    string? City,
    string? County,
    string? Country,
    string? Suburb,
    string? Street,
    /// <summary>Optional elastic match on any address field (same as GET <c>listings/by-location?location=</c>).</summary>
    string? Location,
    string? PropertyType,
    string? ListingType,
    decimal? MinPrice,
    decimal? MaxPrice,
    int? MinBedrooms,
    int? MaxBedrooms,
    int? MinBathrooms,
    bool? IsFurnished,
    string? AvailabilityStatus,
    bool? IsFeatured,
    int Page = 1,
    int PageSize = 20,
    string? SortBy = null,
    bool SortDescending = true
);

// ----- Shared -----

public record LocationDto(
    string Country,
    string County,
    string City,
    string? Suburb,
    string? Street,
    double? Latitude,
    double? Longitude
);

public record OwnerContactDto(
    string Name,
    string Phone,
    string? Email
);

public record AgentContactDto(
    string Name,
    string Phone,
    string? Email
);

public record PaginatedResult<T>(
    IEnumerable<T> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
);
