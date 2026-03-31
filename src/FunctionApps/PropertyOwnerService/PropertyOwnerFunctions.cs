using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StayHere.Application.Common.Interfaces;
using StayHere.Application.PropertyOwners.Models;

namespace StayHere.PropertyOwnerService.Functions;

public class PropertyOwnerFunctions
{
    private readonly IPropertyOwnerService _ownerService;
    private readonly ILogger<PropertyOwnerFunctions> _logger;
    private readonly IConfiguration _configuration;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public PropertyOwnerFunctions(
        IPropertyOwnerService ownerService,
        ILogger<PropertyOwnerFunctions> logger,
        IConfiguration configuration)
    {
        _ownerService = ownerService;
        _logger = logger;
        _configuration = configuration;
    }

    [Function("CreatePropertyOwner")]
    public async Task<HttpResponseData> CreatePropertyOwner(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "owners")] HttpRequestData req)
    {
        _logger.LogInformation("Creating property owner");

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<CreatePropertyOwnerRequest>(body, JsonOptions);
            if (request == null)
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request body");
            if (string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.Phone) || string.IsNullOrWhiteSpace(request.Email))
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "FullName, Phone and Email are required");

            var owner = await _ownerService.CreatePropertyOwnerAsync(request);
            return await CreateJsonResponse(req, HttpStatusCode.Created, owner);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating property owner");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("GetPropertyOwnerById")]
    public async Task<HttpResponseData> GetPropertyOwnerById(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "owners/{id:guid}")] HttpRequestData req,
        Guid id)
    {
        try
        {
            var owner = await _ownerService.GetPropertyOwnerByIdAsync(id);
            if (owner == null)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Property owner not found");
            return await CreateJsonResponse(req, HttpStatusCode.OK, owner);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting property owner");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("GetPropertyOwnerByUserId")]
    public async Task<HttpResponseData> GetPropertyOwnerByUserId(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "owners/user/{userId:guid}")] HttpRequestData req,
        Guid userId)
    {
        try
        {
            var owner = await _ownerService.GetPropertyOwnerByUserIdAsync(userId);
            if (owner == null)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Property owner not found");
            return await CreateJsonResponse(req, HttpStatusCode.OK, owner);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting property owner");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("GetPropertyOwnerByEmail")]
    public async Task<HttpResponseData> GetPropertyOwnerByEmail(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "owners/email/{email}")] HttpRequestData req,
        string email)
    {
        try
        {
            var owner = await _ownerService.GetPropertyOwnerByEmailAsync(email);
            if (owner == null)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Property owner not found");
            return await CreateJsonResponse(req, HttpStatusCode.OK, owner);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting property owner");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("UpdatePropertyOwner")]
    public async Task<HttpResponseData> UpdatePropertyOwner(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "owners/{id:guid}")] HttpRequestData req,
        Guid id)
    {
        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<UpdatePropertyOwnerRequest>(body, JsonOptions);
            if (request == null)
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request body");

            var owner = await _ownerService.UpdatePropertyOwnerAsync(id, request);
            if (owner == null)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Property owner not found");
            return await CreateJsonResponse(req, HttpStatusCode.OK, owner);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating property owner");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("GetOwnerWallet")]
    public async Task<HttpResponseData> GetOwnerWallet(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "owners/{ownerId:guid}/wallet")] HttpRequestData req,
        Guid ownerId)
    {
        try
        {
            var wallet = await _ownerService.GetWalletByOwnerIdAsync(ownerId);
            if (wallet == null)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Wallet not found");
            return await CreateJsonResponse(req, HttpStatusCode.OK, wallet);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting wallet");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("GetOwnerProperties")]
    public async Task<HttpResponseData> GetOwnerProperties(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "owners/{ownerId:guid}/properties")] HttpRequestData req,
        Guid ownerId)
    {
        try
        {
            var properties = await _ownerService.GetOwnerPropertiesAsync(ownerId);
            return await CreateJsonResponse(req, HttpStatusCode.OK, properties);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting owner properties");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("GetOwnerListings")]
    public async Task<HttpResponseData> GetOwnerListings(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "owners/{ownerId:guid}/listings")] HttpRequestData req,
        Guid ownerId)
    {
        try
        {
            var (page, pageSize) = ParsePageQuery(req);
            var result = await _ownerService.GetOwnerListingsAsync(ownerId, page, pageSize);
            return await CreateJsonResponse(req, HttpStatusCode.OK, result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting owner listings");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("CreateAgent")]
    public async Task<HttpResponseData> CreateAgent(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "owners/{ownerId:guid}/agents")] HttpRequestData req,
        Guid ownerId)
    {
        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<CreateAgentRequest>(body, JsonOptions);
            if (request == null)
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request body");
            if (string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.Phone))
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "FullName and Phone are required");

            var agent = await _ownerService.CreateAgentAsync(ownerId, request);
            return await CreateJsonResponse(req, HttpStatusCode.Created, agent);
        }
        catch (ArgumentException ex)
        {
            return await CreateErrorResponse(req, HttpStatusCode.BadRequest, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating agent");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("GetAgentById")]
    public async Task<HttpResponseData> GetAgentById(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "agents/{id:guid}")] HttpRequestData req,
        Guid id)
    {
        try
        {
            var agent = await _ownerService.GetAgentByIdAsync(id);
            if (agent == null)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Agent not found");
            return await CreateJsonResponse(req, HttpStatusCode.OK, agent);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting agent");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("GetOwnerAgents")]
    public async Task<HttpResponseData> GetOwnerAgents(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "owners/{ownerId:guid}/agents")] HttpRequestData req,
        Guid ownerId)
    {
        try
        {
            var agents = await _ownerService.GetOwnerAgentsAsync(ownerId);
            return await CreateJsonResponse(req, HttpStatusCode.OK, agents);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting owner agents");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("CreateCaretaker")]
    public async Task<HttpResponseData> CreateCaretaker(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "owners/{ownerId:guid}/caretakers")] HttpRequestData req,
        Guid ownerId)
    {
        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<CreateCaretakerRequest>(body, JsonOptions);
            if (request == null)
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request body");
            if (string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.Phone))
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "FullName and Phone are required");

            var caretaker = await _ownerService.CreateCaretakerAsync(ownerId, request);
            return await CreateJsonResponse(req, HttpStatusCode.Created, caretaker);
        }
        catch (ArgumentException ex)
        {
            return await CreateErrorResponse(req, HttpStatusCode.BadRequest, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating caretaker");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("GetCaretakerById")]
    public async Task<HttpResponseData> GetCaretakerById(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "caretakers/{id:guid}")] HttpRequestData req,
        Guid id)
    {
        try
        {
            var caretaker = await _ownerService.GetCaretakerByIdAsync(id);
            if (caretaker == null)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Caretaker not found");
            return await CreateJsonResponse(req, HttpStatusCode.OK, caretaker);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting caretaker");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("GetOwnerCaretakers")]
    public async Task<HttpResponseData> GetOwnerCaretakers(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "owners/{ownerId:guid}/caretakers")] HttpRequestData req,
        Guid ownerId)
    {
        try
        {
            var caretakers = await _ownerService.GetOwnerCaretakersAsync(ownerId);
            return await CreateJsonResponse(req, HttpStatusCode.OK, caretakers);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting owner caretakers");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("GetOwners")]
    public async Task<HttpResponseData> GetOwners(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "owners")] HttpRequestData req)
    {
        var (page, pageSize) = ParsePageQuery(req);
        var owners = await _ownerService.GetAllPropertyOwnersAsync(page, pageSize);
        return await CreateJsonResponse(req, HttpStatusCode.OK, owners);
    }

    private static (int page, int pageSize) ParsePageQuery(HttpRequestData req)
    {
        var query = req.Url.Query?.TrimStart('?') ?? "";
        int page = 1, pageSize = 20;
        foreach (var segment in query.Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var parts = segment.Split('=', 2, StringSplitOptions.None);
            if (parts.Length != 2) continue;
            if (parts[0].Equals("page", StringComparison.OrdinalIgnoreCase) && int.TryParse(parts[1], out var p))
                page = p;
            if (parts[0].Equals("pageSize", StringComparison.OrdinalIgnoreCase) && int.TryParse(parts[1], out var ps))
                pageSize = ps;
        }
        return (page, pageSize);
    }

    private static async Task<HttpResponseData> CreateJsonResponse<T>(HttpRequestData req, HttpStatusCode statusCode, T content)
    {
        var response = req.CreateResponse(statusCode);
        response.Headers.Add("Content-Type", "application/json; charset=utf-8");
        await response.WriteStringAsync(JsonSerializer.Serialize(content, JsonOptions));
        return response;
    }

    private static async Task<HttpResponseData> CreateErrorResponse(HttpRequestData req, HttpStatusCode statusCode, string message)
    {
        var response = req.CreateResponse(statusCode);
        response.Headers.Add("Content-Type", "application/json; charset=utf-8");
        await response.WriteStringAsync(JsonSerializer.Serialize(new { error = message }, JsonOptions));
        return response;
    }
}
