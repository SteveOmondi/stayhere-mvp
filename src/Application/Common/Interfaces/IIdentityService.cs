namespace StayHere.Application.Common.Interfaces;

public interface IIdentityService
{
    Task<(bool Succeeded, string? UserId, string? Email, string? Name)> AuthenticateWithEntraAsync(string token);
    Task<string> GenerateJwtAsync(Guid userId, string email, List<string> roles);
}
