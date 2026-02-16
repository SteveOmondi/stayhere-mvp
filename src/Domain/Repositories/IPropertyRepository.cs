using StayHere.Domain.Entities;

namespace StayHere.Domain.Repositories;

public interface IPropertyRepository
{
    Task<Property?> GetByIdAsync(Guid id);
    Task<IEnumerable<Property>> GetByOwnerIdAsync(Guid ownerId);
    Task CreateAsync(Property property);
    Task UpdateAsync(Property property);
    Task DeleteAsync(Guid id);
}

public interface IPropertyAttributeRepository
{
    Task<PropertyAttribute?> GetByPropertyIdAsync(Guid propertyId);
    Task UpsertAsync(PropertyAttribute attributes);
}
