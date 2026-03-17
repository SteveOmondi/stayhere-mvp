using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using StayHere.Application.Common.Interfaces;
using StayHere.Application.Customers.Models;

namespace StayHere.FunctionApps.CustomerService;

public class CustomerFunctions
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly ICustomerService _customerService;
    private readonly ILogger<CustomerFunctions> _logger;

    public CustomerFunctions(ICustomerService customerService, ILogger<CustomerFunctions> logger)
    {
        _customerService = customerService;
        _logger = logger;
    }

    [Function("CreateCustomer")]
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

    [Function("GetCustomerById")]
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
    public async Task<HttpResponseData> GetCustomersByRegion(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "customers/region")] HttpRequestData req)
    {
        var query = System.Web.HttpUtility.ParseQueryString(req.Url.Query);
        Guid? countryId = Guid.TryParse(query["countryId"], out var c) ? c : null;
        Guid? cityId = Guid.TryParse(query["cityId"], out var city) ? city : null;

        var customers = await _customerService.GetCustomersByRegionAsync(countryId, cityId);
        return await CreateJsonResponse(req, HttpStatusCode.OK, customers);
    }

    [Function("GetCustomersByListing")]
    public async Task<HttpResponseData> GetCustomersByListing(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "listings/{listingId:guid}/customers")] HttpRequestData req,
        Guid listingId)
    {
        var customers = await _customerService.GetCustomersByListingAsync(listingId);
        return await CreateJsonResponse(req, HttpStatusCode.OK, customers);
    }

    [Function("UpdateCustomer")]
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
    public async Task<HttpResponseData> DeactivateCustomer(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "customers/{id:guid}/deactivate")] HttpRequestData req,
        Guid id)
    {
        await _customerService.DeactivateCustomerAsync(id);
        return req.CreateResponse(HttpStatusCode.NoContent);
    }

    [Function("AttachCustomerProperty")]
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
    public async Task<HttpResponseData> GetCustomerProperties(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "customers/{customerId:guid}/properties")] HttpRequestData req,
        Guid customerId)
    {
        var result = await _customerService.GetCustomerPropertiesAsync(customerId);
        return await CreateJsonResponse(req, HttpStatusCode.OK, result);
    }

    [Function("AddCustomerDocument")]
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

