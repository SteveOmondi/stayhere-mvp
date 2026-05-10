using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StayHere.Application.Categories.Models;
using StayHere.Application.Common.Interfaces;
using StayHere.Domain.Entities;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Attributes;
using Microsoft.OpenApi.Models;
using StayHere.Shared.Attributes;

namespace StayHere.StaticDataService.Functions;

public class CategoryFunctions
{
    private readonly ICategoryService _categoryService;
    private readonly ILogger<CategoryFunctions> _logger;
    private readonly IConfiguration _configuration;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public CategoryFunctions(
        ICategoryService categoryService,
        ILogger<CategoryFunctions> logger,
        IConfiguration configuration)
    {
        _categoryService = categoryService;
        _logger = logger;
        _configuration = configuration;
    }

    [Function("GetCategories")]
    [AllowAnonymous]
    [OpenApiOperation(operationId: "GetCategories", tags: new[] { "Categories" }, Summary = "Get active categories", Description = "Retrieves all active property categories.")]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<CategoryDto>))]
    public async Task<HttpResponseData> GetCategories(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "categories")] HttpRequestData req)
    {
        _logger.LogInformation("Getting all categories");

        try
        {
            var categories = await _categoryService.GetActiveCategoriesAsync();
            return await CreateJsonResponse(req, HttpStatusCode.OK, categories);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting categories");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Failed to retrieve categories");
        }
    }

    [Function("GetUserTypes")]
    [AllowAnonymous]
    [OpenApiOperation(operationId: "GetUserTypes", tags: new[] { "StaticData" }, Summary = "Get user types", Description = "Retrieves all possible user types.")]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(string[]))]
    public async Task<HttpResponseData> GetUserTypes(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "user-types")] HttpRequestData req)
    {
        _logger.LogInformation("Getting user types");
        var types = Enum.GetNames(typeof(UserType));
        return await CreateJsonResponse(req, HttpStatusCode.OK, types);
    }

    [Function("GetUserRoles")]
    [AllowAnonymous]
    [OpenApiOperation(operationId: "GetUserRoles", tags: new[] { "StaticData" }, Summary = "Get user roles", Description = "Retrieves all possible user roles.")]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(string[]))]
    public async Task<HttpResponseData> GetUserRoles(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "user-roles")] HttpRequestData req)
    {
        _logger.LogInformation("Getting user roles");
        var roles = Enum.GetNames(typeof(UserRole));
        return await CreateJsonResponse(req, HttpStatusCode.OK, roles);
    }

    [Function("GetAllCategories")]
    [Authorize("Admin")]
    [OpenApiOperation(operationId: "GetAllCategories", tags: new[] { "Categories" }, Summary = "Get all categories", Description = "Retrieves all categories including inactive ones. Requires admin authorization.")]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<CategoryDto>))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.Unauthorized, contentType: "application/json", bodyType: typeof(object))]
    public async Task<HttpResponseData> GetAllCategories(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "categories/all")] HttpRequestData req)
    {
        _logger.LogInformation("Getting all categories including inactive");

        try
        {
            var categories = await _categoryService.GetAllCategoriesAsync();
            return await CreateJsonResponse(req, HttpStatusCode.OK, categories);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all categories");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Failed to retrieve categories");
        }
    }

    [Function("GetCategoryById")]
    [AllowAnonymous]
    [OpenApiOperation(operationId: "GetCategoryById", tags: new[] { "Categories" }, Summary = "Get category by ID")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(CategoryDto))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.NotFound, contentType: "application/json", bodyType: typeof(object))]
    public async Task<HttpResponseData> GetCategoryById(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "categories/{id:guid}")] HttpRequestData req,
        Guid id)
    {
        _logger.LogInformation("Getting category by id: {Id}", id);

        try
        {
            var category = await _categoryService.GetCategoryByIdAsync(id);
            if (category == null)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Category not found");

            return await CreateJsonResponse(req, HttpStatusCode.OK, category);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting category {Id}", id);
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Failed to retrieve category");
        }
    }

    [Function("GetCategoriesByCity")]
    [AllowAnonymous]
    [OpenApiOperation(operationId: "GetCategoriesByCity", tags: new[] { "Categories" }, Summary = "Get categories by city")]
    [OpenApiParameter(name: "city", In = ParameterLocation.Path, Required = true, Type = typeof(string))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<CategoryDto>))]
    public async Task<HttpResponseData> GetCategoriesByCity(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "categories/city/{city}")] HttpRequestData req,
        string city)
    {
        _logger.LogInformation("Getting categories for city: {City}", city);

        try
        {
            var categories = await _categoryService.GetCategoriesByCityAsync(city);
            return await CreateJsonResponse(req, HttpStatusCode.OK, categories);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting categories for city {City}", city);
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Failed to retrieve categories");
        }
    }

    [Function("GetCategoriesByCountry")]
    [AllowAnonymous]
    [OpenApiOperation(operationId: "GetCategoriesByCountry", tags: new[] { "Categories" }, Summary = "Get categories by country")]
    [OpenApiParameter(name: "country", In = ParameterLocation.Path, Required = true, Type = typeof(string))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<CategoryDto>))]
    public async Task<HttpResponseData> GetCategoriesByCountry(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "categories/country/{country}")] HttpRequestData req,
        string country)
    {
        _logger.LogInformation("Getting categories for country: {Country}", country);

        try
        {
            var categories = await _categoryService.GetCategoriesByCountryAsync(country);
            return await CreateJsonResponse(req, HttpStatusCode.OK, categories);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting categories for country {Country}", country);
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Failed to retrieve categories");
        }
    }

    [Function("CreateCategory")]
    [Authorize("Admin")]
    [OpenApiOperation(operationId: "CreateCategory", tags: new[] { "Categories" }, Summary = "Create category", Description = "Creates a new category. Requires admin authorization.")]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(CreateCategoryRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.Created, contentType: "application/json", bodyType: typeof(CategoryDto))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.BadRequest, contentType: "application/json", bodyType: typeof(object))]
    public async Task<HttpResponseData> CreateCategory(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "categories")] HttpRequestData req)
    {
        _logger.LogInformation("Creating new category");

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<CreateCategoryRequest>(body, JsonOptions);

            if (request == null)
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request body");

            if (string.IsNullOrWhiteSpace(request.Name))
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Name is required");

            if (string.IsNullOrWhiteSpace(request.Country))
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Country is required");

            if (string.IsNullOrWhiteSpace(request.City))
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "City is required");

            var category = await _categoryService.CreateCategoryAsync(request);
            return await CreateJsonResponse(req, HttpStatusCode.Created, category);
        }
        catch (JsonException)
        {
            return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid JSON format");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating category");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Failed to create category");
        }
    }

    [Function("UpdateCategory")]
    [Authorize("Admin")]
    [OpenApiOperation(operationId: "UpdateCategory", tags: new[] { "Categories" }, Summary = "Update category")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(UpdateCategoryRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(CategoryDto))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.NotFound, contentType: "application/json", bodyType: typeof(object))]
    public async Task<HttpResponseData> UpdateCategory(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "categories/{id:guid}")] HttpRequestData req,
        Guid id)
    {
        _logger.LogInformation("Updating category: {Id}", id);

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<UpdateCategoryRequest>(body, JsonOptions);

            if (request == null)
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request body");

            var category = await _categoryService.UpdateCategoryAsync(id, request);
            if (category == null)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Category not found");

            return await CreateJsonResponse(req, HttpStatusCode.OK, category);
        }
        catch (JsonException)
        {
            return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid JSON format");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating category {Id}", id);
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Failed to update category");
        }
    }

    [Function("DeleteCategory")]
    [Authorize("Admin")]
    [OpenApiOperation(operationId: "DeleteCategory", tags: new[] { "Categories" }, Summary = "Delete category")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiResponseWithoutBody(statusCode: HttpStatusCode.NoContent)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.NotFound, contentType: "application/json", bodyType: typeof(object))]
    public async Task<HttpResponseData> DeleteCategory(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "categories/{id:guid}")] HttpRequestData req,
        Guid id)
    {
        _logger.LogInformation("Deleting category: {Id}", id);

        try
        {
            var deleted = await _categoryService.DeleteCategoryAsync(id);
            if (!deleted)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Category not found");

            return req.CreateResponse(HttpStatusCode.NoContent);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting category {Id}", id);
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Failed to delete category");
        }
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
