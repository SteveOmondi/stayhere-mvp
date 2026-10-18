using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using StayHere.Domain.Entities;
using StayHere.Infrastructure.Persistence;
using StayHere.Shared.Attributes;

namespace StayHere.PropertyService.Functions;

/// <summary>
/// Tenant Application endpoints.
///
/// POST   /applications                                 Start application                [Tenant, Admin]
/// GET    /applications/{id}                            Get application + docs + payments [Tenant, PropertyOwner, PropertyManager, Admin]
/// GET    /applications/customer/{customerId}           Customer's applications, paginated[Tenant, Admin]
/// GET    /applications/listing/{listingId}             Applications for a listing        [PropertyOwner, PropertyManager, Admin]
/// GET    /applications/owner/{ownerId}                 All apps across owner's listings  [PropertyOwner, PropertyManager, Admin]
/// POST   /applications/{id}/documents                  Upload a document URL             [Tenant, Admin]
/// PATCH  /applications/{id}/prescreen                  Pre-screen: approve or reject      [PropertyOwner, PropertyManager, Admin]
///                                                       the applicant before documents are requested
/// PATCH  /applications/{id}/submit                     Submit docs for review            [Tenant, Admin]
/// PATCH  /applications/{id}/review                     Approve or reject the documents   [PropertyOwner, PropertyManager, Admin]
/// PATCH  /applications/{id}/accept-terms               Customer accepts terms            [Tenant, Admin]
/// </summary>
public class ApplicationFunctions
{
    private readonly StayHereDbContext _db;
    private readonly ILogger<ApplicationFunctions> _log;
    private static readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);

    /// <summary>
    /// Single source of truth for the customer-facing status label - mirrored by Sage's own
    /// status copy (AgentToolExecutor.cs) and surfaced to clients via ToDetailDto's statusLabel
    /// field, so new statuses only need to be added here instead of in three separate places.
    /// </summary>
    internal static string StatusLabel(string status) => status switch
    {
        "PendingApproval" => "Pending owner approval",
        "DocumentsPending" => "Documents needed",
        "UnderReview" => "Documents under review",
        "Approved" => "Approved - accept lease terms",
        "Rejected" => "Not approved",
        "TermsAccepted" => "Lease terms accepted",
        "PaymentPending" => "Payment pending",
        "Active" => "Active tenancy",
        "Cancelled" => "Cancelled",
        _ => status,
    };

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
        CreateApplicationRequest? dto = null;
        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            dto = JsonSerializer.Deserialize<CreateApplicationRequest>(body, _json);
            if (dto == null || dto.ListingId == Guid.Empty || dto.CustomerId == Guid.Empty)
                return await Error(req, HttpStatusCode.BadRequest, "ListingId and CustomerId are required.");

            // Prevent duplicate active applications. Booking a viewing first is no longer required -
            // ViewingBookingId is optional and can be attached later if the customer books one.
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
                Status = "PendingApproval",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.TenantApplications.Add(app);
            await _db.SaveChangesAsync();
            return await Json(req, HttpStatusCode.Created, await ToDetailDto(app));
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex) && dto != null)
        {
            // Lost a race against a concurrent create for the same listing+customer - the other
            // request's row now exists (enforced by the partial unique index - see the
            // AddActiveApplicationUniqueIndex migration), so fetch and return it instead of erroring.
            var existing = await _db.TenantApplications
                .Where(a => a.ListingId == dto!.ListingId && a.CustomerId == dto.CustomerId
                         && a.Status != "Cancelled" && a.Status != "Rejected")
                .FirstOrDefaultAsync();
            if (existing != null) return await Json(req, HttpStatusCode.OK, await ToDetailDto(existing));
            _log.LogError(ex, "Unique violation creating application with no recoverable existing row");
            return await Error(req, HttpStatusCode.Conflict, "An application for this listing already exists.");
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Error creating application");
            return await Error(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    // ── Pre-screen (approve or reject the applicant before documents are requested) ───────────
    [Function("PrescreenApplication")]
    [Authorize("PropertyOwner", "PropertyManager", "Admin")]
    public async Task<HttpResponseData> Prescreen(
        [HttpTrigger(AuthorizationLevel.Anonymous, "patch", Route = "applications/{id:guid}/prescreen")] HttpRequestData req,
        Guid id)
    {
        var app = await _db.TenantApplications.FindAsync(id);
        if (app == null) return await Error(req, HttpStatusCode.NotFound, "Application not found.");
        if (app.Status != "PendingApproval")
            return await Error(req, HttpStatusCode.Conflict, $"Cannot pre-screen from status '{app.Status}'.");

        var body = await new StreamReader(req.Body).ReadToEndAsync();
        var dto = JsonSerializer.Deserialize<ReviewApplicationRequest>(body, _json);
        if (dto == null) return await Error(req, HttpStatusCode.BadRequest, "Request body required.");

        var allowed = new[] { "Approved", "Rejected" };
        if (!allowed.Contains(dto.Decision))
            return await Error(req, HttpStatusCode.BadRequest, "Decision must be 'Approved' or 'Rejected'.");

        // Pre-screen approval moves the applicant on to documents, not to the final "Approved"
        // status - that still only happens after the owner reviews the actual documents.
        app.Status = dto.Decision == "Approved" ? "DocumentsPending" : "Rejected";
        app.RejectionReason = dto.Decision == "Rejected" ? dto.Reason : null;
        app.ReviewedAt = DateTime.UtcNow;
        app.ReviewedBy = dto.ReviewerEmail;
        app.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return await Json(req, HttpStatusCode.OK, await ToDetailDto(app));
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

    // ── Get by customer (paginated) ────────────────────────────────────────────
    [Function("GetApplicationsByCustomer")]
    [Authorize("Tenant", "Admin")]
    public async Task<HttpResponseData> GetByCustomer(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "applications/customer/{customerId:guid}")] HttpRequestData req,
        Guid customerId)
    {
        var page = Math.Max(1, GetQueryInt(req, "page", 1));
        var pageSize = Math.Clamp(GetQueryInt(req, "pageSize", 20), 1, 100);

        var query = _db.TenantApplications
            .Where(a => a.CustomerId == customerId)
            .OrderByDescending(a => a.CreatedAt);

        var totalCount = await query.CountAsync();
        var apps = await query
            .Include(a => a.Documents)
            .Include(a => a.Payments)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = new List<object>();
        foreach (var app in apps) items.Add(await ToDetailDto(app));

        return await Json(req, HttpStatusCode.OK, new
        {
            items,
            totalCount,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
        });
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

    // ── Review the submitted documents (approve / reject) ──────────────────────
    [Function("ReviewApplication")]
    [Authorize("PropertyOwner", "PropertyManager", "Admin")]
    public async Task<HttpResponseData> Review(
        [HttpTrigger(AuthorizationLevel.Anonymous, "patch", Route = "applications/{id:guid}/review")] HttpRequestData req,
        Guid id)
    {
        var app = await _db.TenantApplications.FindAsync(id);
        if (app == null) return await Error(req, HttpStatusCode.NotFound, "Application not found.");
        if (app.Status != "UnderReview")
            return await Error(req, HttpStatusCode.Conflict, $"Cannot review documents from status '{app.Status}'.");

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
        var listing = await _db.Listings
            .Select(l => new { l.Id, l.Title, l.ListingCode, l.Price, l.PriceCurrency })
            .FirstOrDefaultAsync(l => l.Id == app.ListingId);

        var customer = await _db.Customers
            .Select(c => new { c.Id, c.UserId, c.FirstName, c.LastName, c.DisplayName, c.Email, c.Phone })
            .FirstOrDefaultAsync(c => c.UserId == app.CustomerId || c.Id == app.CustomerId);

        return new
        {
            id                 = app.Id,
            listingId          = app.ListingId,
            customerId         = app.CustomerId,
            viewingBookingId   = app.ViewingBookingId,
            status             = app.Status,
            statusLabel        = StatusLabel(app.Status),
            rejectionReason    = app.RejectionReason,
            reviewedAt         = app.ReviewedAt,
            reviewedBy         = app.ReviewedBy,
            termsAcceptedAt    = app.TermsAcceptedAt,
            digitalSignatureUrl= app.DigitalSignatureUrl,
            createdAt          = app.CreatedAt,
            updatedAt          = app.UpdatedAt,
            listingTitle       = listing?.Title,
            listingCode        = listing?.ListingCode,
            customerName       = customer == null ? null
                                 : customer.DisplayName ?? $"{customer.FirstName} {customer.LastName}".Trim(),
            customerEmail      = customer?.Email,
            customerPhone      = customer?.Phone,
            documents = app.Documents.Select(d => new
            {
                id           = d.Id,
                documentType = d.DocumentType,
                fileUrl      = d.FileUrl,
                fileName     = d.FileName,
                uploadedAt   = d.UploadedAt
            }),
            payments = app.Payments.Select(p => new
            {
                id                  = p.Id,
                paymentType         = p.PaymentType,
                amount              = p.Amount,
                currency            = p.Currency,
                method              = p.Method,
                status              = p.Status,
                mpesaReceiptNumber  = p.MpesaReceiptNumber,
                reference           = p.Reference,
                initiatedAt         = p.InitiatedAt,
                confirmedAt         = p.ConfirmedAt
            })
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

    /// <summary>Postgres SQLSTATE 23505 = unique_violation - matches the partial unique index added
    /// by the AddActiveApplicationUniqueIndex migration.</summary>
    private static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is PostgresException { SqlState: "23505" };

    private static int GetQueryInt(HttpRequestData req, string name, int defaultValue)
    {
        var query = System.Web.HttpUtility.ParseQueryString(req.Url.Query);
        var value = query[name];
        return int.TryParse(value, out var result) ? result : defaultValue;
    }
}

// ── Request DTOs ──────────────────────────────────────────────────────────────
public record CreateApplicationRequest(Guid ListingId, Guid CustomerId, Guid? ViewingBookingId);
public record AddDocumentRequest(string DocumentType, string FileUrl, string? FileName);
public record ReviewApplicationRequest(string Decision, string? Reason, string? ReviewerEmail);
public record AcceptTermsRequest(string? SignatureUrl);
