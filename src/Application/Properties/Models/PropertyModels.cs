namespace StayHere.Application.Properties.Models;

// ----- Property (building/complex) -----

public record CreatePropertyRequest(
    string BuildingName,
    string? Description,
    int TotalUnits,
    int TotalFloors,
    LocationDto Location,
    string? PrimaryImageUrl = null,
    List<string>? Images = null,
    int? YearBuilt = null,
    List<string>? SharedAmenities = null,
    List<HouseRuleDto>? Rules = null,
    PropertyImagesDto? StructuredImages = null
);

public record UpdatePropertyRequest(
    string? BuildingName,
    string? Description,
    int? TotalUnits,
    int? TotalFloors,
    LocationDto? Location,
    string? PrimaryImageUrl = null,
    List<string>? Images = null,
    int? YearBuilt = null,
    List<string>? SharedAmenities = null,
    List<HouseRuleDto>? Rules = null,
    PropertyImagesDto? StructuredImages = null
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
    DateTime UpdatedAt,
    string? PrimaryImageUrl = null,
    List<string>? Images = null,
    int? YearBuilt = null,
    List<string>? SharedAmenities = null,
    List<HouseRuleDto>? Rules = null,
    PropertyImagesDto? StructuredImages = null
);

public record PropertyListDto(
    Guid Id,
    string PropertyCode,
    string BuildingName,
    int TotalUnits,
    int TotalFloors,
    string City,
    string County,
    string? PrimaryImageUrl = null,
    double? Latitude = null,
    double? Longitude = null,
    int? YearBuilt = null
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
    OwnerContactDto? Owner = null,
    AgentContactDto? Agent = null,
    string? PrimaryImageUrl = null,
    Guid? CategoryId = null,
    Guid? SubcategoryId = null,
    ListingImagesDto? StructuredImages = null,
    FloorPlanDto? FloorPlan = null,
    /// <summary>Required when ListingType is Sale ("CompleteTurnkey"/"OffPlanUnderConstruction") or
    /// Rent ("LongTermLease"/"ShortTermServicedVacation"); ignored for other listing types.</summary>
    string? Tenure = null
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
    OwnerContactDto? Owner = null,
    AgentContactDto? Agent = null,
    string? PrimaryImageUrl = null,
    Guid? CategoryId = null,
    Guid? SubcategoryId = null,
    ListingImagesDto? StructuredImages = null,
    FloorPlanDto? FloorPlan = null,
    string? Tenure = null
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
    decimal? RecommendedScore,
    string? PrimaryImageUrl = null,
    Guid? CategoryId = null,
    Guid? SubcategoryId = null,
    ListingImagesDto? StructuredImages = null,
    FloorPlanDto? FloorPlan = null,
    string? Tenure = null
);

// ----- Unified Listing Response (replaces ListingDto + ListingListDto) -----

public record ListingResponseDto(
    Guid Id,
    string ListingCode,
    string Title,
    string? Description,
    string AvailabilityStatus,
    bool IsFeatured,
    decimal RecommendedScore,
    DateTime ListedDate,
    int Views,
    decimal Rating,
    int RatingCount,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    ListingPropertyInfo Property,
    ListingUnitInfo Unit,
    LocationDto Location,
    ListingPricingDto Pricing,
    ListingOwnerDto Owner,
    ListingAgentDto? Agent,
    ListingCaretakerDto? Caretaker,
    ListingImagesDto Images,
    List<string> Amenities,
    List<HouseRuleDto> Rules,
    ListingTermsDto? Terms,
    ListingCategoryDto? Category,
    ListingCategoryDto? Subcategory,
    FloorPlanDto? FloorPlan = null
);

public record ListingPropertyInfo(
    Guid Id,
    string PropertyCode,
    string BuildingName,
    int? YearBuilt,
    int TotalFloors,
    int TotalUnits
);

public record ListingUnitInfo(
    string Number,
    int Floor,
    string PropertyType,
    string ListingType,
    int Bedrooms,
    int Bathrooms,
    int? SizeSqft,
    int? YearBuilt,
    bool IsFurnished,
    string? Developer,
    string? Tenure = null
);

public record ListingPricingDto(decimal Price, string Currency);

