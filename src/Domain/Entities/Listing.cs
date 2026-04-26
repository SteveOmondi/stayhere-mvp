namespace StayHere.Domain.Entities;

/// <summary>
/// A specific listable unit within a Property e.g. "2 Bedroom Apartment" in Fairdeal Apartments, Unit 5A, Floor 2.
/// </summary>
public class Listing
{
    public Guid Id { get; set; }
    public string ListingCode { get; set; } = string.Empty;
    public Guid PropertyId { get; set; }
    public string UnitNumber { get; set; } = string.Empty;
    public int FloorNumber { get; set; }
    /// <summary>Specific title e.g. "2 Bedroom Apartment"</summary>
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    public decimal Price { get; set; }
    public string PriceCurrency { get; set; } = "KES";
    public PropertyType PropertyType { get; set; }
    public ListingType ListingType { get; set; }

    public int Bedrooms { get; set; }
    public int Bathrooms { get; set; }
    public bool IsFurnished { get; set; }

    public PropertyLocation Location { get; set; } = null!;

    public List<string> Amenities { get; set; } = new();
    public List<string> Images { get; set; } = new();

    public int? SizeSqft { get; set; }
    public int? YearBuilt { get; set; }
    public string? Developer { get; set; }

    public AvailabilityStatus AvailabilityStatus { get; set; } = AvailabilityStatus.Available;

    public PropertyContact Owner { get; set; } = null!;
    public PropertyContact? Agent { get; set; }

    public Guid OwnerId { get; set; }
    public Guid? AgentId { get; set; }
    public Guid? CaretakerId { get; set; }

    public DateTime ListedDate { get; set; }
    public int Views { get; set; }
    public decimal Rating { get; set; }
    public int RatingCount { get; set; }
    public bool IsFeatured { get; set; }
    public decimal RecommendedScore { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    /// <summary>Semantic embedding for pgvector similarity search (typically 1536 dimensions).</summary>
    public float[]? Embedding { get; set; }
}
