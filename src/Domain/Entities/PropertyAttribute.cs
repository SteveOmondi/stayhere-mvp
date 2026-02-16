namespace StayHere.Domain.Entities;

public class PropertyAttribute
{
    public string PropertyId { get; set; } = string.Empty;
    public Dictionary<string, object> Attributes { get; set; } = new();
    public List<string> Amenities { get; set; } = new();
    public List<PropertyImage> Images { get; set; } = new();
    public dynamic? Metadata { get; set; }
}

public record PropertyImage(
    string Url,
    string? Caption,
    bool IsPrimary,
    DateTime UploadedAt
);
