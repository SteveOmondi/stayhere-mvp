namespace StayHere.Domain.Entities;

/// <summary>
/// Terms, rules, and payment/onboarding instructions set by the owner
/// for a specific listing. Shown to the tenant for acceptance.
/// </summary>
public class PropertyTerms
{
    public Guid Id { get; set; }
    public Guid ListingId { get; set; }

    public string Title { get; set; } = string.Empty;

    /// <summary>Full terms and conditions text (markdown supported).</summary>
    public string? TermsContent { get; set; }

    /// <summary>House rules (no smoking, no pets, quiet hours, etc.).</summary>
    public string? HouseRules { get; set; }

    /// <summary>Payment schedule and due dates.</summary>
    public string? PaymentTerms { get; set; }

    /// <summary>Notice period required before vacating, e.g. "1 Month".</summary>
    public string? NoticePeriod { get; set; }

    public string? PetPolicy { get; set; }
    public string? MaintenancePolicy { get; set; }
    public string? SecurityDepositTerms { get; set; }

    /// <summary>Minimum rental period, e.g. "6 months".</summary>
    public string? MinimumLeasePeriod { get; set; }

    public decimal? SecurityDeposit { get; set; }
    public decimal? WaterDeposit { get; set; }
    public decimal? ElectricityDeposit { get; set; }
    /// <summary>Prepaid electricity token deposit.</summary>
    public decimal? TokenDeposit { get; set; }
    public decimal? GarbageDeposit { get; set; }
    public decimal? AdminFee { get; set; }
    public string? Currency { get; set; } = "KES";

    // Payment details
    public string? MpesaPaybill { get; set; }
    public string? MpesaTill { get; set; }
    public string? MpesaAccountNumber { get; set; }
    public string? BankName { get; set; }
    public string? BankAccountName { get; set; }
    public string? BankAccountNumber { get; set; }
    public string? BankBranch { get; set; }

    /// <summary>Human-readable payment instructions shown before payment step.</summary>
    public string? PaymentInstructions { get; set; }

    /// <summary>Steps the tenant must take on move-in day.</summary>
    public string? OnboardingInstructions { get; set; }

    /// <summary>How to access the premises (gate code, key collection, etc.).</summary>
    public string? AccessInstructions { get; set; }

    /// <summary>Items the tenant must carry on day one (IDs, receipts, etc.).</summary>
    public string? ItemsToCarry { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public Listing? Listing { get; set; }
}
