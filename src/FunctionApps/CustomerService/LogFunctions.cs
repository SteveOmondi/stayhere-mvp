using System.Net;
using System.Security.Claims;
using System.Text.Json;
using System.Web;
using System.IO;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StayHere.Application.Common.Interfaces;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Attributes;
using Microsoft.OpenApi.Models;
using StayHere.Shared.Attributes;

namespace StayHere.FunctionApps.CustomerService;

public record WriteLogRequest(string? CustomerId, string Content);

public class LogFunctions
{
    private readonly IFileLoggingService _loggingService;
    private readonly ILogger<LogFunctions> _logger;
    private readonly IConfiguration _configuration;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public LogFunctions(IFileLoggingService loggingService, ILogger<LogFunctions> logger, IConfiguration configuration)
    {
        _loggingService = loggingService;
        _logger = logger;
        _configuration = configuration;
    }

    [Function("WriteLog")]
    [Authorize]
    [OpenApiOperation(operationId: "WriteLog", tags: new[] { "Logs" }, Summary = "Write a daily log entry")]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(WriteLogRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.Accepted, contentType: "application/json", bodyType: typeof(object))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.BadRequest, contentType: "application/json", bodyType: typeof(object))]
    public async Task<HttpResponseData> WriteLog(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "logs")] HttpRequestData req)
    {
        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<WriteLogRequest>(body, JsonOptions);

            if (request == null || string.IsNullOrWhiteSpace(request.Content))
            {
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Content is required");
            }

            await _loggingService.AppendLogAsync(request.CustomerId, request.Content);

            var response = req.CreateResponse(HttpStatusCode.Accepted);
            response.Headers.Add("Content-Type", "application/json; charset=utf-8");
            await response.WriteStringAsync(JsonSerializer.Serialize(new { status = "success" }, JsonOptions));
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error writing log");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("ReadLog")]
    [Authorize]
    [OpenApiOperation(operationId: "ReadLog", tags: new[] { "Logs" }, Summary = "Read daily log file content")]
    [OpenApiParameter(name: "customerId", In = ParameterLocation.Query, Required = false, Type = typeof(string))]
    [OpenApiParameter(name: "date", In = ParameterLocation.Query, Required = true, Type = typeof(string))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "text/plain", bodyType: typeof(string))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.Forbidden, contentType: "application/json", bodyType: typeof(object))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.NotFound, contentType: "application/json", bodyType: typeof(object))]
    public async Task<HttpResponseData> ReadLog(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "logs")] HttpRequestData req)
    {
        try
        {
            var query = HttpUtility.ParseQueryString(req.Url.Query);
            var customerId = query["customerId"];
            var date = query["date"];

            if (string.IsNullOrWhiteSpace(date))
            {
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Date filter is required (format: yyyy-MM-dd)");
            }

            // Auth Check
            var callerId = GetUserIdFromRequest(req);
            if (callerId == null)
            {
                return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Unauthorized");
            }

            if (req.FunctionContext.Items.TryGetValue("User", out var principalObj) && principalObj is ClaimsPrincipal principal)
            {
                var isAdmin = principal.IsInRole("Admin");
                if (!isAdmin)
                {
                    // Regular users can only read their own logs
                    if (string.IsNullOrWhiteSpace(customerId) || customerId != callerId.ToString())
                    {
                        return await CreateErrorResponse(req, HttpStatusCode.Forbidden, "Forbidden: You are not authorized to view these logs.");
                    }
                }
            }
            else if (!string.Equals(_configuration["SKIP_AUTH"], "true", StringComparison.OrdinalIgnoreCase))
            {
                return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Unauthorized");
            }

            var logContent = await _loggingService.ReadLogAsync(customerId, date);
            if (string.IsNullOrEmpty(logContent))
            {
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Log file not found");
            }

            var response = req.CreateResponse(HttpStatusCode.OK);
            response.Headers.Add("Content-Type", "text/plain; charset=utf-8");
            await response.WriteStringAsync(logContent);
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reading log");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
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

    private static async Task<HttpResponseData> CreateErrorResponse(HttpRequestData req, HttpStatusCode statusCode, string message)
    {
        var response = req.CreateResponse(statusCode);
        response.Headers.Add("Content-Type", "application/json; charset=utf-8");
        await response.WriteStringAsync(JsonSerializer.Serialize(new { error = message }, JsonOptions));
        return response;
    }
}
