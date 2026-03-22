using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StayHere.Application.Categories.Models;
using StayHere.Application.Common.Interfaces;

namespace StayHere.StaticDataService.Functions;

public class CategoryFunctions
{
    private readonly ICategoryService _categoryService;
    private readonly ILogger<CategoryFunctions> _logger;
    private readonly IConfiguration _configuration;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

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
    public async Task<HttpResponseData> GetCategories(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "api/categories")] HttpRequestData req)
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

    [Function("GetAllCategories")]
    public async Task<HttpResponseData> GetAllCategories(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "categories/all")] HttpRequestData req)
    {
        _logger.LogInformation("Getting all categories including inactive");

        if (!IsAuthorized(req))
            return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Unauthorized");

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
    public async Task<HttpResponseData> CreateCategory(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "categories")] HttpRequestData req)
    {
        _logger.LogInformation("Creating new category");

        if (!IsAuthorized(req))
            return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Unauthorized");

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
    public async Task<HttpResponseData> UpdateCategory(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "categories/{id:guid}")] HttpRequestData req,
        Guid id)
    {
        _logger.LogInformation("Updating category: {Id}", id);

        if (!IsAuthorized(req))
            return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Unauthorized");

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
    public async Task<HttpResponseData> DeleteCategory(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "categories/{id:guid}")] HttpRequestData req,
        Guid id)
    {
        _logger.LogInformation("Deleting category: {Id}", id);

        if (!IsAuthorized(req))
            return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Unauthorized");

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

    private bool IsAuthorized(HttpRequestData req)
    {
        var skipAuth = _configuration["SKIP_AUTH"];
        if (skipAuth?.ToLower() == "true")
            return true;

        if (!req.Headers.TryGetValues("Authorization", out var authHeaders))
            return false;

        var authHeader = authHeaders.FirstOrDefault();
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
            return false;

        var token = authHeader.Substring("Bearer ".Length).Trim();
        return token == "mock-jwt-token";
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
