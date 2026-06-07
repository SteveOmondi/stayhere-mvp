using StayHere.Domain.Entities;

namespace StayHere.Domain.Repositories;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id);
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByPhoneNumberAsync(string phoneNumber);
    Task<User?> GetByEntraObjectIdAsync(string entraObjectId);
    Task<(List<User> Users, int Total)> GetAllAsync(int page, int pageSize);
    Task CreateAsync(User user);
    Task UpdateAsync(User user);
}
