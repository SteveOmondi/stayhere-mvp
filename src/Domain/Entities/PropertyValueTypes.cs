namespace StayHere.Domain.Entities;

// ── Structured image sections ────────────────────────────────────────────────

/// <summary>Sectioned images for a listing unit (industry-standard real estate sections).</summary>
public record ListingImages(
    List<string> Exterior,   // building entrance / façade
    List<string> LivingRoom, // lounge / sitting room
    List<string> Kitchen,
    List<string> DiningArea,
    List<string> Bedroom,
    List<string> Bathroom,
    List<string> Balcony,    // terrace / garden
    List<string> Other
)
{
    public static ListingImages Empty() => new([], [], [], [], [], [], [], []);
}

/// <summary>Sectioned images for a property (building-level).</summary>
public record PropertyImages(
    List<string> Exterior,    // façade, gate, compound, parking
    List<string> CommonAreas, // gym, pool, lobby, rooftop, corridors
    List<string> Other
)
{
    public static PropertyImages Empty() => new([], [], []);
}

// ── House rules ──────────────────────────────────────────────────────────────

/// <summary>
/// A single house rule attached to a property and inherited by all its listings.
/// <para>Known Type slugs: NoSmoking | NoPets | NoParties | NoLoudMusic | NoChildren |
/// NoAlcohol | QuietHours | VisitorPolicy | CleaningPolicy | ParkingPolicy | Custom</para>
/// </summary>
public record HouseRule(string Type, string? Description = null);

// ────────────────────────────────────────────────────────────────────────────

public record PropertyLocation(
    string Country,
    string County,
    string City,
    string? Suburb,
    string? Street,
    double? Latitude,
    double? Longitude
);

public record PropertyContact(
    string Name,
    string Phone,
    string? Email
);

public enum PropertyType
{
    Apartment,
    House,
    Studio,
    Bedsitter,
    Office,
    Workspace,
    Stall,
    Shop,
    Warehouse,
    Land,
    Commercial,
    Villa,
    Townhouse,
    Penthouse
}

public enum ListingType
{
    Rent,
    Sale,
    ShortStay,
    Lease
}

public enum AvailabilityStatus
{
    Available,
    Occupied,
    UnderOffer,
    Sold,
    Rented,
    OffMarket,
    ComingSoon
}
