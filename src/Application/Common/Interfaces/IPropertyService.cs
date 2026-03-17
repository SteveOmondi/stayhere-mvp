using StayHere.Application.Properties.Models;

namespace StayHere.Application.Common.Interfaces;

/// <summary>
/// Service for Property (building/complex) operations.
/// </summary>
public interface IPropertyService
{
    Task<PropertyDto> CreatePropertyAsync(Guid ownerId, CreatePropertyRequest request);
    Task<PropertyDto?> GetPropertyByIdAsync(Guid id);
    Task<PropertyDto?> GetPropertyByCodeAsync(string propertyCode);
    Task<PaginatedResult<PropertyListDto>> GetAllPropertiesAsync(int page = 1, int pageSize = 20);
    Task<PaginatedResult<PropertyListDto>> GetPropertiesByOwnerAsync(Guid ownerId, int page = 1, int pageSize = 20);
    Task<PropertyDto?> UpdatePropertyAsync(Guid id, Guid requesterId, UpdatePropertyRequest request);
    Task<bool> DeletePropertyAsync(Guid id, Guid requesterId);
}
