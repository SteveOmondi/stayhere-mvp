using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StayHere.Application.Common.Interfaces;

namespace StayHere.Infrastructure.Cloudflare;

public class CloudflareImagesService : IImageUploadService
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly ILogger<CloudflareImagesService> _logger;
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public CloudflareImagesService(HttpClient http, IConfiguration config, ILogger<CloudflareImagesService> logger)
    {
        _http = http;
        _config = config;
        _logger = logger;
    }

    public async Task<UploadUrlResult> GetDirectUploadUrlAsync()
    {
        var accountId = _config["CLOUDFLARE_ACCOUNT_ID"]
            ?? throw new InvalidOperationException("CLOUDFLARE_ACCOUNT_ID not configured");
        var apiToken = _config["CLOUDFLARE_API_TOKEN"]
            ?? throw new InvalidOperationException("CLOUDFLARE_API_TOKEN not configured");
        var accountHash = _config["CLOUDFLARE_IMAGES_ACCOUNT_HASH"]
            ?? throw new InvalidOperationException("CLOUDFLARE_IMAGES_ACCOUNT_HASH not configured");

        var url = $"https://api.cloudflare.com/client/v4/accounts/{accountId}/images/v2/direct_upload";
        using var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiToken);
        request.Content = new StringContent(
            JsonSerializer.Serialize(new { requireSignedURLs = false }, Json),
            System.Text.Encoding.UTF8,
            "application/json");

        var response = await _http.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Cloudflare Images API error {Status}: {Body}", response.StatusCode, body);
            throw new InvalidOperationException($"Cloudflare Images API returned {response.StatusCode}");
        }

        using var doc = JsonDocument.Parse(body);
        var result = doc.RootElement.GetProperty("result");
        var imageId = result.GetProperty("id").GetString()!;
        var uploadUrl = result.GetProperty("uploadURL").GetString()!;
        var publicUrl = $"https://imagedelivery.net/{accountHash}/{imageId}/public";

        return new UploadUrlResult(uploadUrl, imageId, publicUrl);
    }
}
