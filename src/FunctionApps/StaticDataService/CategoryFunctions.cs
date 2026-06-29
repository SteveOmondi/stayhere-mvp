using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StayHere.Application.Categories.Models;
using StayHere.Application.Common.Interfaces;
using StayHere.Application.StaticData.Models;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Attributes;
using Microsoft.OpenApi.Models;
using StayHere.Shared.Attributes;

namespace StayHere.StaticDataService.Functions;

public class CategoryFunctions
{
    private readonly ICategoryService _categoryService;
    private readonly ISubcategoryService _subcategoryService;
    private readonly IRoleDefinitionService _roleService;
    private readonly IUserTypeDefinitionService _userTypeService;
    private readonly ILogger<CategoryFunctions> _logger;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public CategoryFunctions(
        ICategoryService categoryService,
        ISubcategoryService subcategoryService,
        IRoleDefinitionService roleService,
        IUserTypeDefinitionService userTypeService,
        ILogger<CategoryFunctions> logger,
        IConfiguration configuration)
    {
        _categoryService = categoryService;
        _subcategoryService = subcategoryService;
        _roleService = roleService;
        _userTypeService = userTypeService;
        _logger = logger;
    }

    // ── Categories ─────────────────────────────────────────────────────────────

    [Function("GetCategories")]
    [AllowAnonymous]
    [OpenApiOperation(operationId: "GetCategories", tags: new[] { "Categories" }, Summary = "Get active categories")]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<CategoryDto>))]
    public async Task<HttpResponseData> GetCategories(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "categories")] HttpRequestData req)
    {
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
    [Authorize("Admin")]
    [OpenApiOperation(operationId: "GetAllCategories", tags: new[] { "Categories" }, Summary = "Get all categories including inactive")]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<CategoryDto>))]
    public async Task<HttpResponseData> GetAllCategories(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "categories/all")] HttpRequestData req)
    {
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

    [Function("CreateCategory")]
    [Authorize("Admin")]
    [OpenApiOperation(operationId: "CreateCategory", tags: new[] { "Categories" }, Summary = "Create category")]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(CreateCategoryRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.Created, contentType: "application/json", bodyType: typeof(CategoryDto))]
    public async Task<HttpResponseData> CreateCategory(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "categories")] HttpRequestData req)
    {
        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<CreateCategoryRequest>(body, JsonOptions);

            if (request == null || string.IsNullOrWhiteSpace(request.Name))
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Name is required");

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
    public async Task<HttpResponseData> UpdateCategory(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "categories/{id:guid}")] HttpRequestData req,
        Guid id)
    {
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
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(object))]
    public async Task<HttpResponseData> DeleteCategory(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "categories/{id:guid}")] HttpRequestData req,
        Guid id)
    {
        try
        {
            var deleted = await _categoryService.DeleteCategoryAsync(id);
            if (!deleted)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Category not found");

            return await CreateJsonResponse(req, HttpStatusCode.OK, new { message = "Deactivated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting category {Id}", id);
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Failed to delete category");
        }
    }

    // ── Subcategories ──────────────────────────────────────────────────────────

    [Function("GetSubcategories")]
    [AllowAnonymous]
    [OpenApiOperation(operationId: "GetSubcategories", tags: new[] { "Subcategories" }, Summary = "Get active subcategories")]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<SubcategoryDto>))]
    public async Task<HttpResponseData> GetSubcategories(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "subcategories")] HttpRequestData req)
    {
        try
        {
            var subcategories = await _subcategoryService.GetActiveSubcategoriesAsync();
            return await CreateJsonResponse(req, HttpStatusCode.OK, subcategories);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting subcategories");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Failed to retrieve subcategories");
        }
    }

    [Function("GetAllSubcategories")]
    [Authorize("Admin")]
    [OpenApiOperation(operationId: "GetAllSubcategories", tags: new[] { "Subcategories" }, Summary = "Get all subcategories including inactive")]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<SubcategoryDto>))]
    public async Task<HttpResponseData> GetAllSubcategories(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "subcategories/all")] HttpRequestData req)
    {
        try
        {
            var subcategories = await _subcategoryService.GetAllSubcategoriesAsync();
            return await CreateJsonResponse(req, HttpStatusCode.OK, subcategories);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all subcategories");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Failed to retrieve subcategories");
        }
    }

    [Function("GetSubcategoryById")]
    [AllowAnonymous]
    [OpenApiOperation(operationId: "GetSubcategoryById", tags: new[] { "Subcategories" }, Summary = "Get subcategory by ID")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(SubcategoryDto))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.NotFound, contentType: "application/json", bodyType: typeof(object))]
    public async Task<HttpResponseData> GetSubcategoryById(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "subcategories/{id:guid}")] HttpRequestData req,
        Guid id)
    {
        try
        {
            var subcategory = await _subcategoryService.GetSubcategoryByIdAsync(id);
            if (subcategory == null)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Subcategory not found");

            return await CreateJsonResponse(req, HttpStatusCode.OK, subcategory);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting subcategory {Id}", id);
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Failed to retrieve subcategory");
        }
    }

    [Function("GetSubcategoriesByCategory")]
    [AllowAnonymous]
    [OpenApiOperation(operationId: "GetSubcategoriesByCategory", tags: new[] { "Subcategories" }, Summary = "Get subcategories by parent category")]
    [OpenApiParameter(name: "categoryId", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<SubcategoryDto>))]
    public async Task<HttpResponseData> GetSubcategoriesByCategory(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "subcategories/category/{categoryId:guid}")] HttpRequestData req,
        Guid categoryId)
    {
        try
        {
            var subcategories = await _subcategoryService.GetSubcategoriesByCategoryIdAsync(categoryId);
            return await CreateJsonResponse(req, HttpStatusCode.OK, subcategories);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting subcategories for category {CategoryId}", categoryId);
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Failed to retrieve subcategories");
        }
    }

    [Function("GetSubcategoriesByCity")]
    [AllowAnonymous]
    [OpenApiOperation(operationId: "GetSubcategoriesByCity", tags: new[] { "Subcategories" }, Summary = "Get subcategories by city")]
    [OpenApiParameter(name: "city", In = ParameterLocation.Path, Required = true, Type = typeof(string))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<SubcategoryDto>))]
    public async Task<HttpResponseData> GetSubcategoriesByCity(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "subcategories/city/{city}")] HttpRequestData req,
        string city)
    {
        try
        {
            var subcategories = await _subcategoryService.GetSubcategoriesByCityAsync(city);
            return await CreateJsonResponse(req, HttpStatusCode.OK, subcategories);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting subcategories for city {City}", city);
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Failed to retrieve subcategories");
        }
    }

    [Function("GetSubcategoriesByCountry")]
    [AllowAnonymous]
    [OpenApiOperation(operationId: "GetSubcategoriesByCountry", tags: new[] { "Subcategories" }, Summary = "Get subcategories by country")]
    [OpenApiParameter(name: "country", In = ParameterLocation.Path, Required = true, Type = typeof(string))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<SubcategoryDto>))]
    public async Task<HttpResponseData> GetSubcategoriesByCountry(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "subcategories/country/{country}")] HttpRequestData req,
        string country)
    {
        try
        {
            var subcategories = await _subcategoryService.GetSubcategoriesByCountryAsync(country);
            return await CreateJsonResponse(req, HttpStatusCode.OK, subcategories);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting subcategories for country {Country}", country);
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Failed to retrieve subcategories");
        }
    }

    [Function("CreateSubcategory")]
    [Authorize("Admin")]
    [OpenApiOperation(operationId: "CreateSubcategory", tags: new[] { "Subcategories" }, Summary = "Create subcategory")]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(CreateSubcategoryRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.Created, contentType: "application/json", bodyType: typeof(SubcategoryDto))]
    public async Task<HttpResponseData> CreateSubcategory(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "subcategories")] HttpRequestData req)
    {
        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<CreateSubcategoryRequest>(body, JsonOptions);

            if (request == null || string.IsNullOrWhiteSpace(request.Name))
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Name is required");

            if (string.IsNullOrWhiteSpace(request.Country))
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Country is required");

            if (string.IsNullOrWhiteSpace(request.City))
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "City is required");

            var subcategory = await _subcategoryService.CreateSubcategoryAsync(request);
            return await CreateJsonResponse(req, HttpStatusCode.Created, subcategory);
        }
        catch (JsonException)
        {
            return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid JSON format");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating subcategory");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Failed to create subcategory");
        }
    }

    [Function("UpdateSubcategory")]
    [Authorize("Admin")]
    [OpenApiOperation(operationId: "UpdateSubcategory", tags: new[] { "Subcategories" }, Summary = "Update subcategory")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(UpdateSubcategoryRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(SubcategoryDto))]
    public async Task<HttpResponseData> UpdateSubcategory(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "subcategories/{id:guid}")] HttpRequestData req,
        Guid id)
    {
        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<UpdateSubcategoryRequest>(body, JsonOptions);

            if (request == null)
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request body");

            var subcategory = await _subcategoryService.UpdateSubcategoryAsync(id, request);
            if (subcategory == null)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Subcategory not found");

            return await CreateJsonResponse(req, HttpStatusCode.OK, subcategory);
        }
        catch (JsonException)
        {
            return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid JSON format");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating subcategory {Id}", id);
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Failed to update subcategory");
        }
    }

    [Function("DeleteSubcategory")]
    [Authorize("Admin")]
    [OpenApiOperation(operationId: "DeleteSubcategory", tags: new[] { "Subcategories" }, Summary = "Delete subcategory")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(object))]
    public async Task<HttpResponseData> DeleteSubcategory(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "subcategories/{id:guid}")] HttpRequestData req,
        Guid id)
    {
        try
        {
            var deleted = await _subcategoryService.DeleteSubcategoryAsync(id);
            if (!deleted)
                return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Subcategory not found");

            return await CreateJsonResponse(req, HttpStatusCode.OK, new { message = "Deactivated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting subcategory {Id}", id);
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Failed to delete subcategory");
        }
    }

    // ── Static data ────────────────────────────────────────────────────────────

    [Function("GetUserTypes")]
    [AllowAnonymous]
    [OpenApiOperation(operationId: "GetUserTypes", tags: new[] { "StaticData" }, Summary = "Get user types")]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(UserTypeDefinitionDto[]))]
    public async Task<HttpResponseData> GetUserTypes(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "user-types")] HttpRequestData req)
    {
        var types = await _userTypeService.GetAllUserTypesAsync();
        return await CreateJsonResponse(req, HttpStatusCode.OK, types);
    }

    [Function("GetUserRoles")]
    [AllowAnonymous]
    [OpenApiOperation(operationId: "GetUserRoles", tags: new[] { "StaticData" }, Summary = "Get user roles")]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(RoleDefinitionDto[]))]
    public async Task<HttpResponseData> GetUserRoles(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "user-roles")] HttpRequestData req)
    {
        var roles = await _roleService.GetAllRolesAsync();
        return await CreateJsonResponse(req, HttpStatusCode.OK, roles);
    }

    [Function("CreateUserRole")]
    [Authorize("Admin")]
    [OpenApiOperation(operationId: "CreateUserRole", tags: new[] { "StaticData" }, Summary = "Create custom user role")]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(CreateRoleDefinitionRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.Created, contentType: "application/json", bodyType: typeof(RoleDefinitionDto))]
    public async Task<HttpResponseData> CreateUserRole(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "user-roles")] HttpRequestData req)
    {
        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<CreateRoleDefinitionRequest>(body, JsonOptions);
            if (request == null || string.IsNullOrWhiteSpace(request.Name))
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Name is required");

            var created = await _roleService.CreateRoleAsync(request);
            return await CreateJsonResponse(req, HttpStatusCode.Created, created);
        }
        catch (JsonException)
        {
            return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid JSON format");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating user role");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Failed to create user role");
        }
    }

    [Function("CreateUserType")]
    [Authorize("Admin")]
    [OpenApiOperation(operationId: "CreateUserType", tags: new[] { "StaticData" }, Summary = "Create custom user type")]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(CreateUserTypeDefinitionRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.Created, contentType: "application/json", bodyType: typeof(UserTypeDefinitionDto))]
    public async Task<HttpResponseData> CreateUserType(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "user-types")] HttpRequestData req)
    {
        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<CreateUserTypeDefinitionRequest>(body, JsonOptions);
            if (request == null || string.IsNullOrWhiteSpace(request.Name))
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Name is required");

            var created = await _userTypeService.CreateUserTypeAsync(request);
            return await CreateJsonResponse(req, HttpStatusCode.Created, created);
        }
        catch (JsonException)
        {
            return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid JSON format");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating user type");
            return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Failed to create user type");
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

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
