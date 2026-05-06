using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Web;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StayHere.Application.Common.Interfaces;
using StayHere.Application.Properties.Models;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Attributes;
using Microsoft.OpenApi.Models;

namespace StayHere.PropertyService.Functions;

public class ListingFunctions
{
    private readonly IListingService _listingService;
    private readonly ICacheService _cacheService;
    private readonly ILogger<ListingFunctions> _logger;
    private readonly IConfiguration _configuration;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

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
    [OpenApiOperation(operationId: "CreateListing", tags: new[] { "Listings" }, Summary = "Create listing")]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(CreateListingRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.Created, contentType: "application/json", bodyType: typeof(ListingDto))]
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
    [OpenApiOperation(operationId: "CreateListingFromProperty", tags: new[] { "Listings" }, Summary = "Create listing from property")]
    [OpenApiParameter(name: "propertyId", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(CreateListingFromPropertyRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.Created, contentType: "application/json", bodyType: typeof(ListingDto))]
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
    [OpenApiOperation(operationId: "GetListingById", tags: new[] { "Listings" }, Summary = "Get listing by ID")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(ListingDto))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.NotFound, contentType: "application/json", bodyType: typeof(object))]
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
    [OpenApiOperation(operationId: "GetListingByCode", tags: new[] { "Listings" }, Summary = "Get listing by code")]
    [OpenApiParameter(name: "code", In = ParameterLocation.Path, Required = true, Type = typeof(string))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(ListingDto))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.NotFound, contentType: "application/json", bodyType: typeof(object))]
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
    [OpenApiOperation(operationId: "GetAllListings", tags: new[] { "Listings" }, Summary = "Get all listings paginated")]
    [OpenApiParameter(name: "page", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
    [OpenApiParameter(name: "pageSize", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(PaginatedResult<ListingListDto>))]
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
    [OpenApiOperation(operationId: "GetListingsByProperty", tags: new[] { "Listings" }, Summary = "Get listings by property ID")]
    [OpenApiParameter(name: "propertyId", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiParameter(name: "page", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
    [OpenApiParameter(name: "pageSize", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(PaginatedResult<ListingListDto>))]
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
    [OpenApiOperation(operationId: "GetListingsByOwner", tags: new[] { "Listings" }, Summary = "Get listings by owner ID")]
    [OpenApiParameter(name: "ownerId", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiParameter(name: "page", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
    [OpenApiParameter(name: "pageSize", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(PaginatedResult<ListingListDto>))]
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
    [OpenApiOperation(operationId: "GetListingsByCity", tags: new[] { "Listings" }, Summary = "Get listings by city")]
    [OpenApiParameter(name: "city", In = ParameterLocation.Path, Required = true, Type = typeof(string))]
    [OpenApiParameter(name: "page", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
    [OpenApiParameter(name: "pageSize", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(PaginatedResult<ListingListDto>))]
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
    [OpenApiOperation(operationId: "GetListingsByCounty", tags: new[] { "Listings" }, Summary = "Get listings by county")]
    [OpenApiParameter(name: "county", In = ParameterLocation.Path, Required = true, Type = typeof(string))]
    [OpenApiParameter(name: "page", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
    [OpenApiParameter(name: "pageSize", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(PaginatedResult<ListingListDto>))]
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
    [OpenApiOperation(operationId: "GetListingsByLocation", tags: new[] { "Listings" }, Summary = "Elastic search listings by location")]
    [OpenApiParameter(name: "location", In = ParameterLocation.Query, Required = true, Type = typeof(string))]
    [OpenApiParameter(name: "page", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
    [OpenApiParameter(name: "pageSize", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(PaginatedResult<ListingListDto>))]
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
    [OpenApiOperation(operationId: "GetListingsByType", tags: new[] { "Listings" }, Summary = "Get listings by property type")]
    [OpenApiParameter(name: "propertyType", In = ParameterLocation.Path, Required = true, Type = typeof(string))]
    [OpenApiParameter(name: "page", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
    [OpenApiParameter(name: "pageSize", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(PaginatedResult<ListingListDto>))]
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
    [OpenApiOperation(operationId: "GetListingsByListingType", tags: new[] { "Listings" }, Summary = "Get listings by listing type")]
    [OpenApiParameter(name: "listingType", In = ParameterLocation.Path, Required = true, Type = typeof(string))]
    [OpenApiParameter(name: "page", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
    [OpenApiParameter(name: "pageSize", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(PaginatedResult<ListingListDto>))]
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
    [OpenApiOperation(operationId: "GetFeaturedListings", tags: new[] { "Listings" }, Summary = "Get featured listings")]
    [OpenApiParameter(name: "limit", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<ListingListDto>))]
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
    [OpenApiOperation(operationId: "GetAvailableListings", tags: new[] { "Listings" }, Summary = "Get available listings")]
    [OpenApiParameter(name: "page", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
    [OpenApiParameter(name: "pageSize", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(PaginatedResult<ListingListDto>))]
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
    [OpenApiOperation(operationId: "SearchListings", tags: new[] { "Listings" }, Summary = "Search listings")]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(ListingSearchRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(PaginatedResult<ListingListDto>))]
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
    [OpenApiOperation(operationId: "UpdateListing", tags: new[] { "Listings" }, Summary = "Update listing")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(UpdateListingRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(ListingDto))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.NotFound, contentType: "application/json", bodyType: typeof(object))]
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
    [OpenApiOperation(operationId: "RegenerateListingEmbedding", tags: new[] { "Listings" }, Summary = "Regenerate listing embedding")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(ListingDto))]
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
    [OpenApiOperation(operationId: "UpdateListingAvailability", tags: new[] { "Listings" }, Summary = "Update listing availability")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(UpdateAvailabilityRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(ListingDto))]
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
    [OpenApiOperation(operationId: "UpdateListingRating", tags: new[] { "Listings" }, Summary = "Update listing rating")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(UpdateRatingRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(ListingDto))]
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
    [OpenApiOperation(operationId: "IncrementListingViews", tags: new[] { "Listings" }, Summary = "Increment listing views")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(object))]
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
    [OpenApiOperation(operationId: "UpdateListingFeatured", tags: new[] { "Listings" }, Summary = "Update listing featured status")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(UpdateFeaturedRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(ListingDto))]
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
    [OpenApiOperation(operationId: "AssignListingAgent", tags: new[] { "Listings" }, Summary = "Assign agent to listing")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(AssignAgentRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(ListingDto))]
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
    [OpenApiOperation(operationId: "RemoveListingAgent", tags: new[] { "Listings" }, Summary = "Remove agent from listing")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(ListingDto))]
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
    [OpenApiOperation(operationId: "AssignListingCaretaker", tags: new[] { "Listings" }, Summary = "Assign caretaker to listing")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(AssignCaretakerRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(ListingDto))]
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
    [OpenApiOperation(operationId: "RemoveListingCaretaker", tags: new[] { "Listings" }, Summary = "Remove caretaker from listing")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(ListingDto))]
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
    [OpenApiOperation(operationId: "DeleteListing", tags: new[] { "Listings" }, Summary = "Delete listing")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiResponseWithoutBody(statusCode: HttpStatusCode.NoContent)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.NotFound, contentType: "application/json", bodyType: typeof(object))]
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

        if (!req.Headers.TryGetValues("Authorization", out var authValues))
            return null;

        var authHeader = authValues.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(authHeader))
            return null;

        const string bearerPrefix = "Bearer ";
        if (!authHeader.StartsWith(bearerPrefix, StringComparison.OrdinalIgnoreCase))
            return null;

        var token = authHeader[bearerPrefix.Length..].Trim();
        return TryExtractUserIdFromJwt(token);
    }

    private static Guid? TryExtractUserIdFromJwt(string token)
    {
        var parts = token.Split('.');
        if (parts.Length < 2)
            return null;

        var payloadJson = TryDecodeBase64Url(parts[1]);
        if (string.IsNullOrEmpty(payloadJson))
            return null;

        using var doc = JsonDocument.Parse(payloadJson);
        var root = doc.RootElement;
        var candidateClaims = new[] { "nameid", "sub", "oid", "userId", "user_id" };
        foreach (var claim in candidateClaims)
        {
            if (!root.TryGetProperty(claim, out var claimValue) || claimValue.ValueKind != JsonValueKind.String)
                continue;

            var value = claimValue.GetString();
            if (Guid.TryParse(value, out var guid))
                return guid;
        }

        return null;
    }

    private static string? TryDecodeBase64Url(string input)
    {
        var padded = input.Replace('-', '+').Replace('_', '/');
        switch (padded.Length % 4)
        {
            case 2:
                padded += "==";
                break;
            case 3:
                padded += "=";
                break;
            case 0:
                break;
            default:
                return null;
        }

        try
        {
            var bytes = Convert.FromBase64String(padded);
            return Encoding.UTF8.GetString(bytes);
        }
        catch
        {
            return null;
        }
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
