using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using StayHere.Application.Common.Interfaces;

namespace StayHere.Infrastructure.Identity;

public class IdentityService : IIdentityService
{
    private readonly string _entraClientId;
    private readonly string _entraTenantId;
    private readonly string _jwtSecret;
    private readonly ConfigurationManager<OpenIdConnectConfiguration> _configurationManager;

    public IdentityService(IConfiguration configuration)
    {
        _entraClientId = configuration["ENTRA_CLIENT_ID"] ?? "REPLACE_ME";
        _entraTenantId = configuration["ENTRA_TENANT_ID"] ?? "REPLACE_ME";
        
        // In production, this should come from KeyVault.
        _jwtSecret = configuration["JWT_SECRET"] ?? "stayhere-mvp-super-secret-key-that-is-long-enough-for-hs256";

        var authority = $"https://login.microsoftonline.com/{_entraTenantId}/v2.0";
        var wellKnownEndpoint = $"{authority}/.well-known/openid-configuration";

        _configurationManager = new ConfigurationManager<OpenIdConnectConfiguration>(
            wellKnownEndpoint,
            new OpenIdConnectConfigurationRetriever());
    }

    public async Task<(bool Succeeded, string? UserId, string? Email, string? Name)> AuthenticateWithEntraAsync(string token)
    {
        // Allow mock token for local developer testing if the specific dummy token is passed.
        if (token == "mock-social-token")
        {
            return (true, "social-userid-001", "social.user@gmail.com", "Social User");
        }

        try
        {
            var oidcConfig = await _configurationManager.GetConfigurationAsync();

            var validationParameters = new TokenValidationParameters
            {
                ValidateAudience = true,
                ValidAudience = _entraClientId,
                
                ValidateIssuer = true,
                ValidIssuers = new[] { $"https://login.microsoftonline.com/{_entraTenantId}/v2.0", $"https://sts.windows.net/{_entraTenantId}/" },

                ValidateIssuerSigningKey = true,
                IssuerSigningKeys = oidcConfig.SigningKeys,

                ValidateLifetime = true
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var principal = tokenHandler.ValidateToken(token, validationParameters, out var validatedToken);

            var objectId = principal.FindFirst("oid")?.Value ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var email = principal.FindFirst("preferred_username")?.Value ?? principal.FindFirst(ClaimTypes.Email)?.Value;
            var name = principal.FindFirst("name")?.Value ?? principal.FindFirst(ClaimTypes.Name)?.Value;

            if (string.IsNullOrEmpty(objectId)) return (false, null, null, null);

            return (true, objectId, email, name);
        }
        catch (Exception)
        {
            return (false, null, null, null);
        }
    }

    public Task<string> GenerateJwtAsync(Guid userId, string email, List<string> roles)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes(_jwtSecret);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, email)
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddDays(7),
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return Task.FromResult(tokenHandler.WriteToken(token));
    }
    
    public Task TriggerEntraPhoneOtpAsync(string phoneNumber)
    {
        // In a real implementation, this would use Microsoft Graph API to trigger an OTP
        // e.g. POST /users/{id}/authentication/phoneMethods/{id}/triggerSmsCode
        // Or using Entra External ID (CIAM) custom authentication extensions.
        
        Console.WriteLine($"[EntraID] Triggering OTP for {phoneNumber}");
        return Task.CompletedTask;
    }
}
