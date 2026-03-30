using StayHere.Application.Common.Interfaces;

namespace StayHere.Infrastructure.Identity;

public class IdentityService : IIdentityService
{
    public Task<(bool Succeeded, string? UserId, string? Email, string? Name)> AuthenticateWithEntraAsync(string token)
    {
        // In reality, this would use Microsoft.Identity.Web or MSAL to validate the token
        // and extract claims like oid, sub, preferred_username (email), and name.
        if (token == "mock-social-token")
        {
            return Task.FromResult((true, (string?)"social-userid-001", (string?)"social.user@gmail.com", (string?)"Social User"));
        }
        return Task.FromResult((true, (string?)"mock-entra-id-worker", (string?)"dev@stayhere.com", (string?)"Dev Admin"));
    }

    public Task<string> GenerateJwtAsync(Guid userId, string email, List<string> roles)
    {
        // Mocking JWT generation with roles list
        return Task.FromResult("mock-jwt-token");
    }
}
