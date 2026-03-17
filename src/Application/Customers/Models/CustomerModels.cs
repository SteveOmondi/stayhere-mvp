using StayHere.Domain.Entities;

namespace StayHere.Application.Customers.Models;

public record CreateCustomerRequest(
    string Email,
    string? Phone,
    string? FirstName,
    string? LastName,
    string? DisplayName,
    Guid? CountryId,
    Guid? CityId,
    string? PreferredLanguage,
    string? PreferredCurrency);

public record UpdateCustomerRequest(
    string? FirstName,
    string? LastName,
    string? DisplayName,
    Guid? CountryId,
    Guid? CityId,
    string? AddressLine,
    DateTime? DateOfBirth,
    string? IdType,
    string? IdNumber,
    string? PreferredLanguage,
    string? PreferredCurrency,
    string? ProfilePhotoUrl,
    string? NotificationPreferencesJson);

public record CustomerDto(
    Guid Id,
    string Email,
    string? Phone,
    string? FirstName,
    string? LastName,
    string? DisplayName,
    Guid? CountryId,
    Guid? CityId,
    string? AddressLine,
    DateTime? DateOfBirth,
    string? IdType,
    string? KycStatus,
    string? PreferredLanguage,
    string? PreferredCurrency,
    string? ProfilePhotoUrl,
    string? NotificationPreferencesJson,
    string AccountStatus,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    DateTime? LastLoginAt);

public record CustomerPropertyDto(
    Guid Id,
    Guid ListingId,
    string RelationshipType,
    DateTime? StartDate,
    DateTime? EndDate,
    decimal? AgreedPrice,
    string? Currency,
    string? UnitNumber,
    string? FloorNumber,
    string? Notes);

public record AttachCustomerPropertyRequest(
    Guid ListingId,
    string RelationshipType,
    DateTime? StartDate,
    DateTime? EndDate,
    decimal? AgreedPrice,
    string? Currency,
    string? UnitNumber,
    string? FloorNumber,
    string? Notes);

public record CreateDocumentRequest(
    string EntityType,
    Guid EntityId,
    string DocumentType,
    string FileUrl);

public record DocumentDto(
    Guid Id,
    string EntityType,
    Guid EntityId,
    string DocumentType,
    string FileUrl,
    DateTime UploadedAt);

