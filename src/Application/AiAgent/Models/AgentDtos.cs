namespace StayHere.Application.AiAgent.Models;

public record AgentChatRequest(
    string Query,
    string? ConversationId,
    int MaxTokens = 1000,
    double Temperature = 0.7);

public record AgentChatResponse(
    string Response,
    string ConversationId,
    IReadOnlyList<string> Sources,
    double Confidence,
    DateTime Timestamp);

/// <summary>Heuristic factors extracted from the user query (no client-supplied filters).</summary>
public record AgentExtractedIntent(
    string? Locations,
    int? MinBedrooms,
    int? MaxBedrooms,
    decimal? MaxPrice,
    decimal? MinPrice,
    string? PropertyTypeKeywords,
    string? AmenityKeywords,
    string NormalizedQuery);

public record AgentRecommendRequest(
    string Query,
    string? ConversationId,
    int MaxResults = 10,
    double Temperature = 0.7);

public record AgentRecommendedListingDto(
    Guid ListingId,
    string ListingCode,
    string Title,
    string? Description,
    string PropertyType,
    string Location,
    decimal Price,
    string PriceCurrency,
    int Bedrooms,
    int Bathrooms,
    bool Furnished,
    IReadOnlyList<string> Amenities,
    string ListingUrl,
    string? ImageUrl,
    double MatchScore);

public record AgentRecommendData(
    IReadOnlyList<AgentRecommendedListingDto> RecommendedListings,
    string? ConversationId,
    double Confidence,
    DateTime Timestamp,
    AgentExtractedIntent ExtractedIntent,
    bool UsedVectorSearch,
    bool UsedFallbackRanking);

public record AgentRecommendResponse(
    string Status,
    string Message,
    AgentRecommendData Data);

public record AgentListingSearchRequest(
    string? ListingId,
    string? ListingCode,
    string? Location,
    string? Amenity);

public record AgentListingSearchItemDto(
    Guid ListingId,
    string ListingCode,
    string Title,
    string PropertyType,
    string Location,
    decimal Price,
    IReadOnlyList<string> Amenities);

public record AgentListingSearchResponse(IReadOnlyList<AgentListingSearchItemDto> Listings);
