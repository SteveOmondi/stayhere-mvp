using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using StayHere.Application.Common.Interfaces;
using StayHere.Application.StaticData.Models;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Attributes;
using StayHere.Shared.Attributes;

namespace StayHere.StaticDataService.Functions;

public class FurnitureCatalogFunctions
{
    private readonly IFurnitureCatalogService _furnitureCatalogService;
    private readonly ILogger<FurnitureCatalogFunctions> _logger;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public FurnitureCatalogFunctions(IFurnitureCatalogService furnitureCatalogService, ILogger<FurnitureCatalogFunctions> logger)
    {
        _furnitureCatalogService = furnitureCatalogService;
        _logger = logger;
    }

    [Function("GetFurnitureCatalog")]
    [AllowAnonymous]
    [OpenApiOperation(operationId: "GetFurnitureCatalog", tags: new[] { "StaticData" }, Summary = "Get the furniture catalog used to render 3D/3D-Live floor plans")]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<FurnitureCatalogItemDto>))]
    public async Task<HttpResponseData> GetFurnitureCatalog(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "furniture-catalog")] HttpRequestData req)
    {
        try
        {
            var catalog = _furnitureCatalogService.GetCatalog();
            var response = req.CreateResponse(HttpStatusCode.OK);
            response.Headers.Add("Content-Type", "application/json; charset=utf-8");
            await response.WriteStringAsync(JsonSerializer.Serialize(catalog, JsonOptions));
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting furniture catalog");
            var response = req.CreateResponse(HttpStatusCode.InternalServerError);
            response.Headers.Add("Content-Type", "application/json; charset=utf-8");
            await response.WriteStringAsync(JsonSerializer.Serialize(new { error = "Failed to retrieve furniture catalog" }, JsonOptions));
            return response;
        }
    }
}
