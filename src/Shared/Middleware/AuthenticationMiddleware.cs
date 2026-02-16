using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Functions.Worker.Middleware;
using Microsoft.Extensions.Logging;
using StayHere.Shared.Attributes;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;

namespace StayHere.Shared.Middleware;

public class AuthenticationMiddleware : IFunctionsWorkerMiddleware
{
    private readonly ILogger<AuthenticationMiddleware> _logger;

    public AuthenticationMiddleware(ILogger<AuthenticationMiddleware> logger)
    {
        _logger = logger;
    }

    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        // Try to get authorization details from context
        // In Isolated Worker, we can't easily get MethodInfo from the context in a generic way via context.GetTargetFunctionMethod() in older versions
        // We will check for the attribute specifically if possible or use a convention.
        
        var httpRequestData = await context.GetHttpRequestDataAsync();
        if (httpRequestData == null)
        {
            await next(context);
            return;
        }

        // For MVP, we will apply authentication to all functions EXCEPT those explicitly excluded or the "Login" ones.
        // A better way is to use the attribute, but this requires a bit of reflection which can be tricky in Isolated Worker.
        
        if (context.FunctionDefinition.Name.Equals("Login", StringComparison.OrdinalIgnoreCase) || 
            context.FunctionDefinition.Name.Equals("VerifyOtp", StringComparison.OrdinalIgnoreCase))
        {
            await next(context);
            return;
        }

        if (!httpRequestData.Headers.TryGetValues("Authorization", out var authHeaders) || !authHeaders.Any())
        {
            await SetUnauthorizedResponse(context, httpRequestData, "Missing Authorization header.");
            return;
        }

        var authHeader = authHeaders.First();
        if (!authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            await SetUnauthorizedResponse(context, httpRequestData, "Invalid Authorization scheme.");
            return;
        }

        var token = authHeader.Substring("Bearer ".Length).Trim();
        var principal = ValidateToken(token);

        if (principal == null)
        {
            await SetUnauthorizedResponse(context, httpRequestData, "Invalid or expired token.");
            return;
        }

        // Attach principal to context for use in functions
        context.Items["User"] = principal;

        await next(context);
    }

    private ClaimsPrincipal? ValidateToken(string token)
    {
        try
        {
            if (token == "mock-jwt-token")
            {
                var claims = new List<Claim>
                {
                    new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
                    new Claim(ClaimTypes.Email, "test@stayhere.com"),
                    new Claim(ClaimTypes.Role, "Admin")
                };
                return new ClaimsPrincipal(new ClaimsIdentity(claims, "Bearer"));
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Token validation failed");
            return null;
        }
    }

    private async Task SetUnauthorizedResponse(FunctionContext context, HttpRequestData req, string message)
    {
        var response = req.CreateResponse(HttpStatusCode.Unauthorized);
        await response.WriteStringAsync(message);
        // In isolated worker, we set the result on the context
        var invocationResult = context.GetInvocationResult();
        invocationResult.Value = response;
    }
}
