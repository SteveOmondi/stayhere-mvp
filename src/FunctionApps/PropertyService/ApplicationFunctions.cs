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
/// Tenant Application endpoints.
///
/// POST   /applications                                 Start application                [Tenant, Admin]
/// GET    /applications/{id}                            Get application + docs + payments [Tenant, PropertyOwner, PropertyManager, Admin]
/// GET    /applications/customer/{customerId}           Customer's applications           [Tenant, Admin]
/// GET    /applications/listing/{listingId}             Applications for a listing        [PropertyOwner, PropertyManager, Admin]
/// GET    /applications/owner/{ownerId}                 All apps across owner's listings  [PropertyOwner, PropertyManager, Admin]
/// POST   /applications/{id}/documents                  Upload a document URL             [Tenant, Admin]
/// PATCH  /applications/{id}/submit                     Submit docs for review            [Tenant, Admin]
/// PATCH  /applications/{id}/review                     Approve or reject                 [PropertyOwner, PropertyManager, Admin]
/// PATCH  /applications/{id}/accept-terms               Customer accepts terms            [Tenant, Admin]
/// </summary>
public class ApplicationFunctions
{
    private readonly StayHereDbContext _db;
    private readonly ILogger<ApplicationFunctions> _log;
    private static readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);

    public ApplicationFunctions(StayHereDbContext db, ILogger<ApplicationFunctions> log)
    {
        _db = db; _log = log;
    }

    // ── Create application ────────────────────────────────────────────────────
    [Function("CreateTenantApplication")]
    [Authorize("Tenant", "Admin")]
    public async Task<HttpResponseData> Create(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "applications")] HttpRequestData req)
    {
        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<CreateApplicationRequest>(body, _json);
            if (dto == null || dto.ListingId == Guid.Empty || dto.CustomerId == Guid.Empty)
                return await Error(req, HttpStatusCode.BadRequest, "ListingId and CustomerId are required.");

            // Prevent duplicate active applications
            var existing = await _db.TenantApplications
                .Where(a => a.ListingId == dto.ListingId && a.CustomerId == dto.CustomerId
                         && a.Status != "Cancelled" && a.Status != "Rejected")
                .FirstOrDefaultAsync();
            if (existing != null)
                return await Json(req, HttpStatusCode.OK, await ToDetailDto(existing));

            var app = new TenantApplication
            {
                Id = Guid.NewGuid(),
                ListingId = dto.ListingId,
                CustomerId = dto.CustomerId,
                ViewingBookingId = dto.ViewingBookingId,
                Status = "DocumentsPending",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.TenantApplications.Add(app);
            await _db.SaveChangesAsync();
            return await Json(req, HttpStatusCode.Created, await ToDetailDto(app));
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Error creating application");
            return await Error(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    // ── Get application ────────────────────────────────────────────────────────
    [Function("GetTenantApplication")]
    [Authorize("Tenant", "PropertyOwner", "PropertyManager", "Admin")]
    public async Task<HttpResponseData> Get(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "applications/{id:guid}")] HttpRequestData req,
        Guid id)
    {
        var app = await _db.TenantApplications
            .Include(a => a.Documents)
            .Include(a => a.Payments)
            .FirstOrDefaultAsync(a => a.Id == id);
        if (app == null) return await Error(req, HttpStatusCode.NotFound, "Application not found.");
        return await Json(req, HttpStatusCode.OK, await ToDetailDto(app));
    }

    // ── Get by customer ────────────────────────────────────────────────────────
    [Function("GetApplicationsByCustomer")]
    [Authorize("Tenant", "Admin")]
    public async Task<HttpResponseData> GetByCustomer(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "applications/customer/{customerId:guid}")] HttpRequestData req,
        Guid customerId)
    {
        var apps = await _db.TenantApplications
            .Include(a => a.Documents)
            .Include(a => a.Payments)
            .Where(a => a.CustomerId == customerId)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        var result = new List<object>();
        foreach (var app in apps) result.Add(await ToDetailDto(app));
        return await Json(req, HttpStatusCode.OK, result);
    }

    // ── Get by listing ─────────────────────────────────────────────────────────
    [Function("GetApplicationsByListing")]
    [Authorize("PropertyOwner", "PropertyManager", "Admin")]
    public async Task<HttpResponseData> GetByListing(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "applications/listing/{listingId:guid}")] HttpRequestData req,
        Guid listingId)
    {
        var apps = await _db.TenantApplications
            .Include(a => a.Documents)
            .Include(a => a.Payments)
            .Where(a => a.ListingId == listingId)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        var result = new List<object>();
        foreach (var app in apps) result.Add(await ToDetailDto(app));
        return await Json(req, HttpStatusCode.OK, result);
    }

    // ── Get by owner (all listings) ────────────────────────────────────────────
    [Function("GetApplicationsByOwner")]
    [Authorize("PropertyOwner", "PropertyManager", "Admin")]
    public async Task<HttpResponseData> GetByOwner(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "applications/owner/{ownerId:guid}")] HttpRequestData req,
        Guid ownerId)
    {
        var listingIds = await _db.Listings
            .Where(l => l.OwnerId == ownerId)
            .Select(l => l.Id)
            .ToListAsync();

        var apps = await _db.TenantApplications
            .Include(a => a.Documents)
            .Include(a => a.Payments)
            .Where(a => listingIds.Contains(a.ListingId))
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        var result = new List<object>();
        foreach (var app in apps) result.Add(await ToDetailDto(app));
        return await Json(req, HttpStatusCode.OK, result);
    }

    // ── Add document ───────────────────────────────────────────────────────────
    [Function("AddApplicationDocument")]
    [Authorize("Tenant", "Admin")]
    public async Task<HttpResponseData> AddDocument(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "applications/{id:guid}/documents")] HttpRequestData req,
        Guid id)
    {
        var app = await _db.TenantApplications.FindAsync(id);
        if (app == null) return await Error(req, HttpStatusCode.NotFound, "Application not found.");

        var body = await new StreamReader(req.Body).ReadToEndAsync();
        var dto = JsonSerializer.Deserialize<AddDocumentRequest>(body, _json);
        if (dto == null || string.IsNullOrWhiteSpace(dto.FileUrl) || string.IsNullOrWhiteSpace(dto.DocumentType))
            return await Error(req, HttpStatusCode.BadRequest, "FileUrl and DocumentType are required.");

        // Replace existing doc of same type
        var existing = await _db.ApplicationDocuments
            .Where(d => d.ApplicationId == id && d.DocumentType == dto.DocumentType)
            .FirstOrDefaultAsync();
        if (existing != null) _db.ApplicationDocuments.Remove(existing);

        var doc = new ApplicationDocument
        {
            Id = Guid.NewGuid(),
            ApplicationId = id,
            DocumentType = dto.DocumentType,
            FileUrl = dto.FileUrl,
            FileName = dto.FileName,
            UploadedAt = DateTime.UtcNow
        };
        _db.ApplicationDocuments.Add(doc);
        app.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return await Json(req, HttpStatusCode.Created, new
        {
            doc.Id, doc.ApplicationId, doc.DocumentType, doc.FileUrl, doc.FileName, doc.UploadedAt
        });
    }

    // ── Submit for review ──────────────────────────────────────────────────────
    [Function("SubmitApplicationForReview")]
    [Authorize("Tenant", "Admin")]
    public async Task<HttpResponseData> Submit(
        [HttpTrigger(AuthorizationLevel.Anonymous, "patch", Route = "applications/{id:guid}/submit")] HttpRequestData req,
        Guid id)
    {
        var app = await _db.TenantApplications.FindAsync(id);
        if (app == null) return await Error(req, HttpStatusCode.NotFound, "Application not found.");
        if (app.Status != "DocumentsPending")
            return await Error(req, HttpStatusCode.Conflict, $"Cannot submit from status '{app.Status}'.");

        app.Status = "UnderReview";
        app.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return await Json(req, HttpStatusCode.OK, await ToDetailDto(app));
    }

    // ── Review (approve / reject) ──────────────────────────────────────────────
    [Function("ReviewApplication")]
    [Authorize("PropertyOwner", "PropertyManager", "Admin")]
    public async Task<HttpResponseData> Review(
        [HttpTrigger(AuthorizationLevel.Anonymous, "patch", Route = "applications/{id:guid}/review")] HttpRequestData req,
        Guid id)
    {
        var app = await _db.TenantApplications.FindAsync(id);
        if (app == null) return await Error(req, HttpStatusCode.NotFound, "Application not found.");

        var body = await new StreamReader(req.Body).ReadToEndAsync();
        var dto = JsonSerializer.Deserialize<ReviewApplicationRequest>(body, _json);
        if (dto == null) return await Error(req, HttpStatusCode.BadRequest, "Request body required.");

        var allowed = new[] { "Approved", "Rejected" };
        if (!allowed.Contains(dto.Decision))
            return await Error(req, HttpStatusCode.BadRequest, "Decision must be 'Approved' or 'Rejected'.");

        app.Status = dto.Decision;
        app.RejectionReason = dto.Decision == "Rejected" ? dto.Reason : null;
        app.ReviewedAt = DateTime.UtcNow;
        app.ReviewedBy = dto.ReviewerEmail;
        app.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return await Json(req, HttpStatusCode.OK, await ToDetailDto(app));
    }

    // ── Accept terms ───────────────────────────────────────────────────────────
    [Function("AcceptApplicationTerms")]
    [Authorize("Tenant", "Admin")]
    public async Task<HttpResponseData> AcceptTerms(
        [HttpTrigger(AuthorizationLevel.Anonymous, "patch", Route = "applications/{id:guid}/accept-terms")] HttpRequestData req,
        Guid id)
    {
        var app = await _db.TenantApplications.FindAsync(id);
        if (app == null) return await Error(req, HttpStatusCode.NotFound, "Application not found.");
        if (app.Status != "Approved")
            return await Error(req, HttpStatusCode.Conflict, $"Terms can only be accepted after approval (current: {app.Status}).");

        var body = await new StreamReader(req.Body).ReadToEndAsync();
        var dto = string.IsNullOrWhiteSpace(body) ? null
            : JsonSerializer.Deserialize<AcceptTermsRequest>(body, _json);

        app.Status = "TermsAccepted";
        app.TermsAcceptedAt = DateTime.UtcNow;
        app.DigitalSignatureUrl = dto?.SignatureUrl;
        app.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return await Json(req, HttpStatusCode.OK, await ToDetailDto(app));
    }

    // ── Cancel application ─────────────────────────────────────────────────────
    [Function("CancelApplication")]
    [Authorize("Tenant", "PropertyOwner", "PropertyManager", "Admin")]
    public async Task<HttpResponseData> Cancel(
        [HttpTrigger(AuthorizationLevel.Anonymous, "patch", Route = "applications/{id:guid}/cancel")] HttpRequestData req,
        Guid id)
    {
        var app = await _db.TenantApplications.FindAsync(id);
        if (app == null) return await Error(req, HttpStatusCode.NotFound, "Application not found.");

        app.Status = "Cancelled";
        app.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return await Json(req, HttpStatusCode.OK, await ToDetailDto(app));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private async Task<object> ToDetailDto(TenantApplication app)
    {
        // Enrich with listing info
        var listing = await _db.Listings
            .Select(l => new { l.Id, l.Title, l.ListingCode, l.Price, l.PriceCurrency })
            .FirstOrDefaultAsync(l => l.Id == app.ListingId);

        // Enrich with customer info
        var customer = await _db.Customers
            .Select(c => new { c.Id, c.FirstName, c.LastName, c.DisplayName, c.Email, c.Phone })
            .FirstOrDefaultAsync(c => c.Id == app.CustomerId);

        return new
        {
            app.Id, app.ListingId, app.CustomerId, app.ViewingBookingId,
            app.Status, app.RejectionReason, app.ReviewedAt, app.ReviewedBy,
            app.TermsAcceptedAt, app.DigitalSignatureUrl,
            app.CreatedAt, app.UpdatedAt,
            documents = app.Documents.Select(d => new
            {
                d.Id, d.DocumentType, d.FileUrl, d.FileName, d.UploadedAt
            }),
            payments = app.Payments.Select(p => new
            {
                p.Id, p.PaymentType, p.Amount, p.Currency, p.Method,
                p.Status, p.MpesaReceiptNumber, p.Reference, p.InitiatedAt, p.ConfirmedAt
            }),
            listing = listing == null ? null : new
            {
                listing.Id, listing.Title, listing.ListingCode,
                listing.Price, listing.PriceCurrency
            },
            customer = customer == null ? null : new
            {
                customer.Id,
                name = customer.DisplayName ?? $"{customer.FirstName} {customer.LastName}".Trim(),
                customer.Email, customer.Phone
            }
        };
    }

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

// ── Request DTOs ──────────────────────────────────────────────────────────────
public record CreateApplicationRequest(Guid ListingId, Guid CustomerId, Guid? ViewingBookingId);
public record AddDocumentRequest(string DocumentType, string FileUrl, string? FileName);
public record ReviewApplicationRequest(string Decision, string? Reason, string? ReviewerEmail);
public record AcceptTermsRequest(string? SignatureUrl);
