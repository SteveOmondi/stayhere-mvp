namespace StayHere.Domain.Entities;

public class Customer
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? DisplayName { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public Guid? CountryId { get; set; }
    public Guid? CityId { get; set; }
    public string? AddressLine { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? IdType { get; set; }
    public string? IdNumberEncrypted { get; set; }
    public string? KycStatus { get; set; }
    public string? PreferredLanguage { get; set; }
    public string? PreferredCurrency { get; set; }
    public string? ProfilePhotoUrl { get; set; }
    public string? NotificationPreferencesJson { get; set; }
    public string AccountStatus { get; set; } = "Active";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }

    public ICollection<CustomerProperty> Properties { get; set; } = new List<CustomerProperty>();
    public ICollection<Document> Documents { get; set; } = new List<Document>();
}

public class CustomerProperty
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public Guid ListingId { get; set; }
    public string RelationshipType { get; set; } = string.Empty; // Rent or Own
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public decimal? AgreedPrice { get; set; }
    public string? Currency { get; set; }
    public string? UnitNumber { get; set; }
    public string? FloorNumber { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Customer Customer { get; set; } = null!;
}

public class Document
{
    public Guid Id { get; set; }
    public string EntityType { get; set; } = string.Empty; // e.g. Customer, Lease, Property
    public Guid EntityId { get; set; }
    public string DocumentType { get; set; } = string.Empty; // e.g. IdFront, IdBack, Signature, LeaseAgreement
    public string FileUrl { get; set; } = string.Empty;
    public DateTime UploadedAt { get; set; }
}

