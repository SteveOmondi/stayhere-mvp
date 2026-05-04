using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StayHere.Application.Common.Interfaces;
using StayHere.Infrastructure.Notifications.Models;

namespace StayHere.Infrastructure.Notifications;

public class NotificationService : INotificationService
{
    private readonly HttpClient _httpClient;
    private readonly OnFonSmsOptions _options;
    private readonly ILogger<NotificationService> _logger;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public NotificationService(
        HttpClient httpClient,
        IOptions<OnFonSmsOptions> options,
        ILogger<NotificationService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public Task SendEmailAsync(string to, string subject, string body)
    {
        // Mocking email send
        _logger.LogInformation("Email sent to {to}: {subject} - {body}", to, subject, body);
        return Task.CompletedTask;
    }

    public async Task SendSmsAsync(string to, string message)
    {
        _logger.LogInformation("Sending SMS via OnFon to {to}", to);

        try
        {
            var payload = new OnFonSmsRequest(
                _options.SenderId,
                new List<OnFonMessageParameter> { new(to, message) },
                _options.ApiKey,
                _options.ClientId
            );

            var jsonPayload = JsonSerializer.Serialize(payload, JsonOptions);
            var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync($"{_options.BaseUrl}/v1/sms/SendBulkSMS", content);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("OnFon SMS failed. Status: {Status}, Body: {Body}", response.StatusCode, responseBody);
                return;
            }

            var apiResponse = JsonSerializer.Deserialize<OnFonApiResponse>(responseBody, JsonOptions);
            
            if (apiResponse != null && apiResponse.ErrorCode != 0)
            {
                _logger.LogWarning("OnFon API returned error: {Desc} ({Code})", apiResponse.ErrorDescription, apiResponse.ErrorCode);
            }
            else
            {
                var msgId = apiResponse?.Data?.FirstOrDefault()?.MessageId;
                _logger.LogInformation("SMS sent successfully to {to}. MessageId: {MsgId}", to, msgId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending SMS via OnFon to {to}", to);
        }
    }

    public Task SendWhatsAppAsync(string to, string message)
    {
        // Mocking WhatsApp send
        _logger.LogInformation("WhatsApp sent to {to}: {message}", to, message);
        return Task.CompletedTask;
    }
}
