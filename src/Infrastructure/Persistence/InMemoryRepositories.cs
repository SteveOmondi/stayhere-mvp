using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Infrastructure.Persistence;

public class InMemoryUserRepository : IUserRepository
{
    private readonly List<User> _users = new();

    public Task<User?> GetByIdAsync(Guid id) => Task.FromResult(_users.FirstOrDefault(u => u.Id == id));
    public Task<User?> GetByEmailAsync(string email) => Task.FromResult(_users.FirstOrDefault(u => u.Email == email));
    public Task<User?> GetByPhoneNumberAsync(string phoneNumber) => Task.FromResult(_users.FirstOrDefault(u => u.PhoneNumber == phoneNumber));
    public Task<User?> GetByEntraObjectIdAsync(string entraObjectId) => Task.FromResult(_users.FirstOrDefault(u => u.EntraObjectId == entraObjectId));
    
    public Task CreateAsync(User user) 
    {
        _users.Add(user);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(User user)
    {
        var existing = _users.FirstOrDefault(u => u.Id == user.Id);
        if (existing != null)
        {
            _users.Remove(existing);
            _users.Add(user);
        }
        return Task.CompletedTask;
    }
}

public class InMemoryOtpRepository : IOtpRepository
{
    private readonly List<OtpVerification> _otps = new();

    public Task<OtpVerification?> GetLatestActiveOtpAsync(string target) => 
        Task.FromResult(_otps.OrderByDescending(o => o.Expiry).FirstOrDefault(o => o.Target == target && !o.IsUsed));

    public Task CreateAsync(OtpVerification otp)
    {
        _otps.Add(otp);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(OtpVerification otp)
    {
        var existing = _otps.FirstOrDefault(o => o.Id == otp.Id);
        if (existing != null)
        {
            _otps.Remove(existing);
            _otps.Add(otp);
        }
        return Task.CompletedTask;
    }
}
