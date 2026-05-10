using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Functions.Worker.Middleware;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StayHere.Shared.Attributes;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace StayHere.Shared.Middleware;

public class AuthenticationMiddleware : IFunctionsWorkerMiddleware
{
    private readonly ILogger<AuthenticationMiddleware> _logger;
    private readonly IConfiguration _configuration;

    public AuthenticationMiddleware(ILogger<AuthenticationMiddleware> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
    }

    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        var httpRequestData = await context.GetHttpRequestDataAsync();
        if (httpRequestData == null)
        {
            await next(context);
            return;
        }

        if (string.Equals(_configuration["SKIP_AUTH"], "true", StringComparison.OrdinalIgnoreCase))
        {
            context.Items["User"] = BuildDevPrincipal(httpRequestData);
            await next(context);
            return;
        }

        var (allowAnonymous, requiredRoles) = ResolveAuthorizationRequirements(context);
        if (allowAnonymous)
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

        var token = authHeader["Bearer ".Length..].Trim();
        var principal = ValidateToken(token);

        if (principal == null)
        {
            await SetUnauthorizedResponse(context, httpRequestData, "Invalid or expired token.");
            return;
        }

        context.Items["User"] = principal;

        if (requiredRoles.Length > 0 && !requiredRoles.Any(principal.IsInRole))
        {
            await SetForbiddenResponse(context, httpRequestData, "Forbidden");
            return;
        }

        await next(context);
    }

    private ClaimsPrincipal? ValidateToken(string token)
    {
        try
        {
            var secretRaw = _configuration["JWT_SECRET"];
            if (string.IsNullOrWhiteSpace(secretRaw))
                return null;

            byte[] key;
            try { key = Convert.FromBase64String(secretRaw); }
            catch { key = Encoding.ASCII.GetBytes(secretRaw); }

            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = "stayhere-auth-service",
                ValidateAudience = true,
                ValidAudience = "stayhere-mvp",
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(2),
                NameClaimType = ClaimTypes.NameIdentifier,
                RoleClaimType = ClaimTypes.Role
            };

            var handler = new JwtSecurityTokenHandler();
            return handler.ValidateToken(token, validationParameters, out _);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Token validation failed");
            return null;
        }
    }

    private static ClaimsPrincipal BuildDevPrincipal(HttpRequestData req)
    {
        var id = Guid.NewGuid();
        if (req.Headers.TryGetValues("X-User-Id", out var vals))
        {
            var s = vals.FirstOrDefault();
            if (Guid.TryParse(s, out var parsed))
                id = parsed;
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, id.ToString()),
            new(ClaimTypes.Email, "dev@stayhere.local"),
            new(ClaimTypes.Role, "Admin")
        };
        return new ClaimsPrincipal(new ClaimsIdentity(claims, "Dev"));
    }

    private static (bool AllowAnonymous, string[] RequiredRoles) ResolveAuthorizationRequirements(FunctionContext context)
    {
        try
        {
            var entryPoint = context.FunctionDefinition.EntryPoint;
            if (string.IsNullOrWhiteSpace(entryPoint))
                return (false, Array.Empty<string>());

            var lastDot = entryPoint.LastIndexOf('.');
            if (lastDot <= 0 || lastDot >= entryPoint.Length - 1)
                return (false, Array.Empty<string>());

            var typeName = entryPoint[..lastDot];
            var methodName = entryPoint[(lastDot + 1)..];

            var type = Type.GetType(typeName);
            if (type == null)
            {
                type = AppDomain.CurrentDomain
                    .GetAssemblies()
                    .Select(a => a.GetType(typeName, throwOnError: false, ignoreCase: false))
                    .FirstOrDefault(t => t != null);
            }
            var method = type?.GetMethod(methodName);
            if (method == null)
                return (false, Array.Empty<string>());

            if (method.GetCustomAttributes(typeof(AllowAnonymousAttribute), inherit: true).Any())
                return (true, Array.Empty<string>());

            var authorize = method.GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
                .Cast<AuthorizeAttribute>()
                .FirstOrDefault();

            return authorize == null
                ? (false, Array.Empty<string>())
                : (false, authorize.Roles ?? Array.Empty<string>());
        }
        catch
        {
            return (false, Array.Empty<string>());
        }
    }

    private async Task SetUnauthorizedResponse(FunctionContext context, HttpRequestData req, string message)
    {
        var response = req.CreateResponse(HttpStatusCode.Unauthorized);
        response.Headers.Add("Content-Type", "text/plain; charset=utf-8");
        await response.WriteStringAsync(message);
        var invocationResult = context.GetInvocationResult();
        invocationResult.Value = response;
    }

    private async Task SetForbiddenResponse(FunctionContext context, HttpRequestData req, string message)
    {
        var response = req.CreateResponse(HttpStatusCode.Forbidden);
        response.Headers.Add("Content-Type", "text/plain; charset=utf-8");
        await response.WriteStringAsync(message);
        var invocationResult = context.GetInvocationResult();
        invocationResult.Value = response;
    }
}
