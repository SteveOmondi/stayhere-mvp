namespace StayHere.Domain.Entities;

/// <summary>
/// Child of a Category, optionally scoped to a country/city.
/// e.g. "Apartment" under "Residential", available in Nairobi, Kenya.
/// </summary>
public class Subcategory
{
    public Guid Id { get; set; }
    public Guid? CategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Slug { get; set; }
    public string? Description { get; set; }
    public string? IconUrl { get; set; }
    public string Country { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
