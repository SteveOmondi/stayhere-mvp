using System.Net;
using System.Text.Json;
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
    private readonly ILogger<ListingFunctions> _logger;
    private readonly IConfiguration _configuration;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public ListingFunctions(IListingService listingService, ILogger<ListingFunctions> logger, IConfiguration configuration)
    {
        _listingService = listingService;
        _logger = logger;
        _configuration = configuration;
    }

    [Function("CreateListing")]
    public async Task<HttpResponseData> CreateListing(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "listings")] HttpRequestData req)
    {
        var ownerId = GetUserIdFromRequest(req);
        if (ownerId == null)
            return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Unauthorized");

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<CreateListingRequest>(body, JsonOptions);
            if (request == null)
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request body");

            var listing = await _listingService.CreateListingAsync(ownerId.Value, request);
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
        var ownerId = GetUserIdFromRequest(req);
        if (ownerId == null)
            return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Unauthorized");

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<CreateListingFromPropertyRequest>(body, JsonOptions);
            if (request == null)
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request body");

            var listing = await _listingService.CreateListingFromPropertyAsync(propertyId, ownerId.Value, request);
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
                ?? new ListingSearchRequest(null, null, null, null, null, null, null, null, null, null, null, null, null, null, 1, 20, null, true);
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
        var requesterId = GetUserIdFromRequest(req);
        if (requesterId == null)
            return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Unauthorized");

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<UpdateListingRequest>(body, JsonOptions);
            if (request == null)
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request body");

            var listing = await _listingService.UpdateListingAsync(id, requesterId.Value, request);
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

    [Function("UpdateListingAvailability")]
    public async Task<HttpResponseData> UpdateListingAvailability(
        [HttpTrigger(AuthorizationLevel.Anonymous, "patch", Route = "listings/{id:guid}/availability")] HttpRequestData req,
        Guid id)
    {
        var requesterId = GetUserIdFromRequest(req);
        if (requesterId == null)
            return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Unauthorized");

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<UpdateAvailabilityRequest>(body, JsonOptions);
            if (request == null)
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request body");

            var listing = await _listingService.UpdateAvailabilityAsync(id, requesterId.Value, request);
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
        var ownerId = GetUserIdFromRequest(req);
        if (ownerId == null)
            return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Unauthorized");

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<AssignAgentRequest>(body, JsonOptions);
            if (request == null)
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request body");

            var listing = await _listingService.AssignAgentAsync(id, ownerId.Value, request);
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
        var ownerId = GetUserIdFromRequest(req);
        if (ownerId == null)
            return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Unauthorized");

        try
        {
            var listing = await _listingService.RemoveAgentAsync(id, ownerId.Value);
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
        var ownerId = GetUserIdFromRequest(req);
        if (ownerId == null)
            return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Unauthorized");

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<AssignCaretakerRequest>(body, JsonOptions);
            if (request == null)
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request body");

            var listing = await _listingService.AssignCaretakerAsync(id, ownerId.Value, request);
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
        var ownerId = GetUserIdFromRequest(req);
        if (ownerId == null)
            return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Unauthorized");

        try
        {
            var listing = await _listingService.RemoveCaretakerAsync(id, ownerId.Value);
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
        var requesterId = GetUserIdFromRequest(req);
        if (requesterId == null)
            return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Unauthorized");

        try
        {
            var deleted = await _listingService.DeleteListingAsync(id, requesterId.Value);
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

    private Guid? GetUserIdFromRequest(HttpRequestData req)
    {
        if (_configuration["SKIP_AUTH"]?.ToLower() == "true")
        {
            if (req.Headers.TryGetValues("X-User-Id", out var vals))
            {
                var s = vals.FirstOrDefault();
                if (Guid.TryParse(s, out var g)) return g;
            }
            return Guid.NewGuid();
        }
        return null;
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
