using StayHere.Domain.Entities;

namespace StayHere.Domain.Repositories;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id);
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByPhoneNumberAsync(string phoneNumber);
    Task<User?> GetByEntraObjectIdAsync(string entraObjectId);
    Task CreateAsync(User user);
    Task UpdateAsync(User user);
}
