using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StayHere.Application.Common.Interfaces;
using StayHere.Application.PropertyOwners.Models;
using StayHere.Application.Properties.Models;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Attributes;
using Microsoft.OpenApi.Models;

namespace StayHere.PropertyOwnerService.Functions;

public class PropertyOwnerFunctions
{
    private readonly IPropertyOwnerService _ownerService;
    private readonly ILogger<PropertyOwnerFunctions> _logger;
    private readonly IConfiguration _configuration;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

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
    [OpenApiOperation(operationId: "CreatePropertyOwner", tags: new[] { "Owners" }, Summary = "Create property owner")]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(CreatePropertyOwnerRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.Created, contentType: "application/json", bodyType: typeof(PropertyOwnerDto))]
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
    [OpenApiOperation(operationId: "GetPropertyOwnerById", tags: new[] { "Owners" }, Summary = "Get owner by ID")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(PropertyOwnerDto))]
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
    [OpenApiOperation(operationId: "GetPropertyOwnerByUserId", tags: new[] { "Owners" }, Summary = "Get owner by user ID")]
    [OpenApiParameter(name: "userId", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(PropertyOwnerDto))]
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
    [OpenApiOperation(operationId: "GetPropertyOwnerByEmail", tags: new[] { "Owners" }, Summary = "Get owner by email")]
    [OpenApiParameter(name: "email", In = ParameterLocation.Path, Required = true, Type = typeof(string))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(PropertyOwnerDto))]
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
    [OpenApiOperation(operationId: "UpdatePropertyOwner", tags: new[] { "Owners" }, Summary = "Update owner")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(UpdatePropertyOwnerRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(PropertyOwnerDto))]
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
    [OpenApiOperation(operationId: "GetOwnerWallet", tags: new[] { "Owners" }, Summary = "Get owner wallet")]
    [OpenApiParameter(name: "ownerId", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(WalletDto))]
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
    [OpenApiOperation(operationId: "GetOwnerProperties", tags: new[] { "Owners" }, Summary = "Get owner properties")]
    [OpenApiParameter(name: "ownerId", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<PropertyListDto>))]
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
    [OpenApiOperation(operationId: "GetOwnerListings", tags: new[] { "Owners" }, Summary = "Get owner listings")]
    [OpenApiParameter(name: "ownerId", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiParameter(name: "page", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
    [OpenApiParameter(name: "pageSize", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(PaginatedResult<ListingListDto>))]
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
    [OpenApiOperation(operationId: "CreateAgent", tags: new[] { "Agents" }, Summary = "Create agent for owner")]
    [OpenApiParameter(name: "ownerId", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(CreateAgentRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.Created, contentType: "application/json", bodyType: typeof(AgentDto))]
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
    [OpenApiOperation(operationId: "GetAgentById", tags: new[] { "Agents" }, Summary = "Get agent by ID")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(AgentDto))]
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
    [OpenApiOperation(operationId: "GetOwnerAgents", tags: new[] { "Agents" }, Summary = "Get owner agents")]
    [OpenApiParameter(name: "ownerId", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<AgentDto>))]
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
    [OpenApiOperation(operationId: "CreateCaretaker", tags: new[] { "Caretakers" }, Summary = "Create caretaker for owner")]
    [OpenApiParameter(name: "ownerId", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(CreateCaretakerRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.Created, contentType: "application/json", bodyType: typeof(CaretakerDto))]
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
    [OpenApiOperation(operationId: "GetCaretakerById", tags: new[] { "Caretakers" }, Summary = "Get caretaker by ID")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(CaretakerDto))]
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
    [OpenApiOperation(operationId: "GetOwnerCaretakers", tags: new[] { "Caretakers" }, Summary = "Get owner caretakers")]
    [OpenApiParameter(name: "ownerId", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<CaretakerDto>))]
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

    /// <summary>Flat list of property owners for management portal pickers (cap via <c>max</c>, default 500).</summary>
    [Function("GetOwnersPortalDirectory")]
    [OpenApiOperation(operationId: "GetOwnersPortalDirectory", tags: new[] { "Owners" }, Summary = "Get portal owner directory")]
    [OpenApiParameter(name: "max", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<PropertyOwnerDirectoryEntryDto>))]
    public async Task<HttpResponseData> GetOwnersPortalDirectory(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "owners/portal-directory")] HttpRequestData req)
    {
        try
        {
            var max = 500;
            var q = System.Web.HttpUtility.ParseQueryString(req.Url.Query ?? "");
            if (int.TryParse(q["max"], out var parsed) && parsed > 0)
                max = Math.Min(parsed, 2000);

            var items = await _ownerService.GetPortalOwnerDirectoryAsync(max, CancellationToken.None);
            return await CreateJsonResponse(req, HttpStatusCode.OK, items);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing owners for portal directory");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("GetOwners")]
    [OpenApiOperation(operationId: "GetOwners", tags: new[] { "Owners" }, Summary = "Get all owners paginated")]
    [OpenApiParameter(name: "page", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
    [OpenApiParameter(name: "pageSize", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(PaginatedResult<PropertyOwnerDto>))]
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
