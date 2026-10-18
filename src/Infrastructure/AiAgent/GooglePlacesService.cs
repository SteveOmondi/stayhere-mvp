using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StayHere.Application.Common.Interfaces;

namespace StayHere.Infrastructure.AiAgent;

/// <summary>
/// Nearby-places lookup via Google's Places API (New) "searchNearby" endpoint. Used by Sage's
/// get_nearby_places tool to ground answers about schools, hospitals, malls, transit, restaurants,
/// and (as a security proxy - StayHere has no crime-data source) police stations/local government
/// offices near a listing. Supports querying several categories in one call.
///
/// Results are cached (see <see cref="AgentToolExecutor"/> caller) since a listing's surroundings
/// essentially never change and Places API billing is per-request.
/// </summary>
public class GooglePlacesService : IPlacesService
{
    private static readonly Dictionary<string, string> CategoryToPlaceType = new(StringComparer.OrdinalIgnoreCase)
    {
        ["school"] = "school",
        ["hospital"] = "hospital",
        ["mall"] = "shopping_mall",
        ["shopping"] = "shopping_mall",
        ["transit"] = "transit_station",
        ["restaurant"] = "restaurant",
        ["police"] = "police",
        ["security"] = "police",
        // Kenya-specific "security office" concepts (chief's camp, administration post) have no
        // dedicated Places type - local_government_office is the closest real proxy.
        ["local_government_office"] = "local_government_office",
        ["chief"] = "local_government_office",
        ["chiefs camp"] = "local_government_office",
        ["chief's camp"] = "local_government_office",
        ["administration"] = "local_government_office",
        ["administration office"] = "local_government_office",
        ["government office"] = "local_government_office",
        ["government"] = "local_government_office",
        ["local government"] = "local_government_office",
    };

    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GooglePlacesService> _logger;

    public GooglePlacesService(HttpClient httpClient, IConfiguration configuration, ILogger<GooglePlacesService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// <paramref name="category"/> may be a single category or a comma-separated list (e.g.
    /// "police,local_government_office" for a security-style query) - all requested types are
    /// searched in one Places API call, and each result is tagged with whichever category it
    /// actually matched (via the returned place "types"), not just the first one requested.
    /// </summary>
    public async Task<IReadOnlyList<NearbyPlace>> GetNearbyAsync(
        double latitude,
        double longitude,
        string category,
        CancellationToken cancellationToken = default)
    {
        var apiKey = _configuration["Google:MapsApiKey"]?.Trim()
                     ?? _configuration["Google:ApiKey"]?.Trim()
                     ?? Environment.GetEnvironmentVariable("GOOGLE_MAPS_API_KEY")?.Trim();
        if (string.IsNullOrEmpty(apiKey))
        {
            _logger.LogWarning("Google Places lookup skipped: no Google:MapsApiKey/Google:ApiKey configured");
            return [];
        }

        var requestedCategories = category.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
        var placeTypes = requestedCategories
            .Select(requested => CategoryToPlaceType.GetValueOrDefault(requested))
            .Where(t => t != null)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Select(t => t!)
            .ToList();

        if (placeTypes.Count == 0)
        {
            _logger.LogWarning("Unknown nearby-places category/categories {Category}", category);
            return [];
        }

        var radiusMeters = double.TryParse(_configuration["Google:PlacesSearchRadiusMeters"], out var r) ? r : 3000.0;
        var maxResults = int.TryParse(_configuration["Google:PlacesMaxResults"], out var mr) ? Math.Clamp(mr, 1, 20) : 8;

        var body = new JsonObject
        {
            ["includedTypes"] = new JsonArray(placeTypes.Select(t => (JsonNode)t).ToArray()),
            ["maxResultCount"] = maxResults,
            ["locationRestriction"] = new JsonObject
            {
                ["circle"] = new JsonObject
                {
                    ["center"] = new JsonObject { ["latitude"] = latitude, ["longitude"] = longitude },
                    ["radius"] = radiusMeters
                }
            }
        };

        const string url = "https://places.googleapis.com/v1/places:searchNearby";
        using var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = JsonContent.Create(body) };
        request.Headers.TryAddWithoutValidation("X-Goog-Api-Key", apiKey);
        request.Headers.TryAddWithoutValidation("X-Goog-FieldMask",
            "places.displayName,places.location,places.formattedAddress,places.rating,places.types");

        var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);

