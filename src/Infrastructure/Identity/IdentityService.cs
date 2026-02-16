using StayHere.Application.Common.Interfaces;

namespace StayHere.Infrastructure.Identity;

public class IdentityService : IIdentityService
{
    public Task<(bool Succeeded, string? UserId)> AuthenticateWithEntraAsync(string token)
    {
        // Mocking Entra ID validation
        // In reality, this would use Microsoft.Identity.Web or MSAL to validate the token
        return Task.FromResult((true, "mock-entra-id-worker"));
    }

    public Task<string> GenerateJwtAsync(Guid userId, string email, string role)
    {
        // Mocking JWT generation
        return Task.FromResult("mock-jwt-token");
    }
}
