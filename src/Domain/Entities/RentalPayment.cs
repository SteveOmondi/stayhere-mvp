namespace StayHere.Domain.Entities;

/// <summary>
/// A payment record linked to a TenantApplication.
///
/// PaymentType:       SecurityDeposit | FirstMonth | AdminFee | MonthlyRent
/// Method:            Mpesa | BankTransfer | Card
/// Status:            Initiated | Pending | Confirmed | Failed
/// TransactionSource: STK_PUSH | C2B_PAYBILL | C2B_TILL | MANUAL
///
/// ApplicationId is nullable to support inbound C2B payments that arrive before
/// an application can be matched (e.g. if the BillRefNumber is not recognised).
/// These "unmatched" records remain queryable for admin reconciliation.
/// </summary>
public class RentalPayment
{
    public Guid Id { get; set; }

    /// <summary>
    /// Nullable so that inbound C2B payments can be stored even when no matching
    /// application is found at confirmation time.
    /// </summary>
    public Guid? ApplicationId { get; set; }

    public string PaymentType { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "KES";
    public string Method { get; set; } = string.Empty;
    public string Status { get; set; } = "Initiated";

    // ── Transaction source tag ─────────────────────────────────────────────────
    /// <summary>STK_PUSH | C2B_PAYBILL | C2B_TILL | MANUAL</summary>
    public string? TransactionSource { get; set; }

    // ── STK Push fields ────────────────────────────────────────────────────────
    /// <summary>Phone number for M-Pesa STK push (E.164 without leading +, e.g. 254712345678).</summary>
    public string? PhoneNumber { get; set; }

    /// <summary>MerchantRequestID from the Safaricom STK Push response.</summary>
    public string? MerchantRequestId { get; set; }

    /// <summary>CheckoutRequestID returned by Safaricom STK Push initiation.</summary>
    public string? MpesaCheckoutRequestId { get; set; }

    /// <summary>MpesaReceiptNumber from the STK callback metadata (e.g. QKB12AB345C).</summary>
    public string? MpesaReceiptNumber { get; set; }

    // ── C2B / M-Pesa shared transaction fields ─────────────────────────────────
    /// <summary>
    /// Unique M-Pesa TransID from C2B confirmation (e.g. LGR019G3J2).
    /// This is the canonical M-Pesa transaction identifier for C2B flows.
    /// </summary>
    public string? MpesaTransactionId { get; set; }

    /// <summary>The paybill or till number the customer paid to.</summary>
    public string? BusinessShortCode { get; set; }

    /// <summary>
    /// The account number entered by the customer at the M-Pesa prompt
    /// (BillRefNumber in Safaricom's C2B payload). Used to match the payment
    /// to a TenantApplication.
    /// </summary>
    public string? BillRefNumber { get; set; }

    /// <summary>Invoice number provided in the C2B payload (often empty).</summary>
    public string? InvoiceNumber { get; set; }

    /// <summary>Safaricom-reported org account balance after the transaction.</summary>
    public decimal? OrgAccountBalance { get; set; }

    // ── Payer identity (from C2B payload) ─────────────────────────────────────
    public string? PayerFirstName { get; set; }
    public string? PayerMiddleName { get; set; }
    public string? PayerLastName { get; set; }

    /// <summary>
    /// Transaction timestamp as reported by Safaricom (yyyyMMddHHmmss format).
    /// Stored as string to preserve exact Safaricom value.
    /// </summary>
    public string? MpesaTransactionDate { get; set; }

    // ── General fields ─────────────────────────────────────────────────────────
    /// <summary>Generic payment reference (bank ref, admin confirmation ref, etc.).</summary>
    public string? Reference { get; set; }

    public string? Notes { get; set; }

    /// <summary>Raw JSON payload from Safaricom callback — stored for audit and debugging.</summary>
    public string? RawCallbackPayload { get; set; }

    public DateTime InitiatedAt { get; set; }
    public DateTime? ConfirmedAt { get; set; }

    // Navigation
    public TenantApplication? Application { get; set; }
}
