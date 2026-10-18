using System.Net;
using System.Security.Claims;
using System.Text.Json;
using System.Web;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StayHere.Application.Common.Interfaces;
using StayHere.Domain.Entities;
using StayHere.Infrastructure.Persistence;
using StayHere.Shared.Attributes;

namespace StayHere.PropertyService.Functions;

/// <summary>
/// In-app enquiry threads between a customer and a listing's property owner - the only channel
/// customer and owner ever communicate through. Nothing here ever returns a phone number or
/// email for either party, by construction: responses are hand-built DTOs that simply never join
/// in those fields.
///
/// POST   /enquiries                    Create-or-get a thread for a listing  [Tenant, Admin]
/// GET    /enquiries/mine               This customer's threads (?maxResults) [Tenant, Admin]
/// GET    /enquiries/owner/mine         This owner's threads (?maxResults)    [PropertyOwner, PropertyManager, Admin]
/// GET    /enquiries/{id}/messages      Messages in a thread (?after=ISO8601) [Tenant, PropertyOwner, PropertyManager, Admin]
/// POST   /enquiries/{id}/messages      Send a message (rate-limited)         [Tenant, PropertyOwner, PropertyManager, Admin]
/// PATCH  /enquiries/{id}/read          Mark caller's own side as read       [Tenant, PropertyOwner, PropertyManager, Admin]
///
/// Identity for every endpoint is resolved ONLY from the caller's own verified JWT (never a
/// client-supplied id) - the same pattern SavedListingFunctions.ResolveIdentityAsync established,
/// deliberately not BookingFunctions' older route-param-trusting style, which is exactly the bug
/// class that caused several real, previously-live issues this session (My Bookings empty, Saved
/// listings empty twice).
/// </summary>
public class EnquiryFunctions
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private const int MaxMessageLength = 2000;

    /// <summary>List endpoints are polled every ~30-45s by every signed-in user (navbar badge) -
    /// capping them keeps that steady background load flat regardless of how many threads a
    /// power user/owner accumulates over time.</summary>
    private const int DefaultListLimit = 50;
    private const int MaxListLimit = 100;

    /// <summary>Per-sender message-send limit - generous for a real person typing, but enough to
    /// stop a script from flooding a thread (or every thread) with no cost to them.</summary>
    private const int MessageRateLimitMaxCount = 20;
    private static readonly TimeSpan MessageRateLimitWindow = TimeSpan.FromMinutes(1);

    private readonly StayHereDbContext _db;
    private readonly ICacheService _cache;
    private readonly IConfiguration _configuration;
    private readonly ILogger<EnquiryFunctions> _logger;

    public EnquiryFunctions(StayHereDbContext db, ICacheService cache, IConfiguration configuration, ILogger<EnquiryFunctions> logger)
    {
        _db = db;
        _cache = cache;
        _configuration = configuration;
        _logger = logger;
    }

    [Function("CreateEnquiry")]
    [Authorize("Tenant", "Admin")]
    public async Task<HttpResponseData> Create(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "enquiries")] HttpRequestData req)
    {
        var (userId, customerId) = await ResolveCustomerIdentityAsync(req);
        if (userId == null)
            return await Error(req, HttpStatusCode.Unauthorized, "Not signed in.");

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<CreateEnquiryRequest>(body, JsonOptions);
            if (dto == null || dto.ListingId == Guid.Empty)
                return await Error(req, HttpStatusCode.BadRequest, "listingId is required.");

            var listing = await _db.Listings.FindAsync(dto.ListingId);
            if (listing == null)
                return await Error(req, HttpStatusCode.NotFound, "Listing not found.");

            var effectiveCustomerId = customerId ?? userId.Value;

            var existing = await _db.Enquiries.FirstOrDefaultAsync(e =>
                e.ListingId == dto.ListingId && e.CustomerId == effectiveCustomerId);
            if (existing != null)
                return await Json(req, HttpStatusCode.OK, ToSummaryDto(existing, listing, 0));

            var enquiry = new Enquiry
            {
                Id = Guid.NewGuid(),
                ListingId = dto.ListingId,
                CustomerId = effectiveCustomerId,
                OwnerId = listing.OwnerId,
                Status = "Open",
                CreatedAt = DateTime.UtcNow,
                LastMessageAt = DateTime.UtcNow,
                LastMessagePreview = null,
                CustomerLastReadAt = DateTime.UtcNow
            };
            _db.Enquiries.Add(enquiry);
            await _db.SaveChangesAsync();

            return await Json(req, HttpStatusCode.Created, ToSummaryDto(enquiry, listing, 0));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating enquiry");
            return await Error(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("GetMyEnquiries")]
    [Authorize("Tenant", "Admin")]
    public async Task<HttpResponseData> GetMine(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "enquiries/mine")] HttpRequestData req)
    {
        var (userId, customerId) = await ResolveCustomerIdentityAsync(req);
        if (userId == null)
            return await Error(req, HttpStatusCode.Unauthorized, "Not signed in.");

        var effectiveCustomerId = customerId ?? userId.Value;
        var limit = ResolveListLimit(req);

        var enquiries = await _db.Enquiries
            .Where(e => e.CustomerId == effectiveCustomerId)
            .OrderByDescending(e => e.LastMessageAt)
            .Take(limit)
            .ToListAsync();

        var listingMap = await LoadListingMapAsync(enquiries.Select(e => e.ListingId));
        var unreadByEnquiry = await CountUnreadAsync(enquiries.Select(e => e.Id).ToList(), fromRole: "Owner", perCustomerSide: true);

        var result = enquiries.Select(e =>
        {
            listingMap.TryGetValue(e.ListingId, out var listing);
            var unread = unreadByEnquiry.GetValueOrDefault(e.Id, 0);
            return ToSummaryDto(e, listing, unread);
        });

        return await Json(req, HttpStatusCode.OK, result);
    }

    [Function("GetOwnerEnquiries")]
    [Authorize("PropertyOwner", "PropertyManager", "Admin")]
    public async Task<HttpResponseData> GetOwnerMine(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "enquiries/owner/mine")] HttpRequestData req)
    {
        var (userId, ownerId) = await ResolveOwnerIdentityAsync(req);
        if (userId == null)
            return await Error(req, HttpStatusCode.Unauthorized, "Not signed in.");

        var effectiveOwnerId = ownerId ?? userId.Value;
        var limit = ResolveListLimit(req);

        var enquiries = await _db.Enquiries
            .Where(e => e.OwnerId == effectiveOwnerId)
            .OrderByDescending(e => e.LastMessageAt)
            .Take(limit)
            .ToListAsync();

        var listingMap = await LoadListingMapAsync(enquiries.Select(e => e.ListingId));
        var customerIds = enquiries.Select(e => e.CustomerId).Distinct().ToList();
        var customerNameMap = await _db.Customers
            .Where(c => customerIds.Contains(c.Id))
            .Select(c => new { c.Id, c.DisplayName, c.FirstName, c.LastName })
            .ToDictionaryAsync(c => c.Id, c => string.IsNullOrWhiteSpace(c.DisplayName)
                ? $"{c.FirstName} {c.LastName}".Trim()
                : c.DisplayName!);
        var unreadByEnquiry = await CountUnreadAsync(enquiries.Select(e => e.Id).ToList(), fromRole: "Customer", perCustomerSide: false);

        var result = enquiries.Select(e =>
        {
            listingMap.TryGetValue(e.ListingId, out var listing);
            var unread = unreadByEnquiry.GetValueOrDefault(e.Id, 0);
            var d = ToSummaryDto(e, listing, unread);
            d["customerName"] = customerNameMap.TryGetValue(e.CustomerId, out var name) && !string.IsNullOrWhiteSpace(name)
                ? name
                : "StayHere customer";
            return d;
        });

        return await Json(req, HttpStatusCode.OK, result);
    }

    [Function("GetEnquiryMessages")]
    [Authorize("Tenant", "PropertyOwner", "PropertyManager", "Admin")]
    public async Task<HttpResponseData> GetMessages(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "enquiries/{id:guid}/messages")] HttpRequestData req,
        Guid id)
    {
        var enquiry = await _db.Enquiries.FindAsync(id);
        if (enquiry == null)
            return await Error(req, HttpStatusCode.NotFound, "Enquiry not found.");

        var participant = await ResolveParticipantAsync(req, enquiry);
        if (participant == null)
            return await Error(req, HttpStatusCode.Unauthorized, "Not signed in.");
        if (!participant.Value.IsAuthorized)
            return await Error(req, HttpStatusCode.Forbidden, "You don't have access to this enquiry.");

        var query = HttpUtility.ParseQueryString(req.Url.Query);
        var afterRaw = query["after"];

        var messagesQuery = _db.EnquiryMessages.Where(m => m.EnquiryId == id);
        if (!string.IsNullOrWhiteSpace(afterRaw) && DateTime.TryParse(afterRaw, null,
                System.Globalization.DateTimeStyles.RoundtripKind, out var after))
        {
            messagesQuery = messagesQuery.Where(m => m.CreatedAt > after);
        }

        var messages = await messagesQuery.OrderBy(m => m.CreatedAt).ToListAsync();

        return await Json(req, HttpStatusCode.OK, messages.Select(ToMessageDto));
    }

    [Function("SendEnquiryMessage")]
    [Authorize("Tenant", "PropertyOwner", "PropertyManager", "Admin")]
    public async Task<HttpResponseData> SendMessage(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "enquiries/{id:guid}/messages")] HttpRequestData req,
        Guid id)
    {
        var enquiry = await _db.Enquiries.FindAsync(id);
        if (enquiry == null)
            return await Error(req, HttpStatusCode.NotFound, "Enquiry not found.");

        var participant = await ResolveParticipantAsync(req, enquiry);
        if (participant == null)
            return await Error(req, HttpStatusCode.Unauthorized, "Not signed in.");
        if (!participant.Value.IsAuthorized)
            return await Error(req, HttpStatusCode.Forbidden, "You don't have access to this enquiry.");

        // Per-sender, not per-thread - otherwise a script could flood N different threads in
        // parallel to dodge a single thread's limit. Keyed on the resolved caller id (never a
        // client-supplied value), and lives in Redis so it holds regardless of which Function
        // instance picks up the request - this limiter has to work the same at 1 instance or 50.
        var rateLimitKey = $"enquiry-msg-rl:{participant.Value.UserId}";
        var allowed = await _cache.TryConsumeRateLimitAsync(rateLimitKey, MessageRateLimitMaxCount, MessageRateLimitWindow);
        if (!allowed)
            return await Error(req, HttpStatusCode.TooManyRequests, "You're sending messages too quickly - please slow down and try again shortly.");

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<SendEnquiryMessageRequest>(body, JsonOptions);
            var text = dto?.Body?.Trim();
            if (string.IsNullOrWhiteSpace(text))
                return await Error(req, HttpStatusCode.BadRequest, "body is required.");
            if (text.Length > MaxMessageLength)
                text = text[..MaxMessageLength];

            var now = DateTime.UtcNow;
            var message = new EnquiryMessage
            {
                Id = Guid.NewGuid(),
                EnquiryId = id,
                SenderRole = participant.Value.Role,
                SenderUserId = participant.Value.UserId,
                Body = text,
                CreatedAt = now
            };
            _db.EnquiryMessages.Add(message);

            enquiry.LastMessageAt = now;
            enquiry.LastMessagePreview = text.Length > 140 ? text[..140] : text;
            // You've obviously "read" your own just-sent message - never bump the other side's.
            if (participant.Value.Role == "Customer") enquiry.CustomerLastReadAt = now;
            else enquiry.OwnerLastReadAt = now;

            await _db.SaveChangesAsync();

            return await Json(req, HttpStatusCode.Created, ToMessageDto(message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending enquiry message");
            return await Error(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    [Function("MarkEnquiryRead")]
    [Authorize("Tenant", "PropertyOwner", "PropertyManager", "Admin")]
    public async Task<HttpResponseData> MarkRead(
        [HttpTrigger(AuthorizationLevel.Anonymous, "patch", Route = "enquiries/{id:guid}/read")] HttpRequestData req,
        Guid id)
    {
        var enquiry = await _db.Enquiries.FindAsync(id);
        if (enquiry == null)
            return await Error(req, HttpStatusCode.NotFound, "Enquiry not found.");

        var participant = await ResolveParticipantAsync(req, enquiry);
        if (participant == null)
            return await Error(req, HttpStatusCode.Unauthorized, "Not signed in.");
        if (!participant.Value.IsAuthorized)
            return await Error(req, HttpStatusCode.Forbidden, "You don't have access to this enquiry.");

        var now = DateTime.UtcNow;
        if (participant.Value.Role == "Customer") enquiry.CustomerLastReadAt = now;
        else enquiry.OwnerLastReadAt = now;
        await _db.SaveChangesAsync();

        return await Json(req, HttpStatusCode.OK, new { success = true });
    }

    // ── Identity resolution (JWT-only, same shape as SavedListingFunctions) ────

    private async Task<(Guid? UserId, Guid? CustomerId)> ResolveCustomerIdentityAsync(HttpRequestData req)
    {
        var userId = GetCallerUserId(req);
        if (userId == null) return (null, null);

        var customer = await _db.Customers.Where(c => c.UserId == userId.Value)
            .Select(c => (Guid?)c.Id).FirstOrDefaultAsync();
        return (userId, customer);
    }

    private async Task<(Guid? UserId, Guid? OwnerId)> ResolveOwnerIdentityAsync(HttpRequestData req)
    {
        var userId = GetCallerUserId(req);
        if (userId == null) return (null, null);

        // The owner portal's dev-mode X-User-Id header carries the PropertyOwner.Id directly
        // (its OwnerContext caches a resolved owner profile and sends THAT id), unlike the client
        // app's X-User-Id which carries the raw auth UserId - so this value could legitimately be
        // either one depending on caller. Matching both sides is cheap and makes this correct for
        // both local dev conventions and a real JWT in production, where it's always the UserId.
        var owner = await _db.PropertyOwners
            .Where(o => o.UserId == userId.Value || o.Id == userId.Value)
            .Select(o => (Guid?)o.Id).FirstOrDefaultAsync();
        return (userId, owner);
    }

    private readonly record struct Participant(Guid UserId, string Role, bool IsAuthorized);

    /// <summary>Resolves the caller against BOTH sides and reports which one (if either) they
    /// are a participant on, so the same two endpoints (messages/read) serve either role without
    /// duplicating them per side.</summary>
    private async Task<Participant?> ResolveParticipantAsync(HttpRequestData req, Enquiry enquiry)
    {
        var userId = GetCallerUserId(req);
        if (userId == null) return null;

        var customer = await _db.Customers.Where(c => c.UserId == userId.Value)
            .Select(c => (Guid?)c.Id).FirstOrDefaultAsync();
        var isCustomerSide = (customer.HasValue && enquiry.CustomerId == customer.Value) || enquiry.CustomerId == userId.Value;
        if (isCustomerSide) return new Participant(userId.Value, "Customer", true);

        var owner = await _db.PropertyOwners.Where(o => o.UserId == userId.Value || o.Id == userId.Value)
            .Select(o => (Guid?)o.Id).FirstOrDefaultAsync();
        var isOwnerSide = (owner.HasValue && enquiry.OwnerId == owner.Value) || enquiry.OwnerId == userId.Value;
        if (isOwnerSide) return new Participant(userId.Value, "Owner", true);

        return new Participant(userId.Value, "Customer", false);
    }

    /// <summary>Caller's UserId from their verified JWT. Mirrors AgentFunctions.GetCallerUserId /
    /// SavedListingFunctions.ResolveIdentityAsync's SKIP_AUTH/X-User-Id local-dev fallback.</summary>
    private Guid? GetCallerUserId(HttpRequestData req)
    {
        if (string.Equals(_configuration["SKIP_AUTH"], "true", StringComparison.OrdinalIgnoreCase)
            && req.Headers.TryGetValues("X-User-Id", out var vals)
            && Guid.TryParse(vals.FirstOrDefault(), out var headerGuid))
        {
            return headerGuid;
        }

        if (!req.FunctionContext.Items.TryGetValue("User", out var principalObj) || principalObj is not ClaimsPrincipal principal)
            return null;

        var id = principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal.FindFirstValue("nameid");
        return Guid.TryParse(id, out var claimsGuid) ? claimsGuid : null;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// <summary>?maxResults on the list endpoints, defaulted and hard-capped - these are polled
    /// every ~30-45s by every signed-in user, so an unbounded result set would mean the steady
    /// background load keeps growing with how many threads one user accumulates over time rather
    /// than staying flat.</summary>
    private static int ResolveListLimit(HttpRequestData req)
    {
        var query = HttpUtility.ParseQueryString(req.Url.Query);
        if (int.TryParse(query["maxResults"], out var requested) && requested > 0)
            return Math.Min(requested, MaxListLimit);
        return DefaultListLimit;
    }

    private async Task<Dictionary<Guid, Listing>> LoadListingMapAsync(IEnumerable<Guid> listingIds)
    {
        var ids = listingIds.Distinct().ToList();
        return await _db.Listings.Where(l => ids.Contains(l.Id)).ToDictionaryAsync(l => l.Id);
    }

    /// <summary>One grouped query for the whole list - never N+1. perCustomerSide selects which
    /// *LastReadAt column messages are compared against.</summary>
    private async Task<Dictionary<Guid, int>> CountUnreadAsync(List<Guid> enquiryIds, string fromRole, bool perCustomerSide)
    {
        if (enquiryIds.Count == 0) return new Dictionary<Guid, int>();

        var joined = _db.EnquiryMessages
            .Where(m => enquiryIds.Contains(m.EnquiryId) && m.SenderRole == fromRole)
            .Join(_db.Enquiries, m => m.EnquiryId, e => e.Id, (m, e) => new { m.EnquiryId, m.CreatedAt, e.CustomerLastReadAt, e.OwnerLastReadAt });

        var filtered = perCustomerSide
            ? joined.Where(x => x.CustomerLastReadAt == null || x.CreatedAt > x.CustomerLastReadAt)
            : joined.Where(x => x.OwnerLastReadAt == null || x.CreatedAt > x.OwnerLastReadAt);

        var counts = await filtered
            .GroupBy(x => x.EnquiryId)
            .Select(g => new { EnquiryId = g.Key, Count = g.Count() })
            .ToListAsync();

        return counts.ToDictionary(c => c.EnquiryId, c => c.Count);
    }

    private static Dictionary<string, object?> ToSummaryDto(Enquiry e, Listing? listing, int unreadCount) => new()
    {
        ["id"] = e.Id,
        ["listingId"] = e.ListingId,
        ["status"] = e.Status,
        ["createdAt"] = e.CreatedAt,
        ["lastMessageAt"] = e.LastMessageAt,
        ["lastMessagePreview"] = e.LastMessagePreview,
        ["unreadCount"] = unreadCount,
        ["listingTitle"] = listing?.Title,
        ["listingCode"] = listing?.ListingCode,
        ["listingImageUrl"] = listing?.PrimaryImageUrl,
        ["listingPrice"] = listing?.Price,
        ["listingCurrency"] = listing?.PriceCurrency,
        ["listingLocation"] = listing?.Location == null ? null
            : string.IsNullOrWhiteSpace(listing.Location.Suburb) ? listing.Location.City : $"{listing.Location.Suburb}, {listing.Location.City}"
    };

    private static Dictionary<string, object?> ToMessageDto(EnquiryMessage m) => new()
    {
        ["id"] = m.Id,
        ["enquiryId"] = m.EnquiryId,
        ["senderRole"] = m.SenderRole,
        ["body"] = m.Body,
        ["createdAt"] = m.CreatedAt
    };

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

// ── Request DTOs ──────────────────────────────────────────────────────────────
public record CreateEnquiryRequest(Guid ListingId);
public record SendEnquiryMessageRequest(string? Body);
