namespace StayHere.Application.Common.Interfaces;

public interface IPlacesService
{
    /// <summary>
    /// Finds points of interest near a coordinate. <paramref name="category"/> is one or more
    /// comma-separated categories: school, hospital, mall, transit, restaurant, police,
    /// local_government_office (police + local_government_office together are the closest real
    /// proxy for "security office" concepts like a chief's camp/administration post - StayHere has
    /// no verified crime-data source, so neither is ever a crime/safety rating).
    /// </summary>
    Task<IReadOnlyList<NearbyPlace>> GetNearbyAsync(
        double latitude,
        double longitude,
        string category,
        CancellationToken cancellationToken = default);
}

public static class PlaceCategories
{
    /// <summary>Canonical Places types that count as "security infrastructure" - used to decide
    /// whether the crime-data caveat note applies to a given nearby-places result set.</summary>
    public static readonly IReadOnlySet<string> SecurityProxyTypes =
        new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "police", "local_government_office" };
}

public sealed record NearbyPlace(
    string Name,
    string Category,
    double DistanceMeters,
    string? Address,
    double? Rating,
    double? Latitude = null,
    double? Longitude = null,
    /// <summary>Real walking-route distance/duration from the Directions API, for the nearest few
    /// results only (one Directions call per place, so it's capped to control cost/latency) - null
    /// means only the straight-line <see cref="DistanceMeters"/> estimate above is available.</summary>
    double? WalkingDistanceMeters = null,
    int? WalkingDurationMinutes = null);
