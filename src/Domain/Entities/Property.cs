namespace StayHere.Domain.Entities;

public class Property
{
    public Guid Id { get; set; }
    public Guid OwnerId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Address Address { get; set; } = null!;
    public PropertyStatus Status { get; set; }
    public PropertyType Type { get; set; }
    public decimal MonthlyRent { get; set; }
    public string Currency { get; set; } = "KES";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public record Address(
    string Street,
    string City,
    string State,
    string PostalCode,
    string Country,
    double? Latitude = null,
    double? Longitude = null
);

public enum PropertyStatus
{
    Draft,
    PendingVerification,
    Published,
    Archived,
    Deleted
}

public enum PropertyType
{
    Apartment,
    House,
    Studio,
    Commercial,
    Land
}
