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

public class PropertyFunctions
{
    private readonly IPropertyService _propertyService;
    private readonly ILogger<PropertyFunctions> _logger;
    private readonly IConfiguration _configuration;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public PropertyFunctions(IPropertyService propertyService, ILogger<PropertyFunctions> logger, IConfiguration configuration)
    {
        _propertyService = propertyService;
        _logger = logger;
        _configuration = configuration;
    }

    [Function("CreateProperty")]
    public async Task<HttpResponseData> CreateProperty(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "properties")] HttpRequestData req)
    {
        var ownerId = GetUserIdFromRequest(req);
        if (ownerId == null)
            return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Unauthorized");

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<CreatePropertyRequest>(body, JsonOptions);
            if (request == null)
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request body");

            var property = await _propertyService.CreatePropertyAsync(ownerId.Value, request);
            return await CreateJsonResponse(req, HttpStatusCode.Created, property);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating property");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("GetPropertyById")]
    public async Task<HttpResponseData> GetPropertyById(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "properties/{id:guid}")] HttpRequestData req,
        Guid id)
    {
        try
        {
            var property = await _propertyService.GetPropertyByIdAsync(id);
            if (property == null)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Property not found");
            return await CreateJsonResponse(req, HttpStatusCode.OK, property);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting property");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("GetPropertyByCode")]
    public async Task<HttpResponseData> GetPropertyByCode(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "properties/code/{code}")] HttpRequestData req,
        string code)
    {
        try
        {
            var property = await _propertyService.GetPropertyByCodeAsync(code);
            if (property == null)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Property not found");
            return await CreateJsonResponse(req, HttpStatusCode.OK, property);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting property");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("GetAllProperties")]
    public async Task<HttpResponseData> GetAllProperties(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "api/properties")] HttpRequestData req)
    {
        try
        {
            var page = GetQueryInt(req, "page", 1);
            var pageSize = GetQueryInt(req, "pageSize", 20);
            var result = await _propertyService.GetAllPropertiesAsync(page, pageSize);
            return await CreateJsonResponse(req, HttpStatusCode.OK, result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting properties");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("GetPropertiesByOwner")]
    public async Task<HttpResponseData> GetPropertiesByOwner(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "properties/owner/{ownerId:guid}")] HttpRequestData req,
        Guid ownerId)
    {
        try
        {
            var page = GetQueryInt(req, "page", 1);
            var pageSize = GetQueryInt(req, "pageSize", 20);
            var result = await _propertyService.GetPropertiesByOwnerAsync(ownerId, page, pageSize);
            return await CreateJsonResponse(req, HttpStatusCode.OK, result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting properties");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("UpdateProperty")]
    public async Task<HttpResponseData> UpdateProperty(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "properties/{id:guid}")] HttpRequestData req,
        Guid id)
    {
        var requesterId = GetUserIdFromRequest(req);
        if (requesterId == null)
            return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Unauthorized");

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<UpdatePropertyRequest>(body, JsonOptions);
            if (request == null)
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request body");

            var property = await _propertyService.UpdatePropertyAsync(id, requesterId.Value, request);
            if (property == null)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Property not found");
            return await CreateJsonResponse(req, HttpStatusCode.OK, property);
        }
        catch (UnauthorizedAccessException ex)
        {
            return await CreateErrorResponse(req, HttpStatusCode.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating property");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("DeleteProperty")]
    public async Task<HttpResponseData> DeleteProperty(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "properties/{id:guid}")] HttpRequestData req,
        Guid id)
    {
        var requesterId = GetUserIdFromRequest(req);
        if (requesterId == null)
            return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Unauthorized");

        try
        {
            var deleted = await _propertyService.DeletePropertyAsync(id, requesterId.Value);
            if (!deleted)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Property not found");
            return req.CreateResponse(HttpStatusCode.NoContent);
        }
        catch (UnauthorizedAccessException ex)
        {
            return await CreateErrorResponse(req, HttpStatusCode.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting property");
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
