namespace StayHere.Application.Common.Interfaces;

public interface IIdentityService
{
    Task<(bool Succeeded, string? UserId)> AuthenticateWithEntraAsync(string token);
    Task<string> GenerateJwtAsync(Guid userId, string email, string role);
}
