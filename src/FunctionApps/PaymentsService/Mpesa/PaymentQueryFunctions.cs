using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StayHere.Infrastructure.Persistence;
using StayHere.Shared.Attributes;

namespace StayHere.PaymentsService.Mpesa;

/// <summary>
/// General payment query and management endpoints.
///
/// GET   /payments/{paymentId}                    Get a single payment record     [Tenant, PropertyOwner, PropertyManager, Admin]
/// GET   /payments/application/{applicationId}    All payments for an application [Tenant, PropertyOwner, PropertyManager, Admin]
/// GET   /payments/unmatched                       C2B payments with no application [Admin]
/// PATCH /payments/{paymentId}/manual-confirm      Manually mark a payment confirmed [PropertyOwner, PropertyManager, Admin]
/// PATCH /payments/{paymentId}/match/{applicationId} Link an unmatched C2B payment to an application [Admin]
/// </summary>
public class PaymentQueryFunctions
{
    private readonly StayHereDbContext _db;
    private readonly ILogger<PaymentQueryFunctions> _log;

    public PaymentQueryFunctions(StayHereDbContext db, ILogger<PaymentQueryFunctions> log)
    {
        _db = db;
        _log = log;
    }

    // ── Get single payment ─────────────────────────────────────────────────────

    [Function("GetPayment")]
    [Authorize("Tenant", "PropertyOwner", "PropertyManager", "Admin")]
    public async Task<HttpResponseData> GetPayment(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get",
            Route = "payments/{paymentId:guid}")] HttpRequestData req,
        Guid paymentId)
    {
        // NOTE: explicit camelCase names, not `new { p.Prop }` shorthand - that preserves the
        // entity's PascalCase verbatim, and this Functions host has no camelCase naming policy
        // configured, so a shorthand projection leaks PascalCase onto the wire. The frontend's
        // RentalPayment type (and the STK-push status poll's `p.status === "Confirmed"` check in
        // RentalFlowPage) only ever reads camelCase, so that check would silently never match.
        var payment = await _db.RentalPayments
            .Where(p => p.Id == paymentId)
            .Select(p => new
            {
                id = p.Id,
                applicationId = p.ApplicationId,
                paymentType = p.PaymentType,
                amount = p.Amount,
                currency = p.Currency,
                method = p.Method,
                transactionSource = p.TransactionSource,
                status = p.Status,
                phoneNumber = p.PhoneNumber,
                merchantRequestId = p.MerchantRequestId,
                mpesaCheckoutRequestId = p.MpesaCheckoutRequestId,
                mpesaReceiptNumber = p.MpesaReceiptNumber,
                mpesaTransactionId = p.MpesaTransactionId,
                businessShortCode = p.BusinessShortCode,
                billRefNumber = p.BillRefNumber,
                orgAccountBalance = p.OrgAccountBalance,
                payerName = string.IsNullOrWhiteSpace(p.PayerFirstName)
                    ? null
                    : $"{p.PayerFirstName} {p.PayerMiddleName} {p.PayerLastName}".Trim(),
                mpesaTransactionDate = p.MpesaTransactionDate,
                reference = p.Reference,
                notes = p.Notes,
                initiatedAt = p.InitiatedAt,
                confirmedAt = p.ConfirmedAt
            })
            .FirstOrDefaultAsync();

        if (payment is null)
            return await Error(req, HttpStatusCode.NotFound, "Payment not found.");

        return await Json(req, HttpStatusCode.OK, payment);
    }

    // ── All payments for an application ───────────────────────────────────────

    [Function("GetPaymentsByApplication")]
    [Authorize("Tenant", "PropertyOwner", "PropertyManager", "Admin")]
    public async Task<HttpResponseData> GetByApplication(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get",
            Route = "payments/application/{applicationId:guid}")] HttpRequestData req,
        Guid applicationId)
    {
        var payments = await _db.RentalPayments
            .Where(p => p.ApplicationId == applicationId)
            .OrderByDescending(p => p.InitiatedAt)
            .Select(p => new
            {
                id = p.Id,
                paymentType = p.PaymentType,
                amount = p.Amount,
                currency = p.Currency,
                method = p.Method,
                transactionSource = p.TransactionSource,
                status = p.Status,
                mpesaReceiptNumber = p.MpesaReceiptNumber,
                mpesaTransactionId = p.MpesaTransactionId,
                reference = p.Reference,
                initiatedAt = p.InitiatedAt,
                confirmedAt = p.ConfirmedAt
            })
            .ToListAsync();

        return await Json(req, HttpStatusCode.OK, payments);
    }

    // ── Unmatched C2B payments (admin reconciliation) ─────────────────────────

    /// <summary>
    /// Returns C2B payments that arrived without a matching application.
    /// Admins can review these and use /match to link them manually.
    /// </summary>
    [Function("GetUnmatchedPayments")]
    [Authorize("Admin")]
    public async Task<HttpResponseData> GetUnmatched(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get",
            Route = "payments/unmatched")] HttpRequestData req)
    {
        var payments = await _db.RentalPayments
            .Where(p => p.ApplicationId == null && p.Status == "Confirmed")
            .OrderByDescending(p => p.ConfirmedAt ?? p.InitiatedAt)
            .Select(p => new
            {
                id = p.Id,
                amount = p.Amount,
                currency = p.Currency,
                transactionSource = p.TransactionSource,
                mpesaTransactionId = p.MpesaTransactionId,
                billRefNumber = p.BillRefNumber,
                businessShortCode = p.BusinessShortCode,
                payerName = string.IsNullOrWhiteSpace(p.PayerFirstName)
                    ? null
                    : $"{p.PayerFirstName} {p.PayerMiddleName} {p.PayerLastName}".Trim(),
                phoneNumber = p.PhoneNumber,
                mpesaTransactionDate = p.MpesaTransactionDate,
                confirmedAt = p.ConfirmedAt
            })
            .ToListAsync();

        return await Json(req, HttpStatusCode.OK, new { count = payments.Count, payments });
    }

    // ── Manual confirm ─────────────────────────────────────────────────────────

    /// <summary>
    /// Allows a property owner or admin to manually mark a payment as confirmed.
    /// Useful for BankTransfer payments where confirmation is manual, or
    /// for STK Push payments whose callback was not received.
    ///
    /// Body (all optional):
    /// { "reference": "TXN-123", "notes": "Confirmed via bank statement" }
    /// </summary>
    [Function("ManualConfirmPayment")]
    [Authorize("PropertyOwner", "PropertyManager", "Admin")]
    public async Task<HttpResponseData> ManualConfirm(
        [HttpTrigger(AuthorizationLevel.Anonymous, "patch",
            Route = "payments/{paymentId:guid}/manual-confirm")] HttpRequestData req,
        Guid paymentId)
    {
        var payment = await _db.RentalPayments
            .Include(p => p.Application)
            .Include(p => p.ShortStayBooking)
            .FirstOrDefaultAsync(p => p.Id == paymentId);

        if (payment is null)
            return await Error(req, HttpStatusCode.NotFound, "Payment not found.");

        if (payment.Status == "Confirmed")
            return await Error(req, HttpStatusCode.Conflict, "Payment is already confirmed.");

        var body = await new StreamReader(req.Body).ReadToEndAsync();
        ManualConfirmRequest? dto = null;
        if (!string.IsNullOrWhiteSpace(body))
        {
            try
            {
                dto = System.Text.Json.JsonSerializer.Deserialize<ManualConfirmRequest>(
                    body, new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web));
            }
            catch { /* ignore parse errors for optional body */ }
        }

        payment.Status = "Confirmed";
        payment.TransactionSource ??= "MANUAL";
        payment.Reference = dto?.Reference ?? payment.Reference;
        payment.Notes = dto?.Notes ?? payment.Notes;
        payment.ConfirmedAt = DateTime.UtcNow;

        if (payment.Application is { Status: "PaymentPending" or "TermsAccepted" })
        {
            payment.Application.Status = "Active";
            payment.Application.UpdatedAt = DateTime.UtcNow;
        }
        else if (payment.ShortStayBooking is { Status: "PendingPayment" })
        {
            payment.ShortStayBooking.Status = "Confirmed";
            payment.ShortStayBooking.ConfirmedAt = DateTime.UtcNow;
            payment.ShortStayBooking.UpdatedAt = DateTime.UtcNow;
        }

        var listingId = payment.Application?.ListingId ?? payment.ShortStayBooking?.ListingId;
        await WalletCreditHelper.CreditOwnerWalletAsync(_db, _log, payment, listingId);

        await _db.SaveChangesAsync();

        _log.LogInformation(
            "Payment {PaymentId} manually confirmed. Reference: {Ref}.",
            paymentId, payment.Reference);

        return await Json(req, HttpStatusCode.OK, new
        {
            payment.Id,
            payment.Status,
            payment.TransactionSource,
            payment.Reference,
            payment.ConfirmedAt,
            applicationStatus = payment.Application?.Status
        });
    }

    // ── Match unmatched C2B payment to application ─────────────────────────────

    /// <summary>
    /// Links an unmatched C2B payment (ApplicationId == null) to a TenantApplication.
    /// Promotes the application to Active if it was in PaymentPending.
    /// </summary>
    [Function("MatchPaymentToApplication")]
    [Authorize("Admin")]
    public async Task<HttpResponseData> MatchPayment(
        [HttpTrigger(AuthorizationLevel.Anonymous, "patch",
            Route = "payments/{paymentId:guid}/match/{applicationId:guid}")] HttpRequestData req,
        Guid paymentId,
        Guid applicationId)
    {
        var payment = await _db.RentalPayments
            .FirstOrDefaultAsync(p => p.Id == paymentId);

        if (payment is null)
            return await Error(req, HttpStatusCode.NotFound, "Payment not found.");

        if (payment.ApplicationId.HasValue)
            return await Error(req, HttpStatusCode.Conflict,
                $"Payment is already linked to application {payment.ApplicationId}.");

        var app = await _db.TenantApplications
            .FirstOrDefaultAsync(a => a.Id == applicationId);

        if (app is null)
            return await Error(req, HttpStatusCode.NotFound, "Application not found.");

        payment.ApplicationId = applicationId;

        if (payment.Status == "Confirmed")
        {
            if (app.Status is "PaymentPending" or "TermsAccepted")
            {
                app.Status = "Active";
                app.UpdatedAt = DateTime.UtcNow;
            }

            // This payment was previously unmatched, so WalletCreditHelper could never resolve an
            // owner for it at confirmation time - this is the first opportunity to credit it.
            await WalletCreditHelper.CreditOwnerWalletAsync(_db, _log, payment, app.ListingId);
        }

        await _db.SaveChangesAsync();

        _log.LogInformation(
            "Unmatched payment {PaymentId} linked to application {AppId}. App status: {Status}.",
            paymentId, applicationId, app.Status);

        return await Json(req, HttpStatusCode.OK, new
        {
            paymentId = payment.Id,
            applicationId = app.Id,
            applicationStatus = app.Status
        });
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

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

public record ManualConfirmRequest(string? Reference, string? Notes);
