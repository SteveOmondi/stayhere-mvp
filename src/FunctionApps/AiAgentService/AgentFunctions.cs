using System.Net;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StayHere.Application.AiAgent.Models;
using StayHere.Application.Common.Interfaces;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Attributes;
using Microsoft.OpenApi.Models;
using StayHere.Shared.Attributes;

namespace StayHere.FunctionApps.AiAgentService;

public class AgentFunctions
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IAiAgentService _agentService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AgentFunctions> _logger;

    public AgentFunctions(IAiAgentService agentService, IConfiguration configuration, ILogger<AgentFunctions> logger)
    {
        _agentService = agentService;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// The caller's UserId from their verified JWT (set by AuthenticationMiddleware into
    /// FunctionContext.Items["User"]) - the ONLY source of identity for Sage's personal tools.
    /// Mirrors ListingFunctions.GetUserIdFromRequest's pattern for local SKIP_AUTH testing.
    /// </summary>
    private Guid? GetCallerUserId(HttpRequestData req)
    {
        if (string.Equals(_configuration["SKIP_AUTH"], "true", StringComparison.OrdinalIgnoreCase)
            && req.Headers.TryGetValues("X-User-Id", out var vals)
            && Guid.TryParse(vals.FirstOrDefault(), out var headerGuid))
        {
            return headerGuid;
        }

        if (!req.FunctionContext.Items.TryGetValue("User", out var principalObj) || principalObj is not ClaimsPrincipal principal)
            return null;

        var id = principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal.FindFirstValue("nameid");
        return Guid.TryParse(id, out var claimsGuid) ? claimsGuid : null;
    }

    [Function("AgentChat")]
    [Authorize("Tenant", "PropertyOwner", "PropertyManager", "Admin")]
    [OpenApiOperation(operationId: "AgentChat", tags: new[] { "AI Agent" }, Summary = "Chat with AI agent")]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(AgentChatRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(AgentChatResponse))]
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

            var callerUserId = GetCallerUserId(req);
            var response = await _agentService.ChatAsync(chatRequest, callerUserId);
            return await WriteJsonAsync(req, HttpStatusCode.OK, response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Agent chat failed");
            return await WriteJsonAsync(req, HttpStatusCode.InternalServerError, new { error = "Internal server error", message = ex.Message });
        }
    }

    [Function("AgentRespondAndRecommend")]
    [Authorize("Tenant", "PropertyOwner", "PropertyManager", "Admin")]
    [OpenApiOperation(operationId: "AgentRespondAndRecommend", tags: new[] { "AI Agent" }, Summary = "Get response and recommendations")]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(AgentRecommendRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(AgentRecommendResponse))]
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
    [Authorize("Admin")]
    [OpenApiOperation(operationId: "AgentKnowledgeStatus", tags: new[] { "AI Agent" }, Summary = "Get knowledge base status")]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(IReadOnlyDictionary<string, object>))]
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
    [AllowAnonymous]
    [OpenApiOperation(operationId: "AgentSearchListings", tags: new[] { "AI Agent" }, Summary = "Search listings via AI agent logic")]
    [OpenApiParameter(name: "listing_id", In = ParameterLocation.Query, Required = false, Type = typeof(string))]
    [OpenApiParameter(name: "listing_code", In = ParameterLocation.Query, Required = false, Type = typeof(string))]
    [OpenApiParameter(name: "location", In = ParameterLocation.Query, Required = false, Type = typeof(string))]
    [OpenApiParameter(name: "amenity", In = ParameterLocation.Query, Required = false, Type = typeof(string))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(AgentListingSearchResponse))]
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

    [Function("AgentListConversations")]
    [Authorize("Tenant", "PropertyOwner", "PropertyManager", "Admin")]
    [OpenApiOperation(operationId: "AgentListConversations", tags: new[] { "AI Agent" }, Summary = "List the caller's own Sage conversations")]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(IReadOnlyList<AgentConversationSummaryDto>))]
    public async Task<HttpResponseData> ListConversations(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "conversations")] HttpRequestData req)
    {
        try
        {
            var callerUserId = GetCallerUserId(req);
            if (callerUserId == null)
                return await WriteJsonAsync(req, HttpStatusCode.Unauthorized, new { error = "Sign in to view your chat history." });

            var conversations = await _agentService.ListConversationsAsync(callerUserId.Value);
            return await WriteJsonAsync(req, HttpStatusCode.OK, conversations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "List conversations failed");
            return await WriteJsonAsync(req, HttpStatusCode.InternalServerError, new { error = "Internal server error", message = ex.Message });
        }
    }

    [Function("AgentGetConversation")]
    [Authorize("Tenant", "PropertyOwner", "PropertyManager", "Admin")]
    [OpenApiOperation(operationId: "AgentGetConversation", tags: new[] { "AI Agent" }, Summary = "Get one of the caller's own Sage conversations")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(string))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(AgentConversationDetailDto))]
    public async Task<HttpResponseData> GetConversation(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "conversations/{id}")] HttpRequestData req,
        string id)
    {
        try
        {
            var callerUserId = GetCallerUserId(req);
            if (callerUserId == null)
                return await WriteJsonAsync(req, HttpStatusCode.Unauthorized, new { error = "Sign in to view this conversation." });

            var conversation = await _agentService.GetConversationAsync(callerUserId.Value, id);
            if (conversation == null)
                return await WriteJsonAsync(req, HttpStatusCode.NotFound, new { error = "Conversation not found." });

            return await WriteJsonAsync(req, HttpStatusCode.OK, conversation);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Get conversation failed");
            return await WriteJsonAsync(req, HttpStatusCode.InternalServerError, new { error = "Internal server error", message = ex.Message });
        }
    }

    [Function("AgentHealth")]
    [AllowAnonymous]
    [OpenApiOperation(operationId: "AgentHealth", tags: new[] { "AI Agent" }, Summary = "Get service health status")]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(object))]
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
