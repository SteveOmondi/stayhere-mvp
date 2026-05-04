using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using StayHere.Application.Common.Interfaces;
using StayHere.Application.Customers.Models;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Attributes;
using Microsoft.OpenApi.Models;

namespace StayHere.FunctionApps.CustomerService;

public class CustomerFunctions
{
    private static readonly JsonSerializerOptions JsonOptions = CreateJsonOptions();

    private static JsonSerializerOptions CreateJsonOptions()
    {
        var o = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        o.Converters.Insert(0, new NullableGuidWebJsonConverter());
        return o;
    }

    private readonly ICustomerService _customerService;
    private readonly ILogger<CustomerFunctions> _logger;

    public CustomerFunctions(ICustomerService customerService, ILogger<CustomerFunctions> logger)
    {
        _customerService = customerService;
        _logger = logger;
    }

    [Function("CreateCustomer")]
    [OpenApiOperation(operationId: "CreateCustomer", tags: new[] { "Customers" }, Summary = "Create customer")]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(CreateCustomerRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.Created, contentType: "application/json", bodyType: typeof(CustomerDto))]
    public async Task<HttpResponseData> CreateCustomer(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "customers")] HttpRequestData req)
    {
        try
        {
            var request = await JsonSerializer.DeserializeAsync<CreateCustomerRequest>(req.Body, JsonOptions)
                          ?? throw new InvalidOperationException("Invalid payload");

            var customer = await _customerService.CreateCustomerAsync(request);
            return await CreateJsonResponse(req, HttpStatusCode.Created, customer);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating customer");
            return await CreateErrorResponse(req, HttpStatusCode.BadRequest, ex.Message);
        }
    }

    [Function("GetCustomers")]
    [OpenApiOperation(operationId: "GetCustomers", tags: new[] { "Customers" }, Summary = "Get all customers")]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<CustomerDto>))]
    public async Task<HttpResponseData> GetCustomers(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "customers/list")] HttpRequestData req)
    {
        var customers = await _customerService.GetAllCustomersAsync();
        return await CreateJsonResponse(req, HttpStatusCode.OK, customers);
    }

    [Function("GetCustomerById")]
    [OpenApiOperation(operationId: "GetCustomerById", tags: new[] { "Customers" }, Summary = "Get customer by ID")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(CustomerDto))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.NotFound, contentType: "application/json", bodyType: typeof(object))]
    public async Task<HttpResponseData> GetCustomerById(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "customers/{id:guid}")] HttpRequestData req,
        Guid id)
    {
        var customer = await _customerService.GetCustomerByIdAsync(id);
        if (customer is null)
        {
            return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Customer not found");
        }

        return await CreateJsonResponse(req, HttpStatusCode.OK, customer);
    }

    [Function("GetCustomerByPhone")]
    [OpenApiOperation(operationId: "GetCustomerByPhone", tags: new[] { "Customers" }, Summary = "Get customer by phone")]
    [OpenApiParameter(name: "phone", In = ParameterLocation.Path, Required = true, Type = typeof(string))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(CustomerDto))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.NotFound, contentType: "application/json", bodyType: typeof(object))]
    public async Task<HttpResponseData> GetCustomerByPhone(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "customers/by-phone/{phone}")] HttpRequestData req,
        string phone)
    {
        var customer = await _customerService.GetCustomerByPhoneAsync(phone);
        if (customer is null)
        {
            return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Customer not found");
        }

        return await CreateJsonResponse(req, HttpStatusCode.OK, customer);
    }

    [Function("GetCustomersByRegion")]
    [OpenApiOperation(operationId: "GetCustomersByRegion", tags: new[] { "Customers" }, Summary = "Get customers by region")]
    [OpenApiParameter(name: "countryId", In = ParameterLocation.Query, Required = false, Type = typeof(Guid))]
    [OpenApiParameter(name: "cityId", In = ParameterLocation.Query, Required = false, Type = typeof(Guid))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<CustomerDto>))]
    public async Task<HttpResponseData> GetCustomersByRegion(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "customers/profile")] HttpRequestData req)
    {
        var query = System.Web.HttpUtility.ParseQueryString(req.Url.Query);
        Guid? countryId = Guid.TryParse(query["countryId"], out var c) ? c : null;
        Guid? cityId = Guid.TryParse(query["cityId"], out var city) ? city : null;

        var customers = await _customerService.GetCustomersByRegionAsync(countryId, cityId);
        return await CreateJsonResponse(req, HttpStatusCode.OK, customers);
    }

    [Function("GetCustomersByListing")]
    [OpenApiOperation(operationId: "GetCustomersByListing", tags: new[] { "Customers" }, Summary = "Get customers by listing ID")]
    [OpenApiParameter(name: "listingId", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<CustomerDto>))]
    public async Task<HttpResponseData> GetCustomersByListing(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "listings/{listingId:guid}/customers")] HttpRequestData req,
        Guid listingId)
    {
        var customers = await _customerService.GetCustomersByListingAsync(listingId);
        return await CreateJsonResponse(req, HttpStatusCode.OK, customers);
    }

    [Function("UpdateCustomer")]
    [OpenApiOperation(operationId: "UpdateCustomer", tags: new[] { "Customers" }, Summary = "Update customer")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(UpdateCustomerRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(CustomerDto))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.NotFound, contentType: "application/json", bodyType: typeof(object))]
    public async Task<HttpResponseData> UpdateCustomer(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "customers/{id:guid}")] HttpRequestData req,
        Guid id)
    {
        try
        {
            var update = await JsonSerializer.DeserializeAsync<UpdateCustomerRequest>(req.Body, JsonOptions)
                          ?? throw new InvalidOperationException("Invalid payload");

            var customer = await _customerService.UpdateCustomerAsync(id, update);
            if (customer is null)
            {
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Customer not found");
            }

            return await CreateJsonResponse(req, HttpStatusCode.OK, customer);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating customer");
            return await CreateErrorResponse(req, HttpStatusCode.BadRequest, ex.Message);
        }
    }

    [Function("DeactivateCustomer")]
    [OpenApiOperation(operationId: "DeactivateCustomer", tags: new[] { "Customers" }, Summary = "Deactivate customer")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiResponseWithoutBody(statusCode: HttpStatusCode.NoContent)]
    public async Task<HttpResponseData> DeactivateCustomer(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "customers/{id:guid}/deactivate")] HttpRequestData req,
        Guid id)
    {
        await _customerService.DeactivateCustomerAsync(id);
        return req.CreateResponse(HttpStatusCode.NoContent);
    }

    [Function("AttachCustomerProperty")]
    [OpenApiOperation(operationId: "AttachCustomerProperty", tags: new[] { "Customers" }, Summary = "Attach property to customer")]
    [OpenApiParameter(name: "customerId", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(AttachCustomerPropertyRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.Created, contentType: "application/json", bodyType: typeof(CustomerPropertyDto))]
    public async Task<HttpResponseData> AttachCustomerProperty(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "customers/{customerId:guid}/properties")] HttpRequestData req,
        Guid customerId)
    {
        try
        {
            var request = await JsonSerializer.DeserializeAsync<AttachCustomerPropertyRequest>(req.Body, JsonOptions)
                          ?? throw new InvalidOperationException("Invalid payload");

            var result = await _customerService.AttachPropertyAsync(customerId, request);
            return await CreateJsonResponse(req, HttpStatusCode.Created, result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error attaching property to customer");
            return await CreateErrorResponse(req, HttpStatusCode.BadRequest, ex.Message);
        }
    }

    [Function("GetCustomerProperties")]
    [OpenApiOperation(operationId: "GetCustomerProperties", tags: new[] { "Customers" }, Summary = "Get customer properties")]
    [OpenApiParameter(name: "customerId", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<CustomerPropertyDto>))]
    public async Task<HttpResponseData> GetCustomerProperties(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "customers/{customerId:guid}/properties")] HttpRequestData req,
        Guid customerId)
    {
        var result = await _customerService.GetCustomerPropertiesAsync(customerId);
        return await CreateJsonResponse(req, HttpStatusCode.OK, result);
    }

    [Function("AddCustomerDocument")]
    [OpenApiOperation(operationId: "AddCustomerDocument", tags: new[] { "Documents" }, Summary = "Add document to customer")]
    [OpenApiParameter(name: "customerId", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(CreateDocumentRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.Created, contentType: "application/json", bodyType: typeof(DocumentDto))]
    public async Task<HttpResponseData> AddCustomerDocument(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "customers/{customerId:guid}/documents")] HttpRequestData req,
        Guid customerId)
    {
        try
        {
            var request = await JsonSerializer.DeserializeAsync<CreateDocumentRequest>(req.Body, JsonOptions)
                          ?? throw new InvalidOperationException("Invalid payload");

            // Force entity type/id to the customer
            request = request with { EntityType = "Customer", EntityId = customerId };

            var doc = await _customerService.AddDocumentAsync(request);
            return await CreateJsonResponse(req, HttpStatusCode.Created, doc);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding customer document");
            return await CreateErrorResponse(req, HttpStatusCode.BadRequest, ex.Message);
        }
    }

    [Function("GetCustomerDocuments")]
    [OpenApiOperation(operationId: "GetCustomerDocuments", tags: new[] { "Documents" }, Summary = "Get customer documents")]
    [OpenApiParameter(name: "customerId", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<DocumentDto>))]
    public async Task<HttpResponseData> GetCustomerDocuments(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "customers/{customerId:guid}/documents")] HttpRequestData req,
        Guid customerId)
    {
        var docs = await _customerService.GetDocumentsAsync("Customer", customerId);
        return await CreateJsonResponse(req, HttpStatusCode.OK, docs);
    }

    private static async Task<HttpResponseData> CreateJsonResponse<T>(HttpRequestData req, HttpStatusCode status, T value)
    {
        var response = req.CreateResponse(status);
        response.Headers.Add("Content-Type", "application/json; charset=utf-8");
        await response.WriteStringAsync(JsonSerializer.Serialize(value, JsonOptions));
        return response;
    }

    private static async Task<HttpResponseData> CreateErrorResponse(HttpRequestData req, HttpStatusCode status, string message)
    {
        var response = req.CreateResponse(status);
        response.Headers.Add("Content-Type", "application/json; charset=utf-8");
        await response.WriteStringAsync(JsonSerializer.Serialize(new { error = message }, JsonOptions));
        return response;
    }
}

