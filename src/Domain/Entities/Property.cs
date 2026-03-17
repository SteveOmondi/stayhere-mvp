namespace StayHere.Domain.Entities;

/// <summary>
/// Represents a property (building/complex) e.g. "Fairdeal Apartments" with multiple units.
/// </summary>
public class Property
{
    public Guid Id { get; set; }
    public string PropertyCode { get; set; } = string.Empty;
    /// <summary>Building or complex name e.g. "Fairdeal Apartments"</summary>
    public string BuildingName { get; set; } = string.Empty;
    public string? Description { get; set; }
    /// <summary>Total number of units/listings in this property</summary>
    public int TotalUnits { get; set; }
    /// <summary>Number of floors in the building</summary>
    public int TotalFloors { get; set; }

    public PropertyLocation Location { get; set; } = null!;
    public Guid OwnerId { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
