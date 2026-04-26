using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using StayHere.Application.AiAgent.Models;
using StayHere.Application.Common.Interfaces;

namespace StayHere.FunctionApps.AiAgentService;

public class AgentFunctions
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IAiAgentService _agentService;
    private readonly ILogger<AgentFunctions> _logger;

    public AgentFunctions(IAiAgentService agentService, ILogger<AgentFunctions> logger)
    {
        _agentService = agentService;
        _logger = logger;
    }

    [Function("AgentChat")]
    public async Task<HttpResponseData> Chat(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "chat")] HttpRequestData req)
    {
        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var chatRequest = JsonSerializer.Deserialize<AgentChatRequest>(body, JsonOptions);
            if (chatRequest == null || string.IsNullOrWhiteSpace(chatRequest.Query))
            {
                return await WriteJsonAsync(req, HttpStatusCode.BadRequest, new { error = "Invalid request. Query is required." });
            }

            var response = await _agentService.ChatAsync(chatRequest);
            return await WriteJsonAsync(req, HttpStatusCode.OK, response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Agent chat failed");
            return await WriteJsonAsync(req, HttpStatusCode.InternalServerError, new { error = "Internal server error", message = ex.Message });
        }
    }

    [Function("AgentRespondAndRecommend")]
    public async Task<HttpResponseData> RespondAndRecommend(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "respondandrecommend")] HttpRequestData req)
    {
        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var recommendRequest = JsonSerializer.Deserialize<AgentRecommendRequest>(body, JsonOptions);
            if (recommendRequest == null || string.IsNullOrWhiteSpace(recommendRequest.Query))
            {
                return await WriteJsonAsync(req, HttpStatusCode.BadRequest, new { error = "Invalid request. Query is required." });
            }

            var response = await _agentService.RecommendAsync(recommendRequest);
            return await WriteJsonAsync(req, HttpStatusCode.OK, response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Agent recommend failed");
            return await WriteJsonAsync(req, HttpStatusCode.InternalServerError, new { error = "Internal server error", message = ex.Message });
        }
    }

    [Function("AgentKnowledgeStatus")]
    public async Task<HttpResponseData> KnowledgeStatus(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "knowledge/status")] HttpRequestData req)
    {
        try
        {
            var status = await _agentService.GetKnowledgeBaseStatusAsync();
            return await WriteJsonAsync(req, HttpStatusCode.OK, status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Knowledge status failed");
            return await WriteJsonAsync(req, HttpStatusCode.InternalServerError, new { error = ex.Message });
        }
    }

    [Function("AgentSearchListings")]
    public async Task<HttpResponseData> SearchListings(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "listings")] HttpRequestData req)
    {
        try
        {
            var q = ParseQueryString(req.Url.Query);
            var searchRequest = new AgentListingSearchRequest(
                q.GetValueOrDefault("listing_id"),
                q.GetValueOrDefault("listing_code"),
                q.GetValueOrDefault("location"),
                q.GetValueOrDefault("amenity"));

            var result = await _agentService.SearchListingsAsync(searchRequest);
            return await WriteJsonAsync(req, HttpStatusCode.OK, result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Agent listing search failed");
            return await WriteJsonAsync(req, HttpStatusCode.InternalServerError, new { error = ex.Message });
        }
    }

    [Function("AgentHealth")]
    public async Task<HttpResponseData> Health(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "health")] HttpRequestData req)
    {
        var payload = new
        {
            status = "healthy",
            service = "StayHere.AiAgentService",
            timestamp = DateTime.UtcNow
        };
        return await WriteJsonAsync(req, HttpStatusCode.OK, payload);
    }

    private static Dictionary<string, string> ParseQueryString(string? queryString)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (string.IsNullOrEmpty(queryString) || !queryString.StartsWith('?'))
            return result;

        foreach (var pair in queryString[1..].Split('&'))
        {
            var parts = pair.Split('=', 2);
            if (parts.Length == 2)
            {
                var key = Uri.UnescapeDataString(parts[0]);
                var value = Uri.UnescapeDataString(parts[1]);
                result[key] = value;
            }
        }

        return result;
    }

    private static async Task<HttpResponseData> WriteJsonAsync(HttpRequestData req, HttpStatusCode status, object payload)
    {
        var response = req.CreateResponse(status);
        response.Headers.Add("Content-Type", "application/json; charset=utf-8");
        await response.WriteStringAsync(JsonSerializer.Serialize(payload, JsonOptions));
        return response;
    }
}
