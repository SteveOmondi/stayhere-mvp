using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Specialized;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StayHere.Application.Common.Interfaces;
using System.Text;

namespace StayHere.Infrastructure.Logging;

public class FileLoggingService : IFileLoggingService
{
    private readonly BlobServiceClient _blobServiceClient;
    private readonly string _containerName;
    private readonly ILogger<FileLoggingService> _logger;

    public FileLoggingService(IConfiguration configuration, ILogger<FileLoggingService> logger)
    {
        _logger = logger;

        var connectionString = configuration["LogStorageConnectionString"]
                               ?? configuration["AzureWebJobsStorage"]
                               ?? throw new InvalidOperationException("Storage connection string (LogStorageConnectionString or AzureWebJobsStorage) is not configured.");

        _blobServiceClient = new BlobServiceClient(connectionString);
        _containerName = configuration["LogContainerName"] ?? "logs";
    }

    public async Task AppendLogAsync(string? customerId, string content)
    {
        try
        {
            var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
            await containerClient.CreateIfNotExistsAsync();

            var dateStr = DateTime.UtcNow.ToString("yyyy-MM-dd");
            var filename = string.IsNullOrWhiteSpace(customerId) ? "system.log" : $"{customerId.Trim()}.log";
            var blobPath = $"{dateStr}/{filename}";

            var appendBlobClient = containerClient.GetAppendBlobClient(blobPath);
            await appendBlobClient.CreateIfNotExistsAsync();

            var timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss.fff");
            var logLine = $"[{timestamp}] {content}\n";
            var bytes = Encoding.UTF8.GetBytes(logLine);

            using var stream = new MemoryStream(bytes);
            await appendBlobClient.AppendBlockAsync(stream);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to append log to blob storage for customer: {CustomerId}", customerId);
            throw;
        }
    }

    public async Task<string> ReadLogAsync(string? customerId, string date)
    {
        try
        {
            var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
            if (!await containerClient.ExistsAsync())
            {
                return string.Empty;
            }

            var filename = string.IsNullOrWhiteSpace(customerId) ? "system.log" : $"{customerId.Trim()}.log";
            var blobPath = $"{date}/{filename}";

            var blobClient = containerClient.GetBlobClient(blobPath);
            if (!await blobClient.ExistsAsync())
            {
                return string.Empty;
            }

            var response = await blobClient.DownloadContentAsync();
            return response.Value.Content.ToString();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to read log from blob storage for customer: {CustomerId}, date: {Date}", customerId, date);
            throw;
        }
    }
}
