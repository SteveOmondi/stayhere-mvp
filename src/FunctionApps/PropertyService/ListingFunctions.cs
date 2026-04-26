using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Web;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StayHere.Application.Common.Interfaces;
using StayHere.Application.Properties.Models;

namespace StayHere.PropertyService.Functions;

public class ListingFunctions
{
    private readonly IListingService _listingService;
    private readonly ICacheService _cacheService;
    private readonly ILogger<ListingFunctions> _logger;
    private readonly IConfiguration _configuration;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public ListingFunctions(
        IListingService listingService,
        ICacheService cacheService,
        ILogger<ListingFunctions> logger,
        IConfiguration configuration)
    {
        _listingService = listingService;
        _cacheService = cacheService;
        _logger = logger;
        _configuration = configuration;
    }

    [Function("CreateListing")]
    public async Task<HttpResponseData> CreateListing(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "listings")] HttpRequestData req)
    {
        var (callerId, authError) = await RequireUserIdAsync(req);
        if (authError != null)
            return authError;

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<CreateListingRequest>(body, JsonOptions);
            if (request == null)
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request body");

            var listing = await _listingService.CreateListingAsync(callerId, request);
            return await CreateJsonResponse(req, HttpStatusCode.Created, listing);
        }
        catch (UnauthorizedAccessException ex)
        {
            return await CreateErrorResponse(req, HttpStatusCode.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating listing");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("CreateListingFromProperty")]
    public async Task<HttpResponseData> CreateListingFromProperty(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "properties/{propertyId:guid}/listings")] HttpRequestData req,
        Guid propertyId)
    {
        var (callerId, authError) = await RequireUserIdAsync(req);
        if (authError != null)
            return authError;

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<CreateListingFromPropertyRequest>(body, JsonOptions);
            if (request == null)
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request body");

            var listing = await _listingService.CreateListingFromPropertyAsync(propertyId, callerId, request);
            return await CreateJsonResponse(req, HttpStatusCode.Created, listing);
        }
        catch (ArgumentException ex)
        {
            return await CreateErrorResponse(req, HttpStatusCode.BadRequest, ex.Message);
        }
        catch (UnauthorizedAccessException ex)
        {
            return await CreateErrorResponse(req, HttpStatusCode.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating listing from property");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("GetListingById")]
    public async Task<HttpResponseData> GetListingById(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "listings/{id:guid}")] HttpRequestData req,
        Guid id)
    {
        try
        {
            var listing = await _listingService.GetListingByIdAsync(id);
            if (listing == null)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Listing not found");
            return await CreateJsonResponse(req, HttpStatusCode.OK, listing);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting listing");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("GetListingByCode")]
    public async Task<HttpResponseData> GetListingByCode(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "listings/code/{code}")] HttpRequestData req,
        string code)
    {
        try
        {
            var listing = await _listingService.GetListingByCodeAsync(code);
            if (listing == null)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Listing not found");
            return await CreateJsonResponse(req, HttpStatusCode.OK, listing);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting listing");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("GetAllListings")]
    public async Task<HttpResponseData> GetAllListings(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "listings")] HttpRequestData req)
    {
        try
        {
            var page = GetQueryInt(req, "page", 1);
            var pageSize = GetQueryInt(req, "pageSize", 20);
            var result = await _listingService.GetAllListingsAsync(page, pageSize);
            return await CreateJsonResponse(req, HttpStatusCode.OK, result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting listings");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("GetListingsByProperty")]
    public async Task<HttpResponseData> GetListingsByProperty(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "listings/property/{propertyId:guid}")] HttpRequestData req,
        Guid propertyId)
    {
        try
        {
            var page = GetQueryInt(req, "page", 1);
            var pageSize = GetQueryInt(req, "pageSize", 20);
            var result = await _listingService.GetListingsByPropertyIdAsync(propertyId, page, pageSize);
            return await CreateJsonResponse(req, HttpStatusCode.OK, result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting listings");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("GetListingsByOwner")]
    public async Task<HttpResponseData> GetListingsByOwner(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "listings/owner/{ownerId:guid}")] HttpRequestData req,
        Guid ownerId)
    {
        try
        {
            var page = GetQueryInt(req, "page", 1);
            var pageSize = GetQueryInt(req, "pageSize", 20);
            var result = await _listingService.GetListingsByOwnerAsync(ownerId, page, pageSize);
            return await CreateJsonResponse(req, HttpStatusCode.OK, result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting listings");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("GetListingsByCity")]
    public async Task<HttpResponseData> GetListingsByCity(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "listings/city/{city}")] HttpRequestData req,
        string city)
    {
        try
        {
            var page = GetQueryInt(req, "page", 1);
            var pageSize = GetQueryInt(req, "pageSize", 20);
            var result = await _listingService.GetListingsByCityAsync(city, page, pageSize);
            return await CreateJsonResponse(req, HttpStatusCode.OK, result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting listings");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("GetListingsByCounty")]
    public async Task<HttpResponseData> GetListingsByCounty(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "listings/county/{county}")] HttpRequestData req,
        string county)
    {
        try
        {
            var page = GetQueryInt(req, "page", 1);
            var pageSize = GetQueryInt(req, "pageSize", 20);
            var result = await _listingService.GetListingsByCountyAsync(county, page, pageSize);
            return await CreateJsonResponse(req, HttpStatusCode.OK, result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting listings");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    /// <summary>
    /// Cached elastic location search: <c>location</c> matches country, county, city, suburb, or street (substring, case-insensitive).
    /// Redis key shape: <c>stayhere:property:listings:loc:{normalized}:p{page}:s{pageSize}</c> (e.g. <c>...loc:westlands:p1:s20</c>).
    /// </summary>
    [Function("GetListingsByLocation")]
    public async Task<HttpResponseData> GetListingsByLocation(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "listings/by-location")] HttpRequestData req)
    {
        try
        {
            var query = HttpUtility.ParseQueryString(req.Url.Query);
            var location = query["location"];
            if (string.IsNullOrWhiteSpace(location))
            {
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest,
                    "Query parameter \"location\" is required (e.g. ?location=westlands).");
            }

            var page = GetQueryInt(req, "page", 1);
            var pageSize = Math.Clamp(GetQueryInt(req, "pageSize", 20), 1, 100);

            var cacheKey = BuildElasticLocationCacheKey(location, page, pageSize);
            var result = await _cacheService.GetOrSetAsync(
                cacheKey,
                async () => await _listingService.GetListingsByElasticLocationAsync(location, page, pageSize),
                TimeSpan.FromHours(1));

            return await CreateJsonResponse(req, HttpStatusCode.OK, result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting listings by location");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("GetListingsByType")]
    public async Task<HttpResponseData> GetListingsByType(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "listings/type/{propertyType}")] HttpRequestData req,
        string propertyType)
    {
        try
        {
            var page = GetQueryInt(req, "page", 1);
            var pageSize = GetQueryInt(req, "pageSize", 20);
            var result = await _listingService.GetListingsByTypeAsync(propertyType, page, pageSize);
            return await CreateJsonResponse(req, HttpStatusCode.OK, result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting listings");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("GetListingsByListingType")]
    public async Task<HttpResponseData> GetListingsByListingType(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "listings/listing-type/{listingType}")] HttpRequestData req,
        string listingType)
    {
        try
        {
            var page = GetQueryInt(req, "page", 1);
            var pageSize = GetQueryInt(req, "pageSize", 20);
            var result = await _listingService.GetListingsByListingTypeAsync(listingType, page, pageSize);
            return await CreateJsonResponse(req, HttpStatusCode.OK, result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting listings");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("GetFeaturedListings")]
    public async Task<HttpResponseData> GetFeaturedListings(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "listings/featured")] HttpRequestData req)
    {
        try
        {
            var limit = GetQueryInt(req, "limit", 10);
            var result = await _listingService.GetFeaturedListingsAsync(limit);
            return await CreateJsonResponse(req, HttpStatusCode.OK, result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting featured listings");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("GetAvailableListings")]
    public async Task<HttpResponseData> GetAvailableListings(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "listings/available")] HttpRequestData req)
    {
        try
        {
            var page = GetQueryInt(req, "page", 1);
            var pageSize = GetQueryInt(req, "pageSize", 20);
            var result = await _listingService.GetAvailableListingsAsync(page, pageSize);
            return await CreateJsonResponse(req, HttpStatusCode.OK, result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting available listings");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("SearchListings")]
    public async Task<HttpResponseData> SearchListings(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "listings/search")] HttpRequestData req)
    {
        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<ListingSearchRequest>(body, JsonOptions)
                ?? new ListingSearchRequest(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 1, 20, null, true);
            var result = await _listingService.SearchListingsAsync(request);
            return await CreateJsonResponse(req, HttpStatusCode.OK, result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching listings");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("UpdateListing")]
    public async Task<HttpResponseData> UpdateListing(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "listings/{id:guid}")] HttpRequestData req,
        Guid id)
    {
        var (callerId, authError) = await RequireUserIdAsync(req);
        if (authError != null)
            return authError;

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<UpdateListingRequest>(body, JsonOptions);
            if (request == null)
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request body");

            var listing = await _listingService.UpdateListingAsync(id, callerId, request);
            if (listing == null)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Listing not found");
            return await CreateJsonResponse(req, HttpStatusCode.OK, listing);
        }
        catch (UnauthorizedAccessException ex)
        {
            return await CreateErrorResponse(req, HttpStatusCode.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating listing");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("RegenerateListingEmbedding")]
    public async Task<HttpResponseData> RegenerateListingEmbedding(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "listings/{id:guid}/embedding")] HttpRequestData req,
        Guid id)
    {
        var (callerId, authError) = await RequireUserIdAsync(req);
        if (authError != null)
            return authError;

        try
        {
            var listing = await _listingService.RegenerateListingEmbeddingAsync(id, callerId);
            if (listing == null)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Listing not found");
            return await CreateJsonResponse(req, HttpStatusCode.OK, listing);
        }
        catch (UnauthorizedAccessException ex)
        {
            return await CreateErrorResponse(req, HttpStatusCode.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error regenerating listing embedding");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("UpdateListingAvailability")]
    public async Task<HttpResponseData> UpdateListingAvailability(
        [HttpTrigger(AuthorizationLevel.Anonymous, "patch", Route = "listings/{id:guid}/availability")] HttpRequestData req,
        Guid id)
    {
        var (callerId, authError) = await RequireUserIdAsync(req);
        if (authError != null)
            return authError;

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<UpdateAvailabilityRequest>(body, JsonOptions);
            if (request == null)
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request body");

            var listing = await _listingService.UpdateAvailabilityAsync(id, callerId, request);
            if (listing == null)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Listing not found");
            return await CreateJsonResponse(req, HttpStatusCode.OK, listing);
        }
        catch (UnauthorizedAccessException ex)
        {
            return await CreateErrorResponse(req, HttpStatusCode.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating availability");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("UpdateListingRating")]
    public async Task<HttpResponseData> UpdateListingRating(
        [HttpTrigger(AuthorizationLevel.Anonymous, "patch", Route = "listings/{id:guid}/rating")] HttpRequestData req,
        Guid id)
    {
        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<UpdateRatingRequest>(body, JsonOptions);
            if (request == null || request.NewRating < 0 || request.NewRating > 5)
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Rating must be between 0 and 5");

            var listing = await _listingService.UpdateRatingAsync(id, request);
            if (listing == null)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Listing not found");
            return await CreateJsonResponse(req, HttpStatusCode.OK, listing);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating rating");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("IncrementListingViews")]
    public async Task<HttpResponseData> IncrementListingViews(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "listings/{id:guid}/view")] HttpRequestData req,
        Guid id)
    {
        try
        {
            var listing = await _listingService.IncrementViewsAsync(id);
            if (listing == null)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Listing not found");
            return await CreateJsonResponse(req, HttpStatusCode.OK, new { listing.Views });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error incrementing views");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("UpdateListingFeatured")]
    public async Task<HttpResponseData> UpdateListingFeatured(
        [HttpTrigger(AuthorizationLevel.Anonymous, "patch", Route = "listings/{id:guid}/featured")] HttpRequestData req,
        Guid id)
    {
        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<UpdateFeaturedRequest>(body, JsonOptions);
            if (request == null)
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request body");

            var listing = await _listingService.UpdateFeaturedStatusAsync(id, request);
            if (listing == null)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Listing not found");
            return await CreateJsonResponse(req, HttpStatusCode.OK, listing);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating featured status");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("AssignListingAgent")]
    public async Task<HttpResponseData> AssignListingAgent(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "listings/{id:guid}/agent")] HttpRequestData req,
        Guid id)
    {
        var (callerId, authError) = await RequireUserIdAsync(req);
        if (authError != null)
            return authError;

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<AssignAgentRequest>(body, JsonOptions);
            if (request == null)
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request body");

            var listing = await _listingService.AssignAgentAsync(id, callerId, request);
            if (listing == null)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Listing not found");
            return await CreateJsonResponse(req, HttpStatusCode.OK, listing);
        }
        catch (UnauthorizedAccessException ex)
        {
            return await CreateErrorResponse(req, HttpStatusCode.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error assigning agent");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("RemoveListingAgent")]
    public async Task<HttpResponseData> RemoveListingAgent(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "listings/{id:guid}/agent")] HttpRequestData req,
        Guid id)
    {
        var (callerId, authError) = await RequireUserIdAsync(req);
        if (authError != null)
            return authError;

        try
        {
            var listing = await _listingService.RemoveAgentAsync(id, callerId);
            if (listing == null)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Listing not found");
            return await CreateJsonResponse(req, HttpStatusCode.OK, listing);
        }
        catch (UnauthorizedAccessException ex)
        {
            return await CreateErrorResponse(req, HttpStatusCode.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing agent");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("AssignListingCaretaker")]
    public async Task<HttpResponseData> AssignListingCaretaker(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "listings/{id:guid}/caretaker")] HttpRequestData req,
        Guid id)
    {
        var (callerId, authError) = await RequireUserIdAsync(req);
        if (authError != null)
            return authError;

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<AssignCaretakerRequest>(body, JsonOptions);
            if (request == null)
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request body");

            var listing = await _listingService.AssignCaretakerAsync(id, callerId, request);
            if (listing == null)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Listing not found");
            return await CreateJsonResponse(req, HttpStatusCode.OK, listing);
        }
        catch (UnauthorizedAccessException ex)
        {
            return await CreateErrorResponse(req, HttpStatusCode.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error assigning caretaker");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("RemoveListingCaretaker")]
    public async Task<HttpResponseData> RemoveListingCaretaker(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "listings/{id:guid}/caretaker")] HttpRequestData req,
        Guid id)
    {
        var (callerId, authError) = await RequireUserIdAsync(req);
        if (authError != null)
            return authError;

        try
        {
            var listing = await _listingService.RemoveCaretakerAsync(id, callerId);
            if (listing == null)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Listing not found");
            return await CreateJsonResponse(req, HttpStatusCode.OK, listing);
        }
        catch (UnauthorizedAccessException ex)
        {
            return await CreateErrorResponse(req, HttpStatusCode.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing caretaker");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("DeleteListing")]
    public async Task<HttpResponseData> DeleteListing(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "listings/{id:guid}")] HttpRequestData req,
        Guid id)
    {
        var (callerId, authError) = await RequireUserIdAsync(req);
        if (authError != null)
            return authError;

        try
        {
            var deleted = await _listingService.DeleteListingAsync(id, callerId);
            if (!deleted)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Listing not found");
            return req.CreateResponse(HttpStatusCode.NoContent);
        }
        catch (UnauthorizedAccessException ex)
        {
            return await CreateErrorResponse(req, HttpStatusCode.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting listing");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    private async Task<(Guid UserId, HttpResponseData? Error)> RequireUserIdAsync(HttpRequestData req)
    {
        var id = GetUserIdFromRequest(req);
        if (id != null)
            return (id.Value, null);

        if (string.Equals(_configuration["SKIP_AUTH"], "true", StringComparison.OrdinalIgnoreCase))
        {
            const string msg =
                "SKIP_AUTH is enabled: send header X-User-Id with a valid GUID equal to properties.owner_id for that property (PropertyOwner id, not listing id).";
            return (default, await CreateErrorResponse(req, HttpStatusCode.BadRequest, msg));
        }

        return (default, await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Unauthorized"));
    }

    private Guid? GetUserIdFromRequest(HttpRequestData req)
    {
        if (string.Equals(_configuration["SKIP_AUTH"], "true", StringComparison.OrdinalIgnoreCase))
        {
            if (!req.Headers.TryGetValues("X-User-Id", out var vals))
                return null;
            var s = vals.FirstOrDefault();
            return Guid.TryParse(s, out var g) ? g : null;
        }

        return null;
    }

    /// <summary>Stable, readable Redis segment: lowercased, whitespace to hyphen, length-capped.</summary>
    private static string BuildElasticLocationCacheKey(string location, int page, int pageSize)
    {
        var slug = Regex.Replace(location.Trim().ToLowerInvariant(), @"\s+", "-");
        if (slug.Length > 120)
            slug = slug[..120];
        if (string.IsNullOrEmpty(slug))
            slug = "_";
        return $"stayhere:property:listings:loc:{slug}:p{page}:s{pageSize}";
    }

    private static int GetQueryInt(HttpRequestData req, string name, int defaultValue)
    {
        var query = HttpUtility.ParseQueryString(req.Url.Query);
        var value = query[name];
        return int.TryParse(value, out var result) ? result : defaultValue;
    }

    private static async Task<HttpResponseData> CreateJsonResponse<T>(HttpRequestData req, HttpStatusCode statusCode, T content)
    {
        var response = req.CreateResponse(statusCode);
        response.Headers.Add("Content-Type", "application/json; charset=utf-8");
        await response.WriteStringAsync(JsonSerializer.Serialize(content, JsonOptions));
        return response;
    }

    private static async Task<HttpResponseData> CreateErrorResponse(HttpRequestData req, HttpStatusCode statusCode, string message)
    {
        var response = req.CreateResponse(statusCode);
        response.Headers.Add("Content-Type", "application/json; charset=utf-8");
        await response.WriteStringAsync(JsonSerializer.Serialize(new { error = message }, JsonOptions));
        return response;
    }
}
