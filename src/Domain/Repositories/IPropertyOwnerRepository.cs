using StayHere.Domain.Entities;

namespace StayHere.Domain.Repositories;

public interface IPropertyOwnerRepository
{
    Task<PropertyOwner?> GetByIdAsync(Guid id);
    Task<PropertyOwner?> GetByUserIdAsync(Guid userId);
    Task<PropertyOwner?> GetByEmailAsync(string email);
    Task<PropertyOwner?> GetByPhoneAsync(string phone);
    Task<IEnumerable<PropertyOwner>> GetAllAsync(int page = 1, int pageSize = 20);
    /// <summary>Lightweight list for management UIs (no pagination).</summary>
    Task<IReadOnlyList<PropertyOwner>> GetDirectoryAsync(int maxItems, CancellationToken cancellationToken = default);
    Task<int> GetCountAsync();
    Task CreateAsync(PropertyOwner owner);
    Task UpdateAsync(PropertyOwner owner);
}