public record ListingOwnerDto(Guid Id, string Name, string Phone, string? Email);
public record ListingAgentDto(Guid Id, string Name, string Phone, string? Email);
public record ListingCaretakerDto(Guid Id, string Name, string Phone, string? Email);

public record ListingImagesDto(
    string? Primary,
    List<string> Exterior,
    List<string> LivingRoom,
    List<string> Kitchen,
    List<string> DiningArea,
    List<string> Bedroom,
    List<string> Bathroom,
    List<string> Balcony,
    List<string> Other
);

public record FloorPlanRoomDto(string Id, string Label, List<double[]> Points);

public record FloorPlanOpeningDto(
    string Id,
    double[] From,
    double[] To,
    double Position,
    double WidthMeters,
    string Type
);

public record FloorPlanHotspotDto(string Id, string RoomId, string Label, int Order);

public record FloorPlanLayoutItemDto(string CatalogId, string RoomId, double[] Position, double RotationY);

public record FloorPlanDto(
    List<FloorPlanRoomDto> Rooms,
    List<FloorPlanOpeningDto> Openings,
    double MetersPerPixel,
    string SourceFileKey,
    string SourceFileType,
    DateTime DigitizedAt,
    string DigitizedByRole,
    string? AiProvider = null,
    List<FloorPlanHotspotDto>? Hotspots = null,
    List<string>? AllowedCatalogIds = null,
    List<FloorPlanLayoutItemDto>? DefaultLayout = null
);

public record HouseRuleDto(string Type, string? Description = null);

public record ListingTermsDto(
    Guid Id,
    string? MinLeasePeriod,
    string? NoticePeriod,
    ListingDepositsDto Deposits,
    string? PetPolicy,
    string? PaymentTerms,
    ListingPaymentMethodsDto? PaymentMethods,
    string? HouseRules,
    string? OnboardingInstructions,
    string? AccessInstructions,
    string? ItemsToCarry
);

public record ListingDepositsDto(
    decimal? Security,
    decimal? Water,
    decimal? Electricity,
    decimal? Token,
    decimal? Garbage,
    decimal? Admin,
    string Currency
);

public record ListingPaymentMethodsDto(
    string? MpesaPaybill,
    string? MpesaTill,
    string? MpesaAccountNumber,
    string? BankName,
    string? BankAccountName,
    string? BankAccountNumber,
    string? BankBranch,
    string? Instructions
);

public record ListingCategoryDto(Guid Id, string Name);

public record PropertyImagesDto(
    List<string>? Exterior = null,
    List<string>? CommonAreas = null,
    List<string>? Other = null
);

// ----- Legacy DTOs (kept for backward compat during transition) -----

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
    DateTime UpdatedAt,
    string? PrimaryImageUrl = null,
    Guid? CategoryId = null,
    Guid? SubcategoryId = null,
    string? CategoryName = null,
    string? SubcategoryName = null,
    string? Tenure = null
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
    string? PrimaryImageUrl,
    string AvailabilityStatus,
    int Views,
    decimal Rating,
    bool IsFeatured,
    DateTime ListedDate,
    double? Latitude = null,
    double? Longitude = null
);

// ----- Other request records -----

public record UpdateAvailabilityRequest(string AvailabilityStatus);

public record UpdateRatingRequest(decimal NewRating);

public record UpdateFeaturedRequest(bool IsFeatured);

public record AssignAgentRequest(
    Guid AgentId,
    string AgentName,
    string AgentPhone,
    string? AgentEmail
);

public record AssignCaretakerRequest(Guid CaretakerId, string? CaretakerName = null, string? CaretakerPhone = null, string? CaretakerEmail = null);

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
    bool SortDescending = true,
    Guid? CategoryId = null,
    Guid? SubcategoryId = null,
    string? Tenure = null,
    /// <summary>Comma-separated amenity keywords a listing must all match, e.g. "pool,parking".</summary>
    string? Amenity = null,
    /// <summary>
    /// Free-text search box input, e.g. "two bedroom with a swimming pool in westlands". Parsed via
    /// <see cref="StayHere.Application.AiAgent.Services.ListingQueryIntentExtractor"/> to fill in
    /// bedrooms/price/location/amenity whenever the caller didn't already set them explicitly via
    /// the structured fields above.
    /// </summary>
    string? Query = null
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

public record ImageUploadUrlResponse(string UploadUrl, string ImageId, string PublicUrl);
