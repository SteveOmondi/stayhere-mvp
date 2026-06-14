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
/// STK Push endpoints.
///
/// POST /payments/mpesa/stk/initiate            Trigger an STK Push prompt on the customer's phone  [Tenant, Admin]
/// POST /payments/mpesa/stk/callback            Safaricom posts result here after user acts          [Anonymous]
/// GET  /payments/mpesa/stk/query/{requestId}   Poll Safaricom for STK status (debug / retry)       [Admin]
/// </summary>
public class StkPushFunctions
{
    private readonly StayHereDbContext _db;
    private readonly MpesaService _mpesa;
    private readonly ILogger<StkPushFunctions> _log;
    private static readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);

    public StkPushFunctions(StayHereDbContext db, MpesaService mpesa, ILogger<StkPushFunctions> log)
    {
        _db = db;
        _mpesa = mpesa;
        _log = log;
    }

    // ── Initiate STK Push ──────────────────────────────────────────────────────

    /// <summary>
    /// Triggers a Safaricom STK Push prompt on the customer's phone.
    ///
    /// Request body:
    /// {
    ///   "applicationId": "guid",
    ///   "phoneNumber":   "0712345678 | 254712345678 | +254712345678",
    ///   "paymentType":   "SecurityDeposit | FirstMonth | AdminFee | MonthlyRent",
    ///   "amount":        1000.00   // optional — falls back to PropertyTerms
    /// }
    ///
    /// Response 201:
    /// {
    ///   "paymentId":          "guid",
    ///   "checkoutRequestId":  "ws_CO_...",
    ///   "merchantRequestId":  "...",
    ///   "status":             "Pending",
    ///   "amount":             1000.00,
    ///   "phoneNumber":        "254712345678"
    /// }
    /// </summary>
    [Function("InitiateStkPush")]
    [Authorize("Tenant", "Admin")]
    public async Task<HttpResponseData> InitiateStkPush(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post",
            Route = "payments/mpesa/stk/initiate")] HttpRequestData req)
    {
        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<StkInitiateRequest>(body, _json);

            if (dto is null || dto.ApplicationId == Guid.Empty)
                return await Error(req, HttpStatusCode.BadRequest, "applicationId is required.");
            if (string.IsNullOrWhiteSpace(dto.PhoneNumber))
                return await Error(req, HttpStatusCode.BadRequest, "phoneNumber is required.");

            var app = await _db.TenantApplications
                .Include(a => a.Payments)
                .FirstOrDefaultAsync(a => a.Id == dto.ApplicationId);

            if (app is null)
                return await Error(req, HttpStatusCode.NotFound, "Application not found.");

            if (app.Status is not ("TermsAccepted" or "PaymentPending"))
                return await Error(req, HttpStatusCode.Conflict,
                    $"STK Push can only be initiated after terms acceptance (current: {app.Status}).");

            var terms = await _db.PropertyTerms
                .Where(t => t.ListingId == app.ListingId && t.IsActive)
                .FirstOrDefaultAsync();

            var amount = ResolveAmount(dto, terms);
            if (amount <= 0)
                return await Error(req, HttpStatusCode.BadRequest,
                    "amount must be greater than zero. Provide it explicitly or configure PropertyTerms.");

            var phone = NormalisePhone(dto.PhoneNumber);

            var stkResult = await _mpesa.InitiateStkPushAsync(
                phone,
                amount,
                accountReference: $"APP{dto.ApplicationId.ToString("N")[..8].ToUpper()}");

            var payment = new RentalPayment
            {
                Id = Guid.NewGuid(),
                ApplicationId = dto.ApplicationId,
                PaymentType = dto.PaymentType ?? "SecurityDeposit",
                Amount = amount,
                Currency = terms?.Currency ?? "KES",
                Method = "Mpesa",
                TransactionSource = "STK_PUSH",
                Status = stkResult.Success ? "Pending" : "Failed",
                PhoneNumber = phone,
                MerchantRequestId = stkResult.MerchantRequestId,
                MpesaCheckoutRequestId = stkResult.CheckoutRequestId,
                Notes = stkResult.Success ? null : stkResult.ErrorMessage,
                InitiatedAt = DateTime.UtcNow
            };

            app.Status = "PaymentPending";
            app.UpdatedAt = DateTime.UtcNow;
            _db.RentalPayments.Add(payment);
            await _db.SaveChangesAsync();

            if (!stkResult.Success)
                return await Json(req, HttpStatusCode.BadGateway, new
                {
                    error = "STK Push failed — see errorDetail.",
                    errorDetail = stkResult.ErrorMessage,
                    paymentId = payment.Id
                });

            return await Json(req, HttpStatusCode.Created, new
            {
                paymentId = payment.Id,
                checkoutRequestId = payment.MpesaCheckoutRequestId,
                merchantRequestId = payment.MerchantRequestId,
                transactionSource = payment.TransactionSource,
                status = payment.Status,
                amount = payment.Amount,
                currency = payment.Currency,
                phoneNumber = payment.PhoneNumber,
                initiatedAt = payment.InitiatedAt
            });
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Error initiating STK Push.");
            return await Error(req, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    // ── STK Push Callback ──────────────────────────────────────────────────────

    /// <summary>
    /// Safaricom POSTs to this URL after the customer accepts or dismisses the STK prompt.
    /// Must ALWAYS return HTTP 200 — Safaricom retries on any other status code.
    ///
    /// Success payload (ResultCode == 0):
    /// {
    ///   "Body": {
    ///     "stkCallback": {
    ///       "MerchantRequestID": "...",
    ///       "CheckoutRequestID": "ws_CO_...",
    ///       "ResultCode": 0,
    ///       "ResultDesc": "The service request is processed successfully.",
    ///       "CallbackMetadata": {
    ///         "Item": [
    ///           {"Name":"Amount",              "Value":1000.00},
    ///           {"Name":"MpesaReceiptNumber",  "Value":"NLJ7RT61SV"},
    ///           {"Name":"TransactionDate",     "Value":20191219102115},
    ///           {"Name":"PhoneNumber",         "Value":254712345678}
    ///         ]
    ///       }
    ///     }
    ///   }
    /// }
    ///
    /// Failure payload (ResultCode != 0):
    /// { "Body": { "stkCallback": { "ResultCode": 1032, "ResultDesc": "Request cancelled by user" } } }
    /// </summary>
    [Function("StkPushCallback")]
    public async Task<HttpResponseData> StkCallback(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post",
            Route = "payments/mpesa/stk/callback")] HttpRequestData req)
    {
        var raw = await new StreamReader(req.Body).ReadToEndAsync();
        _log.LogInformation("STK Push callback received: {Payload}", raw);

        try
        {
            using var doc = JsonDocument.Parse(raw);
            var stkCallback = doc.RootElement
                .GetProperty("Body")
                .GetProperty("stkCallback");

            var resultCode = stkCallback.GetProperty("ResultCode").GetInt32();
            var checkoutId = stkCallback.GetProperty("CheckoutRequestID").GetString();
            var merchantId = stkCallback.GetPropertyOrNull("MerchantRequestID")?.GetString();

            var payment = await _db.RentalPayments
                .Include(p => p.Application)
                .FirstOrDefaultAsync(p => p.MpesaCheckoutRequestId == checkoutId);

            if (payment is null)
            {
                _log.LogWarning("STK callback: no payment found for CheckoutRequestID {Id}.", checkoutId);
                return req.CreateResponse(HttpStatusCode.OK);
            }

            payment.RawCallbackPayload = raw;

            if (resultCode == 0)
            {
                // Extract CallbackMetadata items
                var items = stkCallback
                    .GetProperty("CallbackMetadata")
                    .GetProperty("Item");

                string? receipt = null;
                string? transactionDate = null;
                decimal? confirmedAmount = null;

                foreach (var item in items.EnumerateArray())
                {
                    var name = item.GetProperty("Name").GetString();
                    switch (name)
                    {
                        case "MpesaReceiptNumber":
                            receipt = item.GetPropertyOrNull("Value")?.GetString();
                            break;
                        case "TransactionDate":
                            // Safaricom sends this as a number e.g. 20191219102115
                            transactionDate = item.GetPropertyOrNull("Value")?.ToString();
                            break;
                        case "Amount":
                            if (item.GetPropertyOrNull("Value") is { } amtEl)
                                confirmedAmount = amtEl.ValueKind == JsonValueKind.Number
                                    ? amtEl.GetDecimal()
                                    : decimal.TryParse(amtEl.GetString(), out var d) ? d : null;
                            break;
                    }
                }

                payment.Status = "Confirmed";
                payment.MpesaReceiptNumber = receipt;
                // Safaricom's TransID for STK is the receipt number; store in both fields
                payment.MpesaTransactionId = receipt;
                payment.MpesaTransactionDate = transactionDate;
                if (confirmedAmount.HasValue)
                    payment.Amount = confirmedAmount.Value;
                payment.ConfirmedAt = DateTime.UtcNow;

                if (payment.Application is { Status: "PaymentPending" })
                {
                    payment.Application.Status = "Active";
                    payment.Application.UpdatedAt = DateTime.UtcNow;
                }

                _log.LogInformation(
                    "STK Push confirmed — payment {PaymentId}, receipt {Receipt}.",
                    payment.Id, receipt);
            }
            else
            {
                var resultDesc = stkCallback.GetPropertyOrNull("ResultDesc")?.GetString() ?? "STK failed.";
                payment.Status = "Failed";
                payment.Notes = $"[{resultCode}] {resultDesc}";

                _log.LogWarning(
                    "STK Push failed for payment {PaymentId}: [{Code}] {Desc}.",
                    payment.Id, resultCode, resultDesc);
            }

            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Error processing STK callback. Raw body was preserved for audit if payment was found.");
        }

        // Safaricom expects HTTP 200 regardless of our internal outcome
        return req.CreateResponse(HttpStatusCode.OK);
    }

    // ── Query STK status ───────────────────────────────────────────────────────

    /// <summary>
    /// Asks Safaricom for the current status of an STK Push transaction.
    /// Useful when the callback has not arrived within the expected window
    /// (Safaricom callback SLA is up to 2 minutes).
    ///
    /// Also returns the local DB record for the same checkoutRequestId.
    /// </summary>
    [Function("QueryStkStatus")]
    [Authorize("Admin")]
    public async Task<HttpResponseData> QueryStkStatus(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get",
            Route = "payments/mpesa/stk/query/{checkoutRequestId}")] HttpRequestData req,
        string checkoutRequestId)
    {
        var safaricomResult = await _mpesa.QueryStkStatusAsync(checkoutRequestId);

        var local = await _db.RentalPayments
            .Where(p => p.MpesaCheckoutRequestId == checkoutRequestId)
            .Select(p => new { p.Id, p.Status, p.Amount, p.PhoneNumber, p.InitiatedAt, p.ConfirmedAt })
            .FirstOrDefaultAsync();

        return await Json(req, HttpStatusCode.OK, new
        {
            checkoutRequestId,
            safaricom = new
            {
                resultCode = safaricomResult.ResultCode,
                resultDesc = safaricomResult.ResultDesc,
                isSuccess = safaricomResult.IsSuccess,
                isPending = safaricomResult.IsPending
            },
            localRecord = local
        });
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private static string NormalisePhone(string raw)
    {
        var digits = raw.TrimStart('+').TrimStart('0');
        return digits.StartsWith("254") ? digits : $"254{digits}";
    }

    private static decimal ResolveAmount(StkInitiateRequest dto, PropertyTerms? terms)
    {
        if (dto.Amount > 0) return dto.Amount;
        return (dto.PaymentType ?? "SecurityDeposit") switch
        {
            "SecurityDeposit" => terms?.SecurityDeposit ?? 0,
            "AdminFee"        => terms?.AdminFee ?? 0,
            _                 => 0
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

// ── Request DTO ────────────────────────────────────────────────────────────────
public record StkInitiateRequest(
    Guid ApplicationId,
    string PhoneNumber,
    string? PaymentType,
    decimal Amount);
