using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StayHere.Domain.Entities;
using StayHere.Infrastructure.Persistence;
using StayHere.Shared.Attributes;

namespace StayHere.PaymentsService.Mpesa;

/// <summary>
/// C2B (Customer-to-Business) endpoints for M-Pesa PayBill and Buy Goods (Till) flows.
///
/// These are triggered by the customer paying directly from their M-Pesa app by
/// entering the business short code and an account number — no STK prompt is shown.
///
/// Safaricom flow:
///   1. Customer dials *150*00# or opens M-Pesa → PayBill/Buy Goods
///   2. Enters business short code + account reference (BillRefNumber)
///   3. Safaricom POST /payments/mpesa/c2b/validate   (optional — must respond within 5 s)
///   4. If validated (or validation not configured), Safaricom processes the payment
///   5. Safaricom POST /payments/mpesa/c2b/confirm    (always fires on success)
///
/// POST /payments/mpesa/c2b/register   Register validation + confirmation URLs  [Admin]
/// POST /payments/mpesa/c2b/validate   Safaricom pre-payment validation          [Anonymous]
/// POST /payments/mpesa/c2b/confirm    Safaricom post-payment confirmation        [Anonymous]
///
/// BillRefNumber format expected: APP{8-char-hex} (e.g. APPD3A7F1C2)
/// This is generated during the STK Push initiation and displayed to the customer
/// on their payment instructions so they can use the same reference for C2B.
/// </summary>
public class C2bFunctions
{
    private readonly StayHereDbContext _db;
    private readonly MpesaService _mpesa;
    private readonly ILogger<C2bFunctions> _log;
    private static readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);

    public C2bFunctions(StayHereDbContext db, MpesaService mpesa, ILogger<C2bFunctions> log)
    {
        _db = db;
        _mpesa = mpesa;
        _log = log;
    }

    // ── Register C2B URLs ──────────────────────────────────────────────────────

    /// <summary>
    /// Registers the validation and confirmation callback URLs with Safaricom.
    /// Safe to call multiple times; Safaricom overwrites the previously stored URLs.
    /// Must be called once before going live, and again whenever the URLs change.
    /// </summary>
    [Function("RegisterC2bUrls")]
    [Authorize("Admin")]
    public async Task<HttpResponseData> RegisterC2bUrls(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post",
            Route = "payments/mpesa/c2b/register")] HttpRequestData req)
    {
        var result = await _mpesa.RegisterC2bUrlsAsync();

        if (!result.Success)
        {
            _log.LogError("C2B URL registration failed: {Message}", result.Message);
            return await Json(req, HttpStatusCode.BadGateway, new
            {
                success = false,
                message = result.Message
            });
        }

        _log.LogInformation("C2B URLs registered successfully: {Message}", result.Message);
        return await Json(req, HttpStatusCode.OK, new
        {
            success = true,
            message = result.Message
        });
    }

    // ── C2B Validation ─────────────────────────────────────────────────────────

    /// <summary>
    /// Safaricom calls this URL before processing the payment so we can accept or reject it.
    ///
    /// Validation rules:
    ///   - BillRefNumber must match the pattern APP{8-hex} and map to a TenantApplication
    ///   - The application must be in TermsAccepted or PaymentPending status
    ///   - The amount must be within a reasonable range (KES 100 – 5,000,000)
    ///
    /// Safaricom expects a JSON response within 5 seconds.
    /// If we time out or return any non-200, Safaricom uses the ResponseType configured
    /// during registration: "Completed" means accept; "Cancelled" means reject.
    ///
    /// Incoming payload from Safaricom:
    /// {
    ///   "TransactionType": "Pay Bill",
    ///   "TransID":         "LGR019G3J2",
    ///   "TransTime":       "20170727104247",
    ///   "TransAmount":     "10.00",
    ///   "BusinessShortCode": "600496",
    ///   "BillRefNumber":   "APPD3A7F1C2",
    ///   "InvoiceNumber":   "",
    ///   "OrgAccountBalance": "",
    ///   "ThirdPartyTransID": "",
    ///   "MSISDN":          "254708374149",
    ///   "FirstName":       "John",
    ///   "MiddleName":      "",
    ///   "LastName":        "Doe"
    /// }
    /// </summary>
    [Function("C2bValidate")]
    public async Task<HttpResponseData> Validate(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post",
            Route = "payments/mpesa/c2b/validate")] HttpRequestData req)
    {
        var raw = await new StreamReader(req.Body).ReadToEndAsync();
        _log.LogInformation("C2B validation request: {Payload}", raw);

        try
        {
            using var doc = JsonDocument.Parse(raw);
            var root = doc.RootElement;

            var billRef = root.GetPropertyOrNull("BillRefNumber")?.GetString() ?? string.Empty;
            var transAmount = root.GetPropertyOrNull("TransAmount")?.GetString() ?? "0";

            if (!TryParseApplicationRef(billRef, out var appShortId))
            {
                _log.LogWarning("C2B validation rejected: unrecognised BillRefNumber '{Ref}'.", billRef);
                return await C2bResponse(req, "C2B00011", "Invalid account number format.");
            }

            var app = await FindApplicationByShortId(appShortId);
            if (app is null)
            {
                _log.LogWarning("C2B validation rejected: no application matching short ID '{Id}'.", appShortId);
                return await C2bResponse(req, "C2B00011", "Account number not found.");
            }

            if (app.Status is not ("TermsAccepted" or "PaymentPending" or "Active"))
            {
                _log.LogWarning(
                    "C2B validation rejected: application {AppId} is in status '{Status}'.",
                    app.Id, app.Status);
                return await C2bResponse(req, "C2B00011",
                    "Account is not in a state to accept payments.");
            }

            if (!decimal.TryParse(transAmount, out var amount) || amount < 100 || amount > 5_000_000)
            {
                _log.LogWarning(
                    "C2B validation rejected: amount '{Amount}' is out of acceptable range.", transAmount);
                return await C2bResponse(req, "C2B00012", "Amount is outside acceptable range.");
            }

            _log.LogInformation(
                "C2B validation accepted for application {AppId}, amount {Amount}.",
                app.Id, amount);
            return await C2bResponse(req, "0", "Accepted");
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Unhandled error during C2B validation. Defaulting to accept.");
            // Default to accepting so valid payments are never lost due to our own errors.
            // Safaricom's "Completed" ResponseType also ensures this as a backstop.
            return await C2bResponse(req, "0", "Accepted");
        }
    }

    // ── C2B Confirmation ───────────────────────────────────────────────────────

    /// <summary>
    /// Safaricom calls this URL after a C2B payment is successfully processed.
    /// This is the authoritative record — money has already moved by the time this fires.
    /// Must always return HTTP 200 with ResultCode "0".
    ///
    /// Incoming payload from Safaricom:
    /// {
    ///   "TransactionType":   "Pay Bill",      // "Pay Bill" or "Buy Goods"
    ///   "TransID":           "LGR019G3J2",    // Unique M-Pesa transaction ID
    ///   "TransTime":         "20170727104247",
    ///   "TransAmount":       "10.00",
    ///   "BusinessShortCode": "600496",
    ///   "BillRefNumber":     "APPD3A7F1C2",
    ///   "InvoiceNumber":     "",
    ///   "OrgAccountBalance": "49197.00",
    ///   "ThirdPartyTransID": "",
    ///   "MSISDN":            "254708374149",
    ///   "FirstName":         "John",
    ///   "MiddleName":        "",
    ///   "LastName":          "Doe"
    /// }
    /// </summary>
    [Function("C2bConfirm")]
    public async Task<HttpResponseData> Confirm(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post",
            Route = "payments/mpesa/c2b/confirm")] HttpRequestData req)
    {
        var raw = await new StreamReader(req.Body).ReadToEndAsync();
        _log.LogInformation("C2B confirmation received: {Payload}", raw);

        try
        {
            using var doc = JsonDocument.Parse(raw);
            var root = doc.RootElement;

            var transId = root.GetPropertyOrNull("TransID")?.GetString() ?? string.Empty;
            var transType = root.GetPropertyOrNull("TransactionType")?.GetString() ?? string.Empty;
            var transTime = root.GetPropertyOrNull("TransTime")?.GetString();
            var transAmountStr = root.GetPropertyOrNull("TransAmount")?.GetString() ?? "0";
            var shortCode = root.GetPropertyOrNull("BusinessShortCode")?.GetString();
            var billRef = root.GetPropertyOrNull("BillRefNumber")?.GetString() ?? string.Empty;
            var invoiceNo = root.GetPropertyOrNull("InvoiceNumber")?.GetString();
            var orgBalance = root.GetPropertyOrNull("OrgAccountBalance")?.GetString();
            var msisdn = root.GetPropertyOrNull("MSISDN")?.GetString();
            var firstName = root.GetPropertyOrNull("FirstName")?.GetString();
            var middleName = root.GetPropertyOrNull("MiddleName")?.GetString();
            var lastName = root.GetPropertyOrNull("LastName")?.GetString();

            // Guard against duplicate delivery (Safaricom may retry confirmations)
            if (!string.IsNullOrWhiteSpace(transId))
            {
                var duplicate = await _db.RentalPayments
                    .AnyAsync(p => p.MpesaTransactionId == transId);
                if (duplicate)
                {
                    _log.LogInformation("C2B confirmation duplicate — TransID {Id} already recorded.", transId);
                    return await C2bResponse(req, "0", "Success");
                }
            }

            decimal.TryParse(transAmountStr, out var amount);
            decimal.TryParse(orgBalance, out var balance);

            // Determine TransactionSource from Safaricom's TransactionType
            var source = transType.Contains("Bill", StringComparison.OrdinalIgnoreCase)
                ? "C2B_PAYBILL"
                : "C2B_TILL";

            // Attempt to match to a TenantApplication via BillRefNumber
            TenantApplication? app = null;
            if (TryParseApplicationRef(billRef, out var appShortId))
                app = await FindApplicationByShortId(appShortId);

            var payment = new RentalPayment
            {
                Id = Guid.NewGuid(),
                ApplicationId = app?.Id,
                PaymentType = "Mpesa",
                Amount = amount,
                Currency = "KES",
                Method = "Mpesa",
                TransactionSource = source,
                Status = "Confirmed",

                // M-Pesa transaction identifiers
                MpesaTransactionId = transId,
                MpesaTransactionDate = transTime,
                BusinessShortCode = shortCode,
                BillRefNumber = billRef,
                InvoiceNumber = string.IsNullOrWhiteSpace(invoiceNo) ? null : invoiceNo,
                OrgAccountBalance = balance > 0 ? balance : null,

                // Payer identity
                PhoneNumber = msisdn,
                PayerFirstName = firstName,
                PayerMiddleName = string.IsNullOrWhiteSpace(middleName) ? null : middleName,
                PayerLastName = lastName,

                RawCallbackPayload = raw,
                InitiatedAt = DateTime.UtcNow,
                ConfirmedAt = DateTime.UtcNow
            };

            _db.RentalPayments.Add(payment);

            if (app is not null && app.Status is "TermsAccepted" or "PaymentPending")
            {
                app.Status = "Active";
                app.UpdatedAt = DateTime.UtcNow;
                _log.LogInformation(
                    "C2B payment confirmed — application {AppId} promoted to Active. Receipt: {TransId}.",
                    app.Id, transId);
            }
            else if (app is null)
            {
                _log.LogWarning(
                    "C2B confirmation saved without matching application (BillRefNumber='{Ref}'). " +
                    "Admin reconciliation required for payment {PaymentId}.",
                    billRef, payment.Id);
            }

            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Unhandled error in C2B confirmation. Payment may NOT have been saved.");
        }

        return await C2bResponse(req, "0", "Success");
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /// <summary>
    /// BillRefNumber format: APP{first 8 hex chars of application Guid, uppercase}.
    /// Example: for Guid d3a7f1c2-..., BillRefNumber = "APPD3A7F1C2".
    /// </summary>
    private static bool TryParseApplicationRef(string billRef, out string shortId)
    {
        shortId = string.Empty;
        if (string.IsNullOrWhiteSpace(billRef))
            return false;
        var upper = billRef.Trim().ToUpperInvariant();
        if (!upper.StartsWith("APP") || upper.Length < 11)
            return false;
        shortId = upper[3..]; // strip "APP" prefix
        return true;
    }

    private async Task<TenantApplication?> FindApplicationByShortId(string shortId)
    {
        // Match the first 8 hex chars of the GUID (no hyphens, uppercase)
        return await _db.TenantApplications
            .Where(a => a.Id.ToString().Replace("-", "")
                .ToUpper()
                .StartsWith(shortId))
            .FirstOrDefaultAsync();
    }

    private static async Task<HttpResponseData> C2bResponse(
        HttpRequestData req, string resultCode, string resultDesc)
    {
        var res = req.CreateResponse(HttpStatusCode.OK);
        res.Headers.Add("Content-Type", "application/json");
        await res.WriteStringAsync(
            JsonSerializer.Serialize(new { ResultCode = resultCode, ResultDesc = resultDesc }));
        return res;
    }

    private static async Task<HttpResponseData> Json(HttpRequestData req, HttpStatusCode code, object data)
    {
        var res = req.CreateResponse(code);
        await res.WriteAsJsonAsync(data);
        return res;
    }
}
