namespace StayHere.Application.Properties.Models;

public record CreatePropertyRequest(
    string Title,
    string Description,
    AddressDto Address,
    PropertyTypeDto Type,
    decimal MonthlyRent,
    Dictionary<string, object>? Attributes,
    List<string>? Amenities
);

public record PropertyDto(
    Guid Id,
    Guid OwnerId,
    string Title,
    string Description,
    AddressDto Address,
    string Status,
    string Type,
    decimal MonthlyRent,
    string Currency,
    Dictionary<string, object> Attributes,
    List<string> Amenities,
    List<string> ImageUrls
);

public record AddressDto(
    string Street,
    string City,
    string State,
    string PostalCode,
    string Country
);

public enum PropertyTypeDto
{
    Apartment,
    House,
    Studio,
    Commercial,
    Land
}
