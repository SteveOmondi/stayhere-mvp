using StayHere.Domain.Entities;

namespace StayHere.Application.Properties.Services;

/// <summary>Canonical text used to embed a listing for similarity search.</summary>
public static class ListingEmbeddingTextBuilder
{
    public static string Build(Listing listing, string? buildingName)
    {
        var loc = listing.Location;
        var suburb = string.IsNullOrWhiteSpace(loc.Suburb) ? "" : loc.Suburb + ", ";
        var amenities = listing.Amenities.Count > 0 ? string.Join(", ", listing.Amenities) : "none listed";

        return $"""
            StayHere listing. Building: {buildingName ?? "unknown building"}.
            Title: {listing.Title}.
            Description: {listing.Description ?? ""}.
            Property type: {listing.PropertyType}. Listing type: {listing.ListingType}.
            Location: {loc.Country}, {loc.County}, {loc.City}, {suburb}{loc.Street ?? ""}.
            Unit {listing.UnitNumber}, floor {listing.FloorNumber}.
            Price: {listing.Price} {listing.PriceCurrency}.
            Bedrooms: {listing.Bedrooms}, bathrooms: {listing.Bathrooms}, furnished: {listing.IsFurnished}.
            Amenities: {amenities}.
            Size sqft: {listing.SizeSqft?.ToString() ?? "n/a"}, year built: {listing.YearBuilt?.ToString() ?? "n/a"}.
            Developer: {listing.Developer ?? "n/a"}.
            """;
    }
}
