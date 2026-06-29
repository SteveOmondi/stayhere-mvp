using System.Net;
using System.Text.Json;
using System.Web;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Security.Claims;
using StayHere.Application.Common.Interfaces;
using StayHere.Application.Properties.Models;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Attributes;
using Microsoft.OpenApi.Models;
using StayHere.Shared.Attributes;

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
    [Authorize("PropertyOwner", "PropertyManager", "Admin")]
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
    [AllowAnonymous]
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
    [AllowAnonymous]
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
    [Authorize("Admin")]
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
    [Authorize("PropertyOwner", "PropertyManager", "Admin")]
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
    [Authorize("PropertyOwner", "PropertyManager", "Admin")]
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
    [Authorize("PropertyOwner", "PropertyManager", "Admin")]
    [OpenApiOperation(operationId: "DeleteProperty", tags: new[] { "Properties" }, Summary = "Delete property")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(object))]
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
            return await CreateJsonResponse(req, HttpStatusCode.OK, new { message = "Deactivated successfully" });
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
            return Guid.TryParse(s, out var headerGuid) ? headerGuid : null;
        }

        if (!req.FunctionContext.Items.TryGetValue("User", out var principalObj))
            return null;

        if (principalObj is not ClaimsPrincipal principal)
            return null;

        var id = principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal.FindFirstValue("nameid");
        return Guid.TryParse(id, out var claimsGuid) ? claimsGuid : null;
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