            // Unauthorized/Forbidden/BadRequest here almost always means the Places API (New) isn't
            // enabled/billed for this key, or Google:MapsApiKey isn't set - a config issue, not a
            // transient failure. Fail soft (empty results) rather than throwing, so the caller can
            // tell the model plainly that the lookup is unavailable instead of surfacing a raw 401.
            if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden or HttpStatusCode.BadRequest)
            {
                _logger.LogWarning(
                    "Google Places searchNearby returned {Status} - Places API (New) likely not enabled/authorized for the configured key. Body: {Body}",
                    (int)response.StatusCode, errorBody);
                return [];
            }

            _logger.LogError("Google Places searchNearby returned {Status}: {Body}", (int)response.StatusCode, errorBody);
            response.EnsureSuccessStatusCode();
        }

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        var root = JsonNode.Parse(json)?.AsObject();
        var places = root?["places"]?.AsArray();
        if (places == null)
            return [];

        var results = new List<NearbyPlace>();
        foreach (var node in places)
        {
            if (node is not JsonObject place) continue;

            var name = place["displayName"]?["text"]?.GetValue<string>();
            var lat = place["location"]?["latitude"]?.GetValue<double>();
            var lng = place["location"]?["longitude"]?.GetValue<double>();
            if (string.IsNullOrWhiteSpace(name) || lat is null || lng is null) continue;

            var distance = HaversineMeters(latitude, longitude, lat.Value, lng.Value);
            var address = place["formattedAddress"]?.GetValue<string>();
            var rating = place["rating"] is JsonValue rv && rv.TryGetValue<double>(out var ratingValue) ? ratingValue : (double?)null;

            // Tag with whichever requested Places type this result actually matched (a place can
            // carry several types; the canonical type itself is the label - e.g. "police" or
            // "local_government_office" - rather than whatever synonym the model happened to type)
            // so a multi-category request doesn't mislabel every result with the first type asked.
            var resultTypes = place["types"]?.AsArray().Select(t => t?.GetValue<string>()).Where(t => t != null) ?? [];
            var matchedCategory = resultTypes.FirstOrDefault(t => placeTypes.Contains(t, StringComparer.OrdinalIgnoreCase))
                                   ?? placeTypes[0];

            results.Add(new NearbyPlace(name, matchedCategory!, Math.Round(distance), address, rating, lat, lng));
        }

        var sorted = results.OrderBy(p => p.DistanceMeters).ToList();
        return await AugmentNearestWithWalkingRoutesAsync(sorted, latitude, longitude, apiKey, cancellationToken);
    }

    /// <summary>
    /// Straight-line distance (above) ignores roads/paths entirely - a place 400m away as the crow
    /// flies can be a 15-minute walk around a compound wall. The Directions API gives a real
    /// walking route, but unlike Places search it's one HTTP call PER destination (no batch
    /// endpoint), so this only augments the nearest few results, not the whole list, to keep cost
    /// and latency bounded. A Directions failure for one place (API not enabled/billed, transient
    /// error) just leaves that place with its straight-line distance rather than failing the whole
    /// nearby-places lookup.
    /// </summary>
    private async Task<IReadOnlyList<NearbyPlace>> AugmentNearestWithWalkingRoutesAsync(
        List<NearbyPlace> sorted, double originLat, double originLng, string apiKey, CancellationToken cancellationToken)
    {
        const int maxAugmented = 5;
        for (var i = 0; i < Math.Min(maxAugmented, sorted.Count); i++)
        {
            var place = sorted[i];
            if (place.Latitude is null || place.Longitude is null) continue;

            var route = await TryGetWalkingRouteAsync(originLat, originLng, place.Latitude.Value, place.Longitude.Value, apiKey, cancellationToken);
            if (route is { } r)
                sorted[i] = place with { WalkingDistanceMeters = r.DistanceMeters, WalkingDurationMinutes = r.DurationMinutes };
        }

        return sorted;
    }

    private async Task<(double DistanceMeters, int DurationMinutes)?> TryGetWalkingRouteAsync(
        double fromLat, double fromLng, double toLat, double toLng, string apiKey, CancellationToken cancellationToken)
    {
        try
        {
            var url = "https://maps.googleapis.com/maps/api/directions/json" +
                      $"?origin={fromLat},{fromLng}&destination={toLat},{toLng}&mode=walking&key={Uri.EscapeDataString(apiKey)}";
            var response = await _httpClient.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Google Directions returned {Status} - walking-route augmentation skipped for this place", (int)response.StatusCode);
                return null;
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var root = JsonNode.Parse(json)?.AsObject();
            var status = root?["status"]?.GetValue<string>();
            if (!string.Equals(status, "OK", StringComparison.OrdinalIgnoreCase))
            {
                // ZERO_RESULTS (no walkable route), REQUEST_DENIED (Directions API not enabled/billed
                // for this key), OVER_QUERY_LIMIT, etc. - all just mean "no augmentation this time".
                if (!string.Equals(status, "ZERO_RESULTS", StringComparison.OrdinalIgnoreCase))
                    _logger.LogWarning("Google Directions status {Status} - walking-route augmentation skipped for this place", status);
                return null;
            }

            var leg = root?["routes"]?.AsArray().FirstOrDefault()?["legs"]?.AsArray().FirstOrDefault();
            var distanceMeters = leg?["distance"]?["value"]?.GetValue<double>();
            var durationSeconds = leg?["duration"]?["value"]?.GetValue<double>();
            if (distanceMeters is null || durationSeconds is null) return null;

            return (distanceMeters.Value, (int)Math.Ceiling(durationSeconds.Value / 60));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Google Directions call failed - walking-route augmentation skipped for this place");
            return null;
        }
    }

    private static double HaversineMeters(double lat1, double lon1, double lat2, double lon2)
    {
        const double earthRadiusMeters = 6371000;
        var dLat = DegreesToRadians(lat2 - lat1);
        var dLon = DegreesToRadians(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(DegreesToRadians(lat1)) * Math.Cos(DegreesToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return earthRadiusMeters * c;
    }

    private static double DegreesToRadians(double degrees) => degrees * Math.PI / 180.0;
}
