using StayHere.Domain.Entities;

namespace StayHere.Application.Common.Interfaces;

public interface IIdentityService
{
    Task<(bool Succeeded, string? UserId, string? Email, string? Name)> AuthenticateWithEntraAsync(string token);
    Task<string> GenerateJwtAsync(User user);
    Task TriggerEntraPhoneOtpAsync(string phoneNumber);
}
