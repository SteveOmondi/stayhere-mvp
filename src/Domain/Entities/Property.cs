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

    /// <summary>Year the building was constructed.</summary>
    public int? YearBuilt { get; set; }

    public string? PrimaryImageUrl { get; set; }
    /// <summary>Legacy flat image list (kept for backward compat). New code uses StructuredImages.</summary>
    public List<string> Images { get; set; } = new();
    /// <summary>Sectioned images: Exterior, CommonAreas, Other.</summary>
    public PropertyImages StructuredImages { get; set; } = PropertyImages.Empty();

    /// <summary>
    /// Shared building amenities inherited by every listing created under this property.
    /// Values are predefined slugs: parking | coveredParking | elevator | gym | swimmingPool |
    /// rooftop | lounge | playArea | generatorBackup | borehole | cctv | guardedEntry |
    /// intercom | freeWifi | laundry | storage | disabledAccess
    /// </summary>
    public List<string> SharedAmenities { get; set; } = [];

    /// <summary>House rules that apply to all listings in this property.</summary>
    public List<HouseRule> Rules { get; set; } = [];

    public PropertyLocation Location { get; set; } = null!;
    public Guid OwnerId { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}
