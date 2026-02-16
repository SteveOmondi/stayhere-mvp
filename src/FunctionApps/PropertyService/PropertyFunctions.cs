using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using StayHere.Application.Common.Interfaces;
using StayHere.Application.Properties.Models;
using StayHere.Shared.Attributes;
using System.Text.Json;

namespace StayHere.PropertyService.Functions;

public class PropertyFunctions
{
    private readonly IPropertyService _propertyService;
    private readonly ILogger<PropertyFunctions> _logger;

    public PropertyFunctions(IPropertyService propertyService, ILogger<PropertyFunctions> logger)
    {
        _propertyService = propertyService;
        _logger = logger;
    }

    [Function("CreateProperty")]
    [Authorize("PropertyOwner")]
    public async Task<HttpResponseData> CreateProperty(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post")] HttpRequestData req)
    {
        _logger.LogInformation("Processing CreateProperty request.");

        // Get OwnerId from the authorized user context attached by middleware
        var user = req.FunctionContext.Items["User"] as System.Security.Claims.ClaimsPrincipal;
        var ownerIdStr = user?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        
        if (!Guid.TryParse(ownerIdStr, out var ownerId))
        {
            return req.CreateResponse(HttpStatusCode.Unauthorized);
        }

        var body = await new StreamReader(req.Body).ReadToEndAsync();
        var request = JsonSerializer.Deserialize<CreatePropertyRequest>(body, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        if (request == null) return req.CreateResponse(HttpStatusCode.BadRequest);

        try
        {
            var result = await _propertyService.CreatePropertyAsync(ownerId, request);
            var response = req.CreateResponse(HttpStatusCode.Created);
            await response.WriteAsJsonAsync(result);
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating property");
            var res = req.CreateResponse(HttpStatusCode.InternalServerError);
            await res.WriteStringAsync(ex.Message);
            return res;
        }
    }

    [Function("GetPortfolio")]
    [Authorize("PropertyOwner")]
    public async Task<HttpResponseData> GetPortfolio(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequestData req)
    {
        _logger.LogInformation("Processing GetPortfolio request.");

        var user = req.FunctionContext.Items["User"] as System.Security.Claims.ClaimsPrincipal;
        var ownerIdStr = user?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        if (!Guid.TryParse(ownerIdStr, out var ownerId))
        {
            return req.CreateResponse(HttpStatusCode.Unauthorized);
        }

        try
        {
            var portfolio = await _propertyService.GetOwnerPortfolioAsync(ownerId);
            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteAsJsonAsync(portfolio);
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching portfolio");
            return req.CreateResponse(HttpStatusCode.InternalServerError);
        }
    }
}
