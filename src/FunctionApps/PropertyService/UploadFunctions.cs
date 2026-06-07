using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using StayHere.Application.Common.Interfaces;
using StayHere.Application.Properties.Models;
using StayHere.Shared.Attributes;

namespace StayHere.PropertyService.Functions;

public class UploadFunctions
{
    private readonly IImageUploadService _uploadService;
    private readonly ILogger<UploadFunctions> _logger;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public UploadFunctions(IImageUploadService uploadService, ILogger<UploadFunctions> logger)
    {
        _uploadService = uploadService;
        _logger = logger;
    }

    [Function("RequestImageUploadUrl")]
    [Authorize("PropertyOwner", "PropertyManager", "Admin")]
    public async Task<HttpResponseData> RequestImageUploadUrl(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "upload/request-url")] HttpRequestData req)
    {
        _logger.LogInformation("Requesting Cloudflare direct upload URL");
        try
        {
            var result = await _uploadService.GetDirectUploadUrlAsync();
            var response = req.CreateResponse(HttpStatusCode.OK);
            response.Headers.Add("Content-Type", "application/json; charset=utf-8");
            await response.WriteStringAsync(JsonSerializer.Serialize(
                new ImageUploadUrlResponse(result.UploadUrl, result.ImageId, result.PublicUrl),
                JsonOptions));
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get Cloudflare upload URL");
            var err = req.CreateResponse(HttpStatusCode.InternalServerError);
            err.Headers.Add("Content-Type", "application/json; charset=utf-8");
            await err.WriteStringAsync(JsonSerializer.Serialize(new { error = ex.Message }, JsonOptions));
            return err;
        }
    }
}
