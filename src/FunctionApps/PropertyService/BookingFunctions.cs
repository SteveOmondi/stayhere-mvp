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
/// Viewing Booking endpoints.
///
/// POST   /bookings                              Create a booking request            [Tenant]
/// GET    /bookings/{id}                         Get booking by ID                   [Tenant, PropertyOwner, PropertyManager, Admin]
/// GET    /bookings/customer/{customerId}        All bookings for a customer         [Tenant, Admin]
/// GET    /bookings/listing/{listingId}          All bookings for a listing          [PropertyOwner, PropertyManager, Admin]
/// PATCH  /bookings/{id}/confirm                 Confirm (owner/PM)                  [PropertyOwner, PropertyManager, Admin]
/// PATCH  /bookings/{id}/cancel                  Cancel                              [Tenant, PropertyOwner, PropertyManager, Admin]
/// PATCH  /bookings/{id}/complete                Mark completed                      [PropertyOwner, PropertyManager, Admin]
/// </summary>
public class BookingFunctions
{
    private readonly StayHereDbContext _db;
    private readonly ILogger<BookingFunctions> _log;
    private static readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);

    public BookingFunctions(StayHereDbContext db, ILogger<BookingFunctions> log)
    {
        _db = db;
        _log = log;
    }

    // ── Create booking ────────────────────────────────────────────────────────
    [Function("CreateViewingBooking")]
    [Authorize("Tenant", "Admin")]
    public async Task<HttpResponseData> CreateBooking(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "bookings")] HttpRequestData req)
    {
        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<CreateBookingRequest>(body, _json);
            if (dto == null || dto.ListingId == Guid.Empty || dto.CustomerId is null || dto.CustomerId == Guid.Empty)
                return await Error(req, HttpStatusCode.BadRequest, "ListingId and CustomerId are required.");
            if (dto.ViewingDate is null)
                return await Error(req, HttpStatusCode.BadRequest, "viewingDate is required.");

            var booking = new ViewingBooking
            {
                Id = Guid.NewGuid(),
                ListingId = dto.ListingId,
                CustomerId = dto.CustomerId!.Value,
                PreferredDate = DateTime.SpecifyKind(dto.ViewingDate.Value.Date, DateTimeKind.Utc),
                PreferredTime = dto.ViewingTime ?? "10:00",
                ViewingType = dto.ViewingType ?? "Physical",
                Notes = dto.Notes,
                ContactPhone = dto.ContactPhone,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.ViewingBookings.Add(booking);
            await _db.SaveChangesAsync();

            return await Json(req, HttpStatusCode.Created, ToDto(booking));
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Error creating booking");
            return await Error(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    // ── Get booking ────────────────────────────────────────────────────────────
    [Function("GetViewingBooking")]
    [Authorize("Tenant", "PropertyOwner", "PropertyManager", "Admin")]
    public async Task<HttpResponseData> GetBooking(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "bookings/{id:guid}")] HttpRequestData req,
        Guid id)
    {
        var booking = await _db.ViewingBookings.FindAsync(id);
        if (booking == null) return await Error(req, HttpStatusCode.NotFound, "Booking not found.");
        return await Json(req, HttpStatusCode.OK, ToDto(booking));
    }

    // ── Get bookings by customer ───────────────────────────────────────────────
    [Function("GetBookingsByCustomer")]
    [Authorize("Tenant", "Admin")]
    public async Task<HttpResponseData> GetByCustomer(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "bookings/customer/{customerId:guid}")] HttpRequestData req,
        Guid customerId)
    {
        // The client app doesn't always have a cached Customer profile at hand - when it doesn't,
        // it falls back to passing the caller's raw UserId here instead of their formal Customer.Id
        // (the two differ once a Customer record exists). Bookings themselves are always stored
        // under the formal Customer.Id (see CreateBooking/Sage's book_viewing tool), so a bare
        // UserId match here found nothing even though the booking was really theirs - confirmed via
        // a booking created by Sage that was visible on the owner portal but invisible in "My
        // Bookings". Resolve the other direction too, same dual-match rationale as
        // EfViewingBookingRepository.GetByCustomerAsync.
        var formalCustomerId = await _db.Customers
            .Where(c => c.UserId == customerId)
            .Select(c => (Guid?)c.Id)
            .FirstOrDefaultAsync();

        var bookings = await _db.ViewingBookings
            .Where(b => b.CustomerId == customerId || (formalCustomerId.HasValue && b.CustomerId == formalCustomerId.Value))
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

        // Unlike GetBookingsByOwner below, this previously returned bare listingId GUIDs with no
        // title/photo/price - fine for the owner side (which already has the listing in context),
        // but useless for a customer-facing "My Bookings" card, which has nothing else to show.
        var listingIds = bookings.Select(b => b.ListingId).Distinct().ToList();
        var listingMap = await _db.Listings
            .Where(l => listingIds.Contains(l.Id))
            .Select(l => new { l.Id, l.Title, l.ListingCode, l.PrimaryImageUrl, l.Price, l.PriceCurrency, City = l.Location.City, Suburb = l.Location.Suburb })
            .ToDictionaryAsync(l => l.Id);

        var result = bookings.Select(b =>
        {
            var d = ToDto(b);
            if (listingMap.TryGetValue(b.ListingId, out var l))
            {
                d["listingTitle"] = l.Title;
                d["listingCode"] = l.ListingCode;
                d["listingImageUrl"] = l.PrimaryImageUrl;
                d["listingPrice"] = l.Price;
                d["listingCurrency"] = l.PriceCurrency;
                d["listingLocation"] = string.IsNullOrWhiteSpace(l.Suburb) ? l.City : $"{l.Suburb}, {l.City}";
            }
            return d;
        });

        return await Json(req, HttpStatusCode.OK, result);
    }

    // ── Get bookings by listing ────────────────────────────────────────────────
    [Function("GetBookingsByListing")]
    [Authorize("PropertyOwner", "PropertyManager", "Admin")]
    public async Task<HttpResponseData> GetByListing(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "bookings/listing/{listingId:guid}")] HttpRequestData req,
        Guid listingId)
    {
        var bookings = await _db.ViewingBookings
            .Where(b => b.ListingId == listingId)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();
        return await Json(req, HttpStatusCode.OK, bookings.Select(ToDto));
    }

    // ── Get all bookings for an owner's listings ───────────────────────────────
    [Function("GetBookingsByOwner")]
    [Authorize("PropertyOwner", "PropertyManager", "Admin")]
    public async Task<HttpResponseData> GetByOwner(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "bookings/owner/{ownerId:guid}")] HttpRequestData req,
        Guid ownerId)
    {
        var listingIds = await _db.Listings
            .Where(l => l.OwnerId == ownerId)
            .Select(l => l.Id)
            .ToListAsync();

        var bookings = await _db.ViewingBookings
            .Where(b => listingIds.Contains(b.ListingId))
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

        // Enrich with listing info
        var listingMap = await _db.Listings
            .Where(l => listingIds.Contains(l.Id))
            .Select(l => new { l.Id, l.Title, l.ListingCode })
            .ToDictionaryAsync(l => l.Id);

        var result = bookings.Select(b =>
        {
            var d = ToDto(b);
            if (listingMap.TryGetValue(b.ListingId, out var l))
            {
                d["listingTitle"] = l.Title;
                d["listingCode"] = l.ListingCode;
            }
            return d;
        });

        return await Json(req, HttpStatusCode.OK, result);
    }

    // ── Confirm booking ────────────────────────────────────────────────────────
    [Function("ConfirmViewingBooking")]
    [Authorize("PropertyOwner", "PropertyManager", "Admin")]
    public async Task<HttpResponseData> ConfirmBooking(
        [HttpTrigger(AuthorizationLevel.Anonymous, "patch", Route = "bookings/{id:guid}/confirm")] HttpRequestData req,
        Guid id)
    {
        var booking = await _db.ViewingBookings.FindAsync(id);
        if (booking == null) return await Error(req, HttpStatusCode.NotFound, "Booking not found.");

        var body = await new StreamReader(req.Body).ReadToEndAsync();
        var dto = string.IsNullOrWhiteSpace(body) ? null
            : JsonSerializer.Deserialize<UpdateBookingRequest>(body, _json);

        booking.Status = "Confirmed";
        booking.OwnerNotes = dto?.OwnerNotes ?? booking.OwnerNotes;
        booking.MeetingLink = dto?.MeetingLink ?? booking.MeetingLink;
        booking.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return await Json(req, HttpStatusCode.OK, ToDto(booking));
    }

    // ── Cancel booking ─────────────────────────────────────────────────────────
    [Function("CancelViewingBooking")]
    [Authorize("Tenant", "PropertyOwner", "PropertyManager", "Admin")]
    public async Task<HttpResponseData> CancelBooking(
        [HttpTrigger(AuthorizationLevel.Anonymous, "patch", Route = "bookings/{id:guid}/cancel")] HttpRequestData req,
        Guid id)
    {
        var booking = await _db.ViewingBookings.FindAsync(id);
        if (booking == null) return await Error(req, HttpStatusCode.NotFound, "Booking not found.");

        var body = await new StreamReader(req.Body).ReadToEndAsync();
        var dto = string.IsNullOrWhiteSpace(body) ? null
            : JsonSerializer.Deserialize<UpdateBookingRequest>(body, _json);

        booking.Status = "Cancelled";
        booking.OwnerNotes = dto?.OwnerNotes ?? booking.OwnerNotes;
        booking.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return await Json(req, HttpStatusCode.OK, ToDto(booking));
    }

    // ── Complete booking ───────────────────────────────────────────────────────
    [Function("CompleteViewingBooking")]
    [Authorize("PropertyOwner", "PropertyManager", "Admin")]
    public async Task<HttpResponseData> CompleteBooking(
        [HttpTrigger(AuthorizationLevel.Anonymous, "patch", Route = "bookings/{id:guid}/complete")] HttpRequestData req,
        Guid id)
    {
        var booking = await _db.ViewingBookings.FindAsync(id);
        if (booking == null) return await Error(req, HttpStatusCode.NotFound, "Booking not found.");

        booking.Status = "Completed";
        booking.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return await Json(req, HttpStatusCode.OK, ToDto(booking));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private static Dictionary<string, object?> ToDto(ViewingBooking b) => new()
    {
        ["id"] = b.Id,
        ["listingId"] = b.ListingId,
        ["customerId"] = b.CustomerId,
        ["preferredDate"] = b.PreferredDate.ToString("yyyy-MM-dd"),
        ["preferredTime"] = b.PreferredTime,
        ["viewingType"] = b.ViewingType,
        ["status"] = b.Status,
        ["notes"] = b.Notes,
        ["ownerNotes"] = b.OwnerNotes,
        ["meetingLink"] = b.MeetingLink,
        ["contactPhone"] = b.ContactPhone,
        ["createdAt"] = b.CreatedAt,
        ["updatedAt"] = b.UpdatedAt
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

// ── Request DTOs ──────────────────────────────────────────────────────────────
public record CreateBookingRequest(
    Guid ListingId,
    Guid? CustomerId,
    DateTime? ViewingDate,
    string? ViewingTime,
    string? ViewingType,
    string? Notes,
    string? ContactPhone);

public record UpdateBookingRequest(
    string? OwnerNotes,
    string? MeetingLink);
