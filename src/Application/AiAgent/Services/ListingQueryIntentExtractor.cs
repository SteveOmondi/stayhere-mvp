using System.Globalization;
using System.Linq;
using System.Text.RegularExpressions;
using StayHere.Application.AiAgent.Models;

namespace StayHere.Application.AiAgent.Services;

/// <summary>Heuristic extraction of search factors from natural language (no extra LLM call).</summary>
public static class ListingQueryIntentExtractor
{
    private static readonly string[] KnownAreas =
    [
        "westlands", "kilimani", "karen", "lavington", "runda", "muthaiga", "parklands", "south b", "south c",
        "eastleigh", "ngong", "thika", "mombasa", "kisumu", "nakuru", "eldoret", "nairobi"
    ];

    public static AgentExtractedIntent Extract(string query)
    {
        var q = query.Trim();
        var lower = q.ToLowerInvariant();

        int? minBedrooms = null;
        int? maxBedrooms = null;

        // "2 or 3 bedroom", "2-3 br", "2 to 3 bedrooms" → allow both counts
        var bedRange = Regex.Match(lower, @"(\d+)\s*(?:or|-|to)\s*(\d+)\s*(?:bedroom|bedrooms|bed|beds|br)\b");
        if (bedRange.Success
            && int.TryParse(bedRange.Groups[1].Value, out var brLo)
            && int.TryParse(bedRange.Groups[2].Value, out var brHi))
        {
            minBedrooms = Math.Min(brLo, brHi);
            maxBedrooms = Math.Max(brLo, brHi);
        }
        else
        {
            var bedMatch = Regex.Match(lower, @"(\d+)\s*(?:bedroom|bedrooms|bed|beds|br)\b");
            if (bedMatch.Success && int.TryParse(bedMatch.Groups[1].Value, out var beds))
                minBedrooms = beds;
        }

        decimal? maxPrice = null;
        decimal? minPrice = null;

        var underMatch = Regex.Match(lower, @"(?:under|below|less than|max|maximum|up to)\s*(?:kes|ksh)?\s*([\d,]+(?:\.\d+)?)\s*(?:k|thousand)?", RegexOptions.IgnoreCase);
        if (underMatch.Success && TryParseMoney(underMatch.Groups[1].Value, underMatch.Value.Contains('k', StringComparison.OrdinalIgnoreCase), out var u))
            maxPrice = u;

        var kMatch = Regex.Match(lower, @"(\d+)\s*k\b");
        if (kMatch.Success && int.TryParse(kMatch.Groups[1].Value, out var kThousands))
            maxPrice = Math.Max(maxPrice ?? 0, kThousands * 1000);

        var overMatch = Regex.Match(lower, @"(?:above|over|more than|min|minimum|from)\s*(?:kes|ksh)?\s*([\d,]+(?:\.\d+)?)\s*(?:k|thousand)?", RegexOptions.IgnoreCase);
        if (overMatch.Success && TryParseMoney(overMatch.Groups[1].Value, overMatch.Value.Contains('k', StringComparison.OrdinalIgnoreCase), out var o))
            minPrice = o;

        var locations = KnownAreas.Where(a => lower.Contains(a, StringComparison.OrdinalIgnoreCase)).Distinct().ToList();

        var typeHints = new List<string>();
        foreach (var t in new[] { "apartment", "studio", "bedsitter", "bedsit", "house", "maisonette", "penthouse", "villa", "townhouse", "commercial", "office" })
        {
            if (lower.Contains(t, StringComparison.OrdinalIgnoreCase))
                typeHints.Add(t);
        }

        var amenityCanonical = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var (phrase, canonical) in AmenityPhraseToCanonical)
        {
            if (lower.Contains(phrase, StringComparison.OrdinalIgnoreCase))
                amenityCanonical.Add(canonical);
        }

        return new AgentExtractedIntent(
            Locations: locations.Count > 0 ? string.Join(", ", locations) : null,
            MinBedrooms: minBedrooms,
            MaxBedrooms: maxBedrooms,
            MaxPrice: maxPrice,
            MinPrice: minPrice,
            PropertyTypeKeywords: typeHints.Count > 0 ? string.Join(", ", typeHints) : null,
            AmenityKeywords: amenityCanonical.Count > 0 ? string.Join(", ", amenityCanonical.OrderBy(a => a, StringComparer.OrdinalIgnoreCase)) : null,
            NormalizedQuery: q);
    }

    public static string ComposeForEmbedding(string originalQuery, AgentExtractedIntent intent)
    {
        var parts = new List<string> { $"User property search: {intent.NormalizedQuery}" };
        if (!string.IsNullOrEmpty(intent.Locations))
            parts.Add($"Locations of interest: {intent.Locations}.");
        if (intent.MinBedrooms.HasValue && intent.MaxBedrooms.HasValue)
            parts.Add($"Bedrooms between {intent.MinBedrooms.Value} and {intent.MaxBedrooms.Value}.");
        else if (intent.MinBedrooms.HasValue)
            parts.Add($"Bedrooms at least: {intent.MinBedrooms.Value}.");
        if (intent.MaxPrice.HasValue)
            parts.Add($"Budget up to approximately {intent.MaxPrice.Value} KES.");
        if (intent.MinPrice.HasValue)
            parts.Add($"Budget from approximately {intent.MinPrice.Value} KES.");
        if (!string.IsNullOrEmpty(intent.PropertyTypeKeywords))
            parts.Add($"Property styles: {intent.PropertyTypeKeywords}.");
        if (!string.IsNullOrEmpty(intent.AmenityKeywords))
            parts.Add($"Preferred amenities or features: {intent.AmenityKeywords}.");
        return string.Join(" ", parts);
    }

    /// <summary>Longer phrases first; each maps to a canonical token for matching listing text.</summary>
    private static readonly (string Phrase, string Canonical)[] AmenityPhraseToCanonical =
    [
        ("swimming pool", "pool"),
        ("water backup", "water backup"),
        ("backup water", "water backup"),
        ("air conditioning", "air conditioning"),
        ("servants quarter", "servants quarter"),
        ("pet friendly", "pet friendly"),
        ("wi-fi", "wifi"),
        ("cctv", "cctv"),
        ("balcony", "balcony"),
        ("parking", "parking"),
        ("garage", "parking"),
        ("gym", "gym"),
        ("elevator", "elevator"),
        ("lift", "elevator"),
        ("security", "security"),
        ("garden", "garden"),
        ("generator", "generator"),
        ("wifi", "wifi"),
        ("pool", "pool"),
        ("furnished", "furnished"),
        ("pets", "pet friendly")
    ];

    private static bool TryParseMoney(string raw, bool thousandsSuffix, out decimal value)
    {
        value = 0;
        var cleaned = raw.Replace(",", "", StringComparison.Ordinal);
        if (!decimal.TryParse(cleaned, NumberStyles.Number, CultureInfo.InvariantCulture, out var v))
            return false;
        if (thousandsSuffix && v < 1_000_000 && raw.Length <= 4)
            v *= 1000;
        value = v;
        return true;
    }
}
