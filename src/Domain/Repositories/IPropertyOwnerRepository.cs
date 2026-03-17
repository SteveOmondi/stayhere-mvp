using StayHere.Domain.Entities;

namespace StayHere.Domain.Repositories;

public interface IPropertyOwnerRepository
{
    Task<PropertyOwner?> GetByIdAsync(Guid id);
    Task<PropertyOwner?> GetByUserIdAsync(Guid userId);
    Task<PropertyOwner?> GetByEmailAsync(string email);
    Task<PropertyOwner?> GetByPhoneAsync(string phone);
    Task<IEnumerable<PropertyOwner>> GetAllAsync(int page = 1, int pageSize = 20);
    Task CreateAsync(PropertyOwner owner);
    Task UpdateAsync(PropertyOwner owner);
}
