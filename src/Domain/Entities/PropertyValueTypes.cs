namespace StayHere.Domain.Entities;

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
