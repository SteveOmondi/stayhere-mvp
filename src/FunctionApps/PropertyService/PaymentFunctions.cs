using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StayHere.Infrastructure.Persistence;
using StayHere.Shared.Attributes;

namespace StayHere.PropertyService.Functions;

/// <summary>
/// Onboarding endpoint — surfaced here because it belongs to the application lifecycle.
///
/// All M-Pesa payment endpoints (STK Push, C2B, manual confirm, payment queries)
/// have been moved to the dedicated StayHere.PaymentsService function app.
///
/// GET /applications/{id}/onboarding   Get onboarding info for an active tenancy  [Tenant, Admin]
/// </summary>
public class PaymentFunctions
{
    private readonly StayHereDbContext _db;
    private readonly ILogger<PaymentFunctions> _log;

    public PaymentFunctions(StayHereDbContext db, ILogger<PaymentFunctions> log)
    {
        _db = db;
        _log = log;
    }

    // ── Onboarding info ────────────────────────────────────────────────────────

    /// <summary>
    /// Returns property access and onboarding instructions once the application
    /// is in Active status (i.e. payment has been confirmed).
    /// </summary>
    [Function("GetOnboardingInfo")]
    [Authorize("Tenant", "Admin")]
    public async Task<HttpResponseData> GetOnboarding(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get",
            Route = "applications/{id:guid}/onboarding")] HttpRequestData req,
        Guid id)
    {
        try
        {
            var app = await _db.TenantApplications
                .Include(a => a.Payments)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (app is null)
                return await Error(req, HttpStatusCode.NotFound, "Application not found.");

            if (app.Status != "Active")
                return await Error(req, HttpStatusCode.Conflict,
                    $"Onboarding is only available for active tenancies (current: {app.Status}).");

            var terms = await _db.PropertyTerms
                .Where(t => t.ListingId == app.ListingId && t.IsActive)
                .FirstOrDefaultAsync();

            var listing = await _db.Listings
                .Select(l => new { l.Id, l.Title, l.ListingCode, l.Location })
                .FirstOrDefaultAsync(l => l.Id == app.ListingId);

            var confirmedPayment = app.Payments
                .Where(p => p.Status == "Confirmed")
                .OrderByDescending(p => p.ConfirmedAt)
                .FirstOrDefault();

            return await Json(req, HttpStatusCode.OK, new
            {
                applicationId = app.Id,
                listing = listing is null ? null : new
                {
                    listing.Id,
                    listing.Title,
                    listing.ListingCode,
                    address = listing.Location is null
                        ? null
                        : $"{listing.Location.Street}, {listing.Location.Suburb}, {listing.Location.City}"
                },
                onboardingInstructions = terms?.OnboardingInstructions,
                accessInstructions = terms?.AccessInstructions,
                itemsToCarry = terms?.ItemsToCarry,
                payment = confirmedPayment is null ? null : new
                {
                    confirmedPayment.Amount,
                    confirmedPayment.Currency,
                    confirmedPayment.Method,
                    confirmedPayment.TransactionSource,
                    confirmedPayment.MpesaReceiptNumber,
                    confirmedPayment.MpesaTransactionId,
                    confirmedPayment.Reference,
                    confirmedPayment.ConfirmedAt
                },
                activatedAt = app.UpdatedAt,
                message = "Congratulations! Your tenancy is confirmed. Welcome to your new home."
            });
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Error fetching onboarding info for application {Id}", id);
            return await Error(req, HttpStatusCode.InternalServerError, ex.Message);
        }
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
