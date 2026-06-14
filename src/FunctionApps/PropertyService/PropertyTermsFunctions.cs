using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StayHere.Domain.Entities;
using StayHere.Infrastructure.Persistence;
using StayHere.Shared.Attributes;

namespace StayHere.PropertyService.Functions;

/// <summary>
/// Property Terms endpoints.
///
/// POST  /listings/{listingId}/terms           Create or replace terms for a listing [PropertyOwner, PropertyManager, Admin]
/// PUT   /listings/{listingId}/terms/{id}      Update existing terms                 [PropertyOwner, PropertyManager, Admin]
/// GET   /listings/{listingId}/terms           Get active terms for a listing        [AllowAnonymous]
/// GET   /terms/{id}                           Get specific terms by ID              [AllowAnonymous]
/// DELETE /terms/{id}                          Delete terms                          [PropertyOwner, PropertyManager, Admin]
/// </summary>
public class PropertyTermsFunctions
{
    private readonly StayHereDbContext _db;
    private readonly ILogger<PropertyTermsFunctions> _log;
    private static readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);

    public PropertyTermsFunctions(StayHereDbContext db, ILogger<PropertyTermsFunctions> log)
    {
        _db = db; _log = log;
    }

    // ── Create / replace terms ─────────────────────────────────────────────────
    [Function("CreatePropertyTerms")]
    [Authorize("PropertyOwner", "PropertyManager", "Admin")]
    public async Task<HttpResponseData> Create(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "listings/{listingId:guid}/terms")] HttpRequestData req,
        Guid listingId)
    {
        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<UpsertTermsRequest>(body, _json);
            if (dto == null) return await Error(req, HttpStatusCode.BadRequest, "Request body required.");

            // Deactivate existing active terms for this listing
            var existing = await _db.PropertyTerms
                .Where(t => t.ListingId == listingId && t.IsActive)
                .ToListAsync();
            existing.ForEach(t => t.IsActive = false);

            var terms = MapToEntity(dto, listingId);
            _db.PropertyTerms.Add(terms);
            await _db.SaveChangesAsync();
            return await Json(req, HttpStatusCode.Created, ToDto(terms));
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Error creating property terms");
            return await Error(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    // ── Update terms ───────────────────────────────────────────────────────────
    [Function("UpdatePropertyTerms")]
    [Authorize("PropertyOwner", "PropertyManager", "Admin")]
    public async Task<HttpResponseData> Update(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "listings/{listingId:guid}/terms/{id:guid}")] HttpRequestData req,
        Guid listingId, Guid id)
    {
        var terms = await _db.PropertyTerms.FindAsync(id);
        if (terms == null || terms.ListingId != listingId)
            return await Error(req, HttpStatusCode.NotFound, "Terms not found.");

        var body = await new StreamReader(req.Body).ReadToEndAsync();
        var dto = JsonSerializer.Deserialize<UpsertTermsRequest>(body, _json);
        if (dto == null) return await Error(req, HttpStatusCode.BadRequest, "Request body required.");

        ApplyUpdate(dto, terms);
        await _db.SaveChangesAsync();
        return await Json(req, HttpStatusCode.OK, ToDto(terms));
    }

    // ── Get active terms for listing ───────────────────────────────────────────
    [Function("GetListingTerms")]
    public async Task<HttpResponseData> GetByListing(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "listings/{listingId:guid}/terms")] HttpRequestData req,
        Guid listingId)
    {
        var terms = await _db.PropertyTerms
            .Where(t => t.ListingId == listingId && t.IsActive)
            .OrderByDescending(t => t.CreatedAt)
            .FirstOrDefaultAsync();

        if (terms == null) return req.CreateResponse(HttpStatusCode.NoContent);
        return await Json(req, HttpStatusCode.OK, ToDto(terms));
    }

    // ── Get terms by ID ────────────────────────────────────────────────────────
    [Function("GetTermsById")]
    public async Task<HttpResponseData> GetById(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "terms/{id:guid}")] HttpRequestData req,
        Guid id)
    {
        var terms = await _db.PropertyTerms.FindAsync(id);
        if (terms == null) return await Error(req, HttpStatusCode.NotFound, "Terms not found.");
        return await Json(req, HttpStatusCode.OK, ToDto(terms));
    }

    // ── Delete terms ───────────────────────────────────────────────────────────
    [Function("DeletePropertyTerms")]
    [Authorize("PropertyOwner", "PropertyManager", "Admin")]
    public async Task<HttpResponseData> Delete(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "terms/{id:guid}")] HttpRequestData req,
        Guid id)
    {
        var terms = await _db.PropertyTerms.FindAsync(id);
        if (terms == null) return await Error(req, HttpStatusCode.NotFound, "Terms not found.");
        _db.PropertyTerms.Remove(terms);
        await _db.SaveChangesAsync();
        return req.CreateResponse(HttpStatusCode.NoContent);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private static PropertyTerms MapToEntity(UpsertTermsRequest dto, Guid listingId) => new()
    {
        Id = Guid.NewGuid(),
        ListingId = listingId,
        Title = dto.Title ?? "Tenancy Terms & Conditions",
        TermsContent = dto.TermsContent,
        HouseRules = dto.HouseRules,
        PaymentTerms = dto.PaymentTerms,
        NoticePeriod = dto.NoticePeriod,
        PetPolicy = dto.PetPolicy,
        MaintenancePolicy = dto.MaintenancePolicy,
        SecurityDepositTerms = dto.SecurityDepositTerms,
        SecurityDeposit = dto.SecurityDeposit,
        AdminFee = dto.AdminFee,
        Currency = dto.Currency ?? "KES",
        MpesaPaybill = dto.MpesaPaybill,
        MpesaTill = dto.MpesaTill,
        MpesaAccountNumber = dto.MpesaAccountNumber,
        BankName = dto.BankName,
        BankAccountName = dto.BankAccountName,
        BankAccountNumber = dto.BankAccountNumber,
        BankBranch = dto.BankBranch,
        PaymentInstructions = dto.PaymentInstructions,
        OnboardingInstructions = dto.OnboardingInstructions,
        AccessInstructions = dto.AccessInstructions,
        ItemsToCarry = dto.ItemsToCarry,
        IsActive = true,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    private static void ApplyUpdate(UpsertTermsRequest dto, PropertyTerms terms)
    {
        terms.Title = dto.Title ?? terms.Title;
        terms.TermsContent = dto.TermsContent ?? terms.TermsContent;
        terms.HouseRules = dto.HouseRules ?? terms.HouseRules;
        terms.PaymentTerms = dto.PaymentTerms ?? terms.PaymentTerms;
        terms.NoticePeriod = dto.NoticePeriod ?? terms.NoticePeriod;
        terms.PetPolicy = dto.PetPolicy ?? terms.PetPolicy;
        terms.MaintenancePolicy = dto.MaintenancePolicy ?? terms.MaintenancePolicy;
        terms.SecurityDepositTerms = dto.SecurityDepositTerms ?? terms.SecurityDepositTerms;
        terms.SecurityDeposit = dto.SecurityDeposit ?? terms.SecurityDeposit;
        terms.AdminFee = dto.AdminFee ?? terms.AdminFee;
        terms.Currency = dto.Currency ?? terms.Currency;
        terms.MpesaPaybill = dto.MpesaPaybill ?? terms.MpesaPaybill;
        terms.MpesaTill = dto.MpesaTill ?? terms.MpesaTill;
        terms.MpesaAccountNumber = dto.MpesaAccountNumber ?? terms.MpesaAccountNumber;
        terms.BankName = dto.BankName ?? terms.BankName;
        terms.BankAccountName = dto.BankAccountName ?? terms.BankAccountName;
        terms.BankAccountNumber = dto.BankAccountNumber ?? terms.BankAccountNumber;
        terms.BankBranch = dto.BankBranch ?? terms.BankBranch;
        terms.PaymentInstructions = dto.PaymentInstructions ?? terms.PaymentInstructions;
        terms.OnboardingInstructions = dto.OnboardingInstructions ?? terms.OnboardingInstructions;
        terms.AccessInstructions = dto.AccessInstructions ?? terms.AccessInstructions;
        terms.ItemsToCarry = dto.ItemsToCarry ?? terms.ItemsToCarry;
        terms.UpdatedAt = DateTime.UtcNow;
    }

    private static object ToDto(PropertyTerms t) => new
    {
        t.Id, t.ListingId, t.Title, t.TermsContent, t.HouseRules, t.PaymentTerms,
        t.NoticePeriod, t.PetPolicy, t.MaintenancePolicy, t.SecurityDepositTerms,
        t.SecurityDeposit, t.AdminFee, t.Currency,
        t.MpesaPaybill, t.MpesaTill, t.MpesaAccountNumber,
        t.BankName, t.BankAccountName, t.BankAccountNumber, t.BankBranch,
        t.PaymentInstructions, t.OnboardingInstructions, t.AccessInstructions,
        t.ItemsToCarry, t.IsActive, t.CreatedAt, t.UpdatedAt
    };

    private static async Task<HttpResponseData> Json(HttpRequestData req, HttpStatusCode code, object data)
    {
        var res = req.CreateResponse(code);
        await res.WriteAsJsonAsync(data);
        return res;
    }

    private static async Task<HttpResponseData> Error(HttpRequestData req, HttpStatusCode code, string msg)
    {
        var res = req.CreateResponse(code);
        await res.WriteAsJsonAsync(new { error = msg });
        return res;
    }
}

// ── Request DTO ───────────────────────────────────────────────────────────────
public record UpsertTermsRequest(
    string? Title,
    string? TermsContent,
    string? HouseRules,
    string? PaymentTerms,
    string? NoticePeriod,
    string? PetPolicy,
    string? MaintenancePolicy,
    string? SecurityDepositTerms,
    decimal? SecurityDeposit,
    decimal? AdminFee,
    string? Currency,
    string? MpesaPaybill,
    string? MpesaTill,
    string? MpesaAccountNumber,
    string? BankName,
    string? BankAccountName,
    string? BankAccountNumber,
    string? BankBranch,
    string? PaymentInstructions,
    string? OnboardingInstructions,
    string? AccessInstructions,
    string? ItemsToCarry);
