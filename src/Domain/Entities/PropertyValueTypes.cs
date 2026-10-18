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

// ── Floor plan geometry ──────────────────────────────────────────────────────

/// <summary>A single room's outline, as a polygon in meters (x, z on the floor plane).</summary>
public record FloorPlanRoom(string Id, string Label, List<double[]> Points);

/// <summary>
/// A door or window opening in a wall, identified by the wall's two endpoints (meters) —
/// NOT by room id + edge index, so it matches shared wall segments between adjoining rooms
/// regardless of which room's polygon "owns" that edge, and survives room-shape corrections.
/// </summary>
public record FloorPlanOpening(
    string Id,
    double[] From,
    double[] To,
    double Position,      // 0-1 fraction from From to To
    double WidthMeters,
    string Type           // "door" | "window"
);

/// <summary>A named waypoint in the 3D scene, used for room-to-room navigation ("fly to Bedroom").</summary>
public record FloorPlanHotspot(string Id, string RoomId, string Label, int Order);

/// <summary>A single placed furniture piece in the 3D scene, referencing the shared furniture catalog by id.</summary>
public record FloorPlanLayoutItem(string CatalogId, string RoomId, double[] Position, double RotationY);

/// <summary>
/// A digitized floor plan attached to a <see cref="Listing"/>. Optional — a listing with no
/// floor plan simply has this null. Rooms/openings are stored in real-world meters, already
/// converted from the AI's fraction-of-image coordinates using <see cref="MetersPerPixel"/> at
/// digitization time, so no client needs the source image dimensions to render this geometry.
/// <para>
/// Hotspots/AllowedCatalogIds/DefaultLayout drive the 3D and 3D-Live renders and are optional —
/// listings digitized before 3D support existed simply have these null/empty, and the 3D scene
/// auto-seeds starter furniture from <see cref="Rooms"/> the first time it's opened.
/// </para>
/// </summary>
public record ListingFloorPlan(
    List<FloorPlanRoom> Rooms,
    List<FloorPlanOpening> Openings,
    double MetersPerPixel,
    string SourceFileKey,
    string SourceFileType,
    DateTime DigitizedAt,
    string DigitizedByRole,   // "owner" | "admin"
    string? AiProvider = null,
    List<FloorPlanHotspot>? Hotspots = null,
    List<string>? AllowedCatalogIds = null,
    List<FloorPlanLayoutItem>? DefaultLayout = null
);

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

/// <summary>
/// The financial/contractual structure of a listing. Only meaningful when
/// <see cref="ListingType"/> is <see cref="ListingType.Sale"/> (CompleteTurnkey/OffPlanUnderConstruction)
/// or <see cref="ListingType.Rent"/> (LongTermLease/ShortTermServicedVacation) - null for
/// ShortStay/Lease listings.
/// </summary>
public enum Tenure
{
    CompleteTurnkey,
    OffPlanUnderConstruction,
    LongTermLease,
    ShortTermServicedVacation
}
