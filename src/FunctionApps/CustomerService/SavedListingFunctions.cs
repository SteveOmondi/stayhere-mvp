using System.Net;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Attributes;
using Microsoft.OpenApi.Models;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;
using StayHere.Infrastructure.Persistence;
using StayHere.Shared.Attributes;

namespace StayHere.FunctionApps.CustomerService;

/// <summary>
/// The signed-in tenant's own saved/favorited listings.
///
/// GET    /saved-listings              This user's saved listings, newest first  [Tenant, Admin]
/// POST   /saved-listings              Save a listing (idempotent)               [Tenant, Admin]
/// DELETE /saved-listings/{listingId}  Unsave a listing (idempotent)              [Tenant, Admin]
///
/// Identity is always resolved server-side from the caller's own verified JWT (see
/// GetCallerUserId below) and mapped to their Customer record - never trusted from the request
/// body or route, so one tenant can never save/unsave on behalf of another. This is the same
/// backing store Sage's save_listing/unsave_listing/get_saved_listings tools use, so the "Saved"
/// page in the app and the AI agent always agree on what's saved.
/// </summary>
public class SavedListingFunctions
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly StayHereDbContext _db;
    private readonly ICustomerRepository _customers;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SavedListingFunctions> _logger;

    public SavedListingFunctions(StayHereDbContext db, ICustomerRepository customers, IConfiguration configuration, ILogger<SavedListingFunctions> logger)
    {
        _db = db;
        _customers = customers;
        _configuration = configuration;
        _logger = logger;
    }

    [Function("GetSavedListings")]
    [Authorize("Tenant", "Admin")]
    [OpenApiOperation(operationId: "GetSavedListings", tags: new[] { "SavedListings" }, Summary = "Get the signed-in user's saved listings")]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<SavedListingDto>))]
    public async Task<HttpResponseData> GetSaved(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "saved-listings")] HttpRequestData req)
    {
        var (userId, customerId) = await ResolveIdentityAsync(req);
        if (userId == null)
            return await Error(req, HttpStatusCode.Unauthorized, "Not signed in.");

        var saved = await _db.SavedListings
            .Include(s => s.Listing)
            .Where(s => (customerId.HasValue && s.CustomerId == customerId.Value) || s.CustomerId == userId.Value)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();

        var result = saved.Where(s => s.Listing != null).Select(ToDto);
        return await Json(req, HttpStatusCode.OK, result);
    }

    [Function("SaveListing")]
    [Authorize("Tenant", "Admin")]
    [OpenApiOperation(operationId: "SaveListing", tags: new[] { "SavedListings" }, Summary = "Save (favorite) a listing")]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(SaveListingRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.Created, contentType: "application/json", bodyType: typeof(SavedListingDto))]
    public async Task<HttpResponseData> Save(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "saved-listings")] HttpRequestData req)
    {
        var (userId, customerId) = await ResolveIdentityAsync(req);
        if (userId == null)
            return await Error(req, HttpStatusCode.Unauthorized, "Not signed in.");

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<SaveListingRequest>(body, JsonOptions);
            if (dto == null || dto.ListingId == Guid.Empty)
                return await Error(req, HttpStatusCode.BadRequest, "listingId is required.");

            var listing = await _db.Listings.FindAsync(dto.ListingId);
            if (listing == null)
                return await Error(req, HttpStatusCode.NotFound, "Listing not found.");

            var effectiveCustomerId = customerId ?? userId.Value;
            var existing = await _db.SavedListings.FirstOrDefaultAsync(s =>
                s.ListingId == dto.ListingId && s.CustomerId == effectiveCustomerId);

            if (existing != null)
            {
                existing.Listing = listing;
                return await Json(req, HttpStatusCode.OK, ToDto(existing));
            }

            var saved = new SavedListing
            {
                Id = Guid.NewGuid(),
                ListingId = dto.ListingId,
                CustomerId = effectiveCustomerId,
                CreatedAt = DateTime.UtcNow,
                Listing = listing
            };
            _db.SavedListings.Add(saved);
            await _db.SaveChangesAsync();

            return await Json(req, HttpStatusCode.Created, ToDto(saved));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving listing");
            return await Error(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("UnsaveListing")]
    [Authorize("Tenant", "Admin")]
    [OpenApiOperation(operationId: "UnsaveListing", tags: new[] { "SavedListings" }, Summary = "Unsave (unfavorite) a listing")]
    [OpenApiParameter(name: "listingId", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    public async Task<HttpResponseData> Unsave(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "saved-listings/{listingId:guid}")] HttpRequestData req,
        Guid listingId)
    {
        var (userId, customerId) = await ResolveIdentityAsync(req);
        if (userId == null)
            return await Error(req, HttpStatusCode.Unauthorized, "Not signed in.");

        var effectiveCustomerId = customerId ?? userId.Value;
        var existing = await _db.SavedListings.FirstOrDefaultAsync(s =>
            s.ListingId == listingId && s.CustomerId == effectiveCustomerId);

        if (existing == null)
            return await Json(req, HttpStatusCode.OK, new { success = true, wasNotSaved = true });

        _db.SavedListings.Remove(existing);
        await _db.SaveChangesAsync();

        return await Json(req, HttpStatusCode.OK, new { success = true });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// <summary>Caller's UserId from their verified JWT, mapped to their Customer.Id when one
    /// exists. Mirrors AgentFunctions.GetCallerUserId's SKIP_AUTH/X-User-Id local-dev fallback.</summary>
    private async Task<(Guid? UserId, Guid? CustomerId)> ResolveIdentityAsync(HttpRequestData req)
    {
        Guid? userId = null;

        if (string.Equals(_configuration["SKIP_AUTH"], "true", StringComparison.OrdinalIgnoreCase)
            && req.Headers.TryGetValues("X-User-Id", out var vals)
            && Guid.TryParse(vals.FirstOrDefault(), out var headerGuid))
        {
            userId = headerGuid;
        }
        else if (req.FunctionContext.Items.TryGetValue("User", out var principalObj) && principalObj is ClaimsPrincipal principal)
        {
            var id = principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal.FindFirstValue("nameid");
            if (Guid.TryParse(id, out var claimsGuid))
                userId = claimsGuid;
        }

        if (userId == null)
            return (null, null);

        var customer = await _customers.GetByUserIdAsync(userId.Value);
        return (userId, customer?.Id);
    }

    private static SavedListingDto ToDto(SavedListing s)
    {
        var l = s.Listing!;
        var suburb = string.IsNullOrWhiteSpace(l.Location?.Suburb) ? null : l.Location.Suburb;
        var location = suburb is null ? l.Location?.City : $"{suburb}, {l.Location!.City}";

        return new SavedListingDto(
            s.Id,
            l.Id,
            l.ListingCode,
            l.Title,
            l.PrimaryImageUrl,
            l.Price,
            l.PriceCurrency,
            location,
            l.Bedrooms,
            l.Bathrooms,
            l.AvailabilityStatus.ToString(),
            s.CreatedAt);
    }

    // WriteAsJsonAsync with no explicit options serializes C# records using their PascalCase
    // property names as-is ("ListingId", not "listingId") - confirmed live: the client's
    // AppContext reads camelCase ("s.listingId"), got undefined back, and silently passed that
    // into listingsApi.getById(undefined), 404ing every saved listing it tried to show. Every
    // other function in this codebase sidesteps this either by hand-building a lowercase-keyed
    // Dictionary (BookingFunctions.ToDto) or by serializing through an explicit camelCase
    // JsonSerializerOptions (CustomerFunctions) - this one needs the same treatment.
    private static async Task<HttpResponseData> Json(HttpRequestData req, HttpStatusCode code, object data)
    {
        var res = req.CreateResponse(code);
        res.Headers.Add("Content-Type", "application/json; charset=utf-8");
        await res.WriteStringAsync(JsonSerializer.Serialize(data, JsonOptions));
        return res;
    }

    private static async Task<HttpResponseData> Error(HttpRequestData req, HttpStatusCode code, string msg)
    {
        var res = req.CreateResponse(code);
        res.Headers.Add("Content-Type", "application/json; charset=utf-8");
        await res.WriteStringAsync(JsonSerializer.Serialize(new { error = msg }, JsonOptions));
        return res;
    }
}

// ── DTOs ──────────────────────────────────────────────────────────────────────
public record SaveListingRequest(Guid ListingId);

public record SavedListingDto(
    Guid Id,
    Guid ListingId,
    string? ListingCode,
    string Title,
    string? ImageUrl,
    decimal Price,
    string Currency,
    string? Location,
    int Bedrooms,
    int Bathrooms,
    string AvailabilityStatus,
    DateTime SavedAt);
