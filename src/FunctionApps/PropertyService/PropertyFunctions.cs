using System.Net;
using System.Text;
using System.Text.Json;
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

public class PropertyFunctions
{
    private readonly IPropertyService _propertyService;
    private readonly ILogger<PropertyFunctions> _logger;
    private readonly IConfiguration _configuration;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public PropertyFunctions(IPropertyService propertyService, ILogger<PropertyFunctions> logger, IConfiguration configuration)
    {
        _propertyService = propertyService;
        _logger = logger;
        _configuration = configuration;
    }

    [Function("CreateProperty")]
    [OpenApiOperation(operationId: "CreateProperty", tags: new[] { "Properties" }, Summary = "Create property")]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(CreatePropertyRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.Created, contentType: "application/json", bodyType: typeof(PropertyDto))]
    public async Task<HttpResponseData> CreateProperty(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "properties")] HttpRequestData req)
    {
        var (callerId, authError) = await RequireUserIdAsync(req);
        if (authError != null)
            return authError;

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<CreatePropertyRequest>(body, JsonOptions);
            if (request == null)
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request body");

            var property = await _propertyService.CreatePropertyAsync(callerId, request);
            return await CreateJsonResponse(req, HttpStatusCode.Created, property);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating property");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("GetPropertyById")]
    [OpenApiOperation(operationId: "GetPropertyById", tags: new[] { "Properties" }, Summary = "Get property by ID")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(PropertyDto))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.NotFound, contentType: "application/json", bodyType: typeof(object))]
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
    [OpenApiOperation(operationId: "GetPropertyByCode", tags: new[] { "Properties" }, Summary = "Get property by code")]
    [OpenApiParameter(name: "code", In = ParameterLocation.Path, Required = true, Type = typeof(string))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(PropertyDto))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.NotFound, contentType: "application/json", bodyType: typeof(object))]
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
    [OpenApiOperation(operationId: "GetAllProperties", tags: new[] { "Properties" }, Summary = "Get all properties paginated")]
    [OpenApiParameter(name: "page", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
    [OpenApiParameter(name: "pageSize", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(PaginatedResult<PropertyListDto>))]
    public async Task<HttpResponseData> GetAllProperties(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "properties")] HttpRequestData req)
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
    [OpenApiOperation(operationId: "GetPropertiesByOwner", tags: new[] { "Properties" }, Summary = "Get properties by owner")]
    [OpenApiParameter(name: "ownerId", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiParameter(name: "page", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
    [OpenApiParameter(name: "pageSize", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(PaginatedResult<PropertyListDto>))]
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
    [OpenApiOperation(operationId: "UpdateProperty", tags: new[] { "Properties" }, Summary = "Update property")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(UpdatePropertyRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(PropertyDto))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.NotFound, contentType: "application/json", bodyType: typeof(object))]
    public async Task<HttpResponseData> UpdateProperty(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "properties/{id:guid}")] HttpRequestData req,
        Guid id)
    {
        var (callerId, authError) = await RequireUserIdAsync(req);
        if (authError != null)
            return authError;

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<UpdatePropertyRequest>(body, JsonOptions);
            if (request == null)
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request body");

            var property = await _propertyService.UpdatePropertyAsync(id, callerId, request);
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
    [OpenApiOperation(operationId: "DeleteProperty", tags: new[] { "Properties" }, Summary = "Delete property")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiResponseWithoutBody(statusCode: HttpStatusCode.NoContent)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.NotFound, contentType: "application/json", bodyType: typeof(object))]
    public async Task<HttpResponseData> DeleteProperty(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "properties/{id:guid}")] HttpRequestData req,
        Guid id)
    {
        var (callerId, authError) = await RequireUserIdAsync(req);
        if (authError != null)
            return authError;

        try
        {
            var deleted = await _propertyService.DeletePropertyAsync(id, callerId);
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

    private async Task<(Guid UserId, HttpResponseData? Error)> RequireUserIdAsync(HttpRequestData req)
    {
        var id = GetUserIdFromRequest(req);
        if (id != null)
            return (id.Value, null);

        if (string.Equals(_configuration["SKIP_AUTH"], "true", StringComparison.OrdinalIgnoreCase))
        {
            const string msg =
                "SKIP_AUTH is enabled: send header X-User-Id with a valid GUID equal to properties.owner_id (PropertyOwner id).";
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
