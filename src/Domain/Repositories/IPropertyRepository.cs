using StayHere.Domain.Entities;

namespace StayHere.Domain.Repositories;

/// <summary>
/// Repository for Property (building/complex) - not for individual listings.
/// </summary>
public interface IPropertyRepository
{
    Task<Property?> GetByIdAsync(Guid id);
    Task<Property?> GetByPropertyCodeAsync(string propertyCode);
    Task<IEnumerable<Property>> GetAllAsync(int page = 1, int pageSize = 20);
    Task<IEnumerable<Property>> GetByOwnerIdAsync(Guid ownerId);
    Task<int> GetTotalCountAsync();
    Task CreateAsync(Property property);
    Task UpdateAsync(Property property);
    Task DeleteAsync(Guid id);
    Task<string> GeneratePropertyCodeAsync();
}
