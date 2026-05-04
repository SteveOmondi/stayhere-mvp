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

    public async Task<bool> SendSmsAsync(string to, string message)
    {
        var formattedNumber = FormatPhoneNumber(to);
        _logger.LogInformation("Sending SMS via OnFon to {to} (Formatted: {formatted})", to, formattedNumber);

        try
        {
            var payload = new OnFonSmsRequest(
                _options.SenderId,
                new List<OnFonMessageParameter> { new(formattedNumber, message) },
                _options.ApiKey,
                _options.ClientId
            );

            var jsonPayload = JsonSerializer.Serialize(payload, JsonOptions);
            var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync($"{_options.BaseUrl}/v1/sms/SendBulkSMS", content);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("OnFon SMS HTTP failure. Status: {Status}, Body: {Body}", response.StatusCode, responseBody);
                return false;
            }

            var apiResponse = JsonSerializer.Deserialize<OnFonApiResponse>(responseBody, JsonOptions);
            
            if (apiResponse != null && apiResponse.ErrorCode != 0)
            {
                _logger.LogError("OnFon API returned error: {Desc} ({Code}). Body: {Body}", 
                    apiResponse.ErrorDescription, apiResponse.ErrorCode, responseBody);
                return false;
            }
            
            var msgId = apiResponse?.Data?.FirstOrDefault()?.MessageId;
            _logger.LogInformation("SMS sent successfully to {to}. MessageId: {MsgId}", formattedNumber, msgId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception sending SMS via OnFon to {to}", to);
            return false;
        }
    }

    private string FormatPhoneNumber(string number)
    {
        if (string.IsNullOrWhiteSpace(number)) return number;

        // Remove all non-digits
        var clean = new string(number.Where(char.IsDigit).ToArray());

        // Handle Kenya numbers starting with 07 or 01
        if (clean.StartsWith("0") && clean.Length == 10)
        {
            return "254" + clean.Substring(1);
        }

        // Already starts with 254
        if (clean.StartsWith("254") && clean.Length == 12)
        {
            return clean;
        }

        // If it starts with +, remove it and return (assuming it's already international)
        return clean;
    }

    public Task SendWhatsAppAsync(string to, string message)
    {
        // Mocking WhatsApp send
        _logger.LogInformation("WhatsApp sent to {to}: {message}", to, message);
        return Task.CompletedTask;
    }
}
