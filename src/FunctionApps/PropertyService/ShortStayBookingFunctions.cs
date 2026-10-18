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
/// Short-stay (nightly) booking endpoints - a deliberately lighter-weight sibling of
/// ApplicationFunctions' long-term lease flow. See ShortStayBooking.cs for the state machine.
///
/// GET    /listings/{listingId}/availability                    Blocked date ranges for the calendar [Anonymous]
/// POST   /short-stay-bookings                                  Create a booking (PendingPayment)     [Tenant, Admin]
/// GET    /short-stay-bookings/{id}                              Get booking + docs + payments         [Tenant, PropertyOwner, PropertyManager, Admin]
/// GET    /short-stay-bookings/customer/{customerId}             Customer's bookings, paginated         [Tenant, Admin]
/// GET    /short-stay-bookings/owner/{ownerId}                   All bookings across owner's listings  [PropertyOwner, PropertyManager, Admin]
/// PATCH  /short-stay-bookings/{id}/cancel                        Cancel a booking                      [Tenant, PropertyOwner, PropertyManager, Admin]
/// POST   /short-stay-bookings/{id}/documents                    Upload ID doc - AFTER payment only    [Tenant, Admin]
/// </summary>
public class ShortStayBookingFunctions
{
    private readonly StayHereDbContext _db;
    private readonly ILogger<ShortStayBookingFunctions> _log;
    private static readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);

    /// <summary>A PendingPayment booking blocks dates for this long before being treated as
    /// abandoned - long enough for an STK prompt to be answered, short enough that a guest who
    /// never pays doesn't permanently squat on real dates.</summary>
    private static readonly TimeSpan PendingPaymentExpiry = TimeSpan.FromMinutes(30);

    public ShortStayBookingFunctions(StayHereDbContext db, ILogger<ShortStayBookingFunctions> log)
    {
        _db = db; _log = log;
    }

    // ── Availability ──────────────────────────────────────────────────────────
    [Function("GetListingAvailability")]
    [AllowAnonymous]
    public async Task<HttpResponseData> GetAvailability(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "listings/{listingId:guid}/availability")] HttpRequestData req,
        Guid listingId)
    {
        var cutoff = DateTime.UtcNow - PendingPaymentExpiry;

        var blocking = await _db.ShortStayBookings
            .Where(b => b.ListingId == listingId &&
                (b.Status == "Confirmed" || (b.Status == "PendingPayment" && b.CreatedAt > cutoff)))
            .Select(b => new { checkInDate = b.CheckInDate, checkOutDate = b.CheckOutDate })
            .OrderBy(b => b.checkInDate)
            .ToListAsync();

        return await Json(req, HttpStatusCode.OK, new { listingId, blockedRanges = blocking });
    }

    // ── Create booking ────────────────────────────────────────────────────────
    [Function("CreateShortStayBooking")]
    [Authorize("Tenant", "Admin")]
    public async Task<HttpResponseData> Create(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "short-stay-bookings")] HttpRequestData req)
    {
        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<CreateShortStayBookingRequest>(body, _json);

            if (dto is null || dto.ListingId == Guid.Empty || dto.CustomerId == Guid.Empty)
                return await Error(req, HttpStatusCode.BadRequest, "listingId and customerId are required.");
            if (string.IsNullOrWhiteSpace(dto.GuestName) || string.IsNullOrWhiteSpace(dto.GuestPhone)
                || string.IsNullOrWhiteSpace(dto.GuestEmail))
                return await Error(req, HttpStatusCode.BadRequest, "guestName, guestPhone and guestEmail are required.");

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            if (dto.CheckInDate < today)
                return await Error(req, HttpStatusCode.BadRequest, "checkInDate cannot be in the past.");
            if (dto.CheckOutDate <= dto.CheckInDate)
                return await Error(req, HttpStatusCode.BadRequest, "checkOutDate must be after checkInDate.");

            var listing = await _db.Listings.FindAsync(dto.ListingId);
            if (listing is null)
                return await Error(req, HttpStatusCode.NotFound, "Listing not found.");
            if (listing.ListingType != ListingType.ShortStay)
                return await Error(req, HttpStatusCode.BadRequest, "This listing is not a short-stay listing.");

            // Overlap check against anything currently blocking the calendar - same rule as the
            // availability endpoint, so a date the UI shows as free always actually is.
            var cutoff = DateTime.UtcNow - PendingPaymentExpiry;
            var overlaps = await _db.ShortStayBookings.AnyAsync(b =>
                b.ListingId == dto.ListingId &&
                (b.Status == "Confirmed" || (b.Status == "PendingPayment" && b.CreatedAt > cutoff)) &&
                b.CheckInDate < dto.CheckOutDate && b.CheckOutDate > dto.CheckInDate);
            if (overlaps)
                return await Error(req, HttpStatusCode.Conflict, "Those dates are no longer available.");

            // Booking fee is HALF of one night's rate, flat - never proportional to trip length,
            // and always computed server-side so a client can never influence the amount charged.
            var bookingFee = Math.Round(listing.Price / 2, 2, MidpointRounding.AwayFromZero);

            var booking = new ShortStayBooking
            {
                Id = Guid.NewGuid(),
                ListingId = dto.ListingId,
                CustomerId = dto.CustomerId,
                CheckInDate = dto.CheckInDate,
                CheckOutDate = dto.CheckOutDate,
                GuestName = dto.GuestName,
                GuestPhone = dto.GuestPhone,
                GuestEmail = dto.GuestEmail,
                NumberOfGuests = dto.NumberOfGuests > 0 ? dto.NumberOfGuests : 1,
                SpecialRequests = dto.SpecialRequests,
                BookingFeeAmount = bookingFee,
                Currency = listing.PriceCurrency,
                Status = "PendingPayment",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.ShortStayBookings.Add(booking);
            await _db.SaveChangesAsync();
            return await Json(req, HttpStatusCode.Created, await ToDetailDto(booking));
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Error creating short-stay booking");
            return await Error(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    // ── Get booking ───────────────────────────────────────────────────────────
    [Function("GetShortStayBooking")]
    [Authorize("Tenant", "PropertyOwner", "PropertyManager", "Admin")]
    public async Task<HttpResponseData> Get(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "short-stay-bookings/{id:guid}")] HttpRequestData req,
        Guid id)
    {
        var booking = await _db.ShortStayBookings
            .Include(b => b.Documents)
            .Include(b => b.Payments)
            .FirstOrDefaultAsync(b => b.Id == id);
        if (booking is null) return await Error(req, HttpStatusCode.NotFound, "Booking not found.");
        return await Json(req, HttpStatusCode.OK, await ToDetailDto(booking));
    }

    // ── Get by customer (paginated) ──────────────────────────────────────────
    [Function("GetShortStayBookingsByCustomer")]
    [Authorize("Tenant", "Admin")]
    public async Task<HttpResponseData> GetByCustomer(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "short-stay-bookings/customer/{customerId:guid}")] HttpRequestData req,
        Guid customerId)
    {
        var page = Math.Max(1, GetQueryInt(req, "page", 1));
        var pageSize = Math.Clamp(GetQueryInt(req, "pageSize", 20), 1, 100);

        var query = _db.ShortStayBookings
            .Where(b => b.CustomerId == customerId)
            .OrderByDescending(b => b.CreatedAt);

        var totalCount = await query.CountAsync();
        var bookings = await query
            .Include(b => b.Documents)
            .Include(b => b.Payments)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = new List<object>();
        foreach (var b in bookings) items.Add(await ToDetailDto(b));

        return await Json(req, HttpStatusCode.OK, new
        {
            items,
            totalCount,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
        });
    }

    // ── Get by owner (all listings) ───────────────────────────────────────────
    [Function("GetShortStayBookingsByOwner")]
    [Authorize("PropertyOwner", "PropertyManager", "Admin")]
    public async Task<HttpResponseData> GetByOwner(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "short-stay-bookings/owner/{ownerId:guid}")] HttpRequestData req,
        Guid ownerId)
    {
        var listingIds = await _db.Listings
            .Where(l => l.OwnerId == ownerId)
            .Select(l => l.Id)
            .ToListAsync();

        var bookings = await _db.ShortStayBookings
            .Include(b => b.Documents)
            .Include(b => b.Payments)
            .Where(b => listingIds.Contains(b.ListingId))
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

        var result = new List<object>();
        foreach (var b in bookings) result.Add(await ToDetailDto(b));
        return await Json(req, HttpStatusCode.OK, result);
    }

    // ── Cancel booking ────────────────────────────────────────────────────────
    [Function("CancelShortStayBooking")]
    [Authorize("Tenant", "PropertyOwner", "PropertyManager", "Admin")]
    public async Task<HttpResponseData> Cancel(
        [HttpTrigger(AuthorizationLevel.Anonymous, "patch", Route = "short-stay-bookings/{id:guid}/cancel")] HttpRequestData req,
        Guid id)
    {
        var booking = await _db.ShortStayBookings.FindAsync(id);
        if (booking is null) return await Error(req, HttpStatusCode.NotFound, "Booking not found.");

        string? reason = null;
        var body = await new StreamReader(req.Body).ReadToEndAsync();
        if (!string.IsNullOrWhiteSpace(body))
            reason = JsonSerializer.Deserialize<CancelShortStayBookingRequest>(body, _json)?.Reason;

        booking.Status = "Cancelled";
        booking.CancellationReason = reason;
        booking.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return await Json(req, HttpStatusCode.OK, await ToDetailDto(booking));
    }

    // ── Add ID verification document (AFTER payment only) ────────────────────
    [Function("AddShortStayBookingDocument")]
    [Authorize("Tenant", "Admin")]
    public async Task<HttpResponseData> AddDocument(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "short-stay-bookings/{id:guid}/documents")] HttpRequestData req,
        Guid id)
    {
        var booking = await _db.ShortStayBookings.Include(b => b.Documents).FirstOrDefaultAsync(b => b.Id == id);
        if (booking is null) return await Error(req, HttpStatusCode.NotFound, "Booking not found.");
        if (booking.Status != "Confirmed")
            return await Error(req, HttpStatusCode.Conflict,
                "ID verification can only be submitted once the booking fee payment is confirmed.");

        var body = await new StreamReader(req.Body).ReadToEndAsync();
        var dto = JsonSerializer.Deserialize<AddDocumentRequest>(body, _json);
        if (dto is null || string.IsNullOrWhiteSpace(dto.FileUrl) || string.IsNullOrWhiteSpace(dto.DocumentType))
            return await Error(req, HttpStatusCode.BadRequest, "fileUrl and documentType are required.");

        var allowedTypes = new[] { "IdFront", "IdBack", "Selfie" };
        if (!allowedTypes.Contains(dto.DocumentType))
            return await Error(req, HttpStatusCode.BadRequest, "documentType must be IdFront, IdBack or Selfie.");

        var existing = booking.Documents.FirstOrDefault(d => d.DocumentType == dto.DocumentType);
        if (existing != null) _db.ApplicationDocuments.Remove(existing);

        var doc = new ApplicationDocument
        {
            Id = Guid.NewGuid(),
            ShortStayBookingId = id,
            DocumentType = dto.DocumentType,
            FileUrl = dto.FileUrl,
            FileName = dto.FileName,
            UploadedAt = DateTime.UtcNow
        };
        _db.ApplicationDocuments.Add(doc);

        var remainingTypes = booking.Documents
            .Where(d => d.DocumentType != dto.DocumentType)
            .Select(d => d.DocumentType)
            .Append(dto.DocumentType)
            .ToHashSet();
        if (allowedTypes.All(remainingTypes.Contains))
            booking.DocumentsSubmittedAt = DateTime.UtcNow;

        booking.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return await Json(req, HttpStatusCode.Created, new
        {
            id = doc.Id,
            shortStayBookingId = doc.ShortStayBookingId,
            documentType = doc.DocumentType,
            fileUrl = doc.FileUrl,
            fileName = doc.FileName,
            uploadedAt = doc.UploadedAt
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private async Task<object> ToDetailDto(ShortStayBooking booking)
    {
        var listing = await _db.Listings
            .Select(l => new { id = l.Id, title = l.Title, listingCode = l.ListingCode, price = l.Price, priceCurrency = l.PriceCurrency })
            .FirstOrDefaultAsync(l => l.id == booking.ListingId);

        return new
        {
            id = booking.Id,
            listingId = booking.ListingId,
            customerId = booking.CustomerId,
            checkInDate = booking.CheckInDate,
            checkOutDate = booking.CheckOutDate,
            nights = booking.CheckOutDate.DayNumber - booking.CheckInDate.DayNumber,
            guestName = booking.GuestName,
            guestPhone = booking.GuestPhone,
            guestEmail = booking.GuestEmail,
            numberOfGuests = booking.NumberOfGuests,
            specialRequests = booking.SpecialRequests,
            bookingFeeAmount = booking.BookingFeeAmount,
            currency = booking.Currency,
            status = booking.Status,
            cancellationReason = booking.CancellationReason,
            documentsSubmittedAt = booking.DocumentsSubmittedAt,
            createdAt = booking.CreatedAt,
            updatedAt = booking.UpdatedAt,
            confirmedAt = booking.ConfirmedAt,
            listingTitle = listing?.title,
            listingCode = listing?.listingCode,
            listingPrice = listing?.price,
            documents = booking.Documents.Select(d => new
            {
                id = d.Id,
                documentType = d.DocumentType,
                fileUrl = d.FileUrl,
                fileName = d.FileName,
                uploadedAt = d.UploadedAt
            }),
            payments = booking.Payments.Select(p => new
            {
                id = p.Id,
                paymentType = p.PaymentType,
                amount = p.Amount,
                currency = p.Currency,
                method = p.Method,
                status = p.Status,
                mpesaReceiptNumber = p.MpesaReceiptNumber,
                reference = p.Reference,
                initiatedAt = p.InitiatedAt,
                confirmedAt = p.ConfirmedAt
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

    private static int GetQueryInt(HttpRequestData req, string name, int defaultValue)
    {
        var query = System.Web.HttpUtility.ParseQueryString(req.Url.Query);
        var value = query[name];
        return int.TryParse(value, out var result) ? result : defaultValue;
    }
}

// ── Request DTOs ──────────────────────────────────────────────────────────────
public record CreateShortStayBookingRequest(
    Guid ListingId, Guid CustomerId, DateOnly CheckInDate, DateOnly CheckOutDate,
    string GuestName, string GuestPhone, string GuestEmail, int NumberOfGuests, string? SpecialRequests);
public record CancelShortStayBookingRequest(string? Reason);
