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

        var skipAuth = string.Equals(_configuration["SKIP_AUTH"], "true", StringComparison.OrdinalIgnoreCase);

        // Prefer a REAL, valid Bearer token whenever the caller actually sends one - even under
        // SKIP_AUTH - so a real logged-in browser session always gets its own true identity rather
        // than being silently replaced by SKIP_AUTH's synthetic dev principal. Confirmed broken in
        // production: a real user's own bookings were invisible to both the UI and Sage because
        // EVERY request was unconditionally overridden with a fixed placeholder identity that owns
        // no data at all - SKIP_AUTH was clobbering real sessions, not just covering for missing
        // ones. The dev principal below is now only a fallback for callers with no token (or an
        // invalid one) - its original purpose: quick curl/local testing without minting a real JWT.
        if (httpRequestData.Headers.TryGetValues("Authorization", out var authHeaders) && authHeaders.Any())
        {
            var authHeader = authHeaders.First();
            if (authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                var token = authHeader["Bearer ".Length..].Trim();
                var realPrincipal = ValidateToken(token);
                if (realPrincipal != null)
                {
                    context.Items["User"] = realPrincipal;
                    var (_, requiredRolesForReal) = ResolveAuthorizationRequirements(context);
                    if (requiredRolesForReal.Length > 0 && !requiredRolesForReal.Any(realPrincipal.IsInRole))
                    {
                        await SetForbiddenResponse(context, httpRequestData,
                            "You don't have permission to access this functionality.");
                        return;
                    }
                    await next(context);
                    return;
                }

                if (!skipAuth)
                {
                    await SetUnauthorizedResponse(context, httpRequestData, "Invalid or expired token.");
                    return;
                }
                // else: invalid/expired token but SKIP_AUTH is on - fall through to the dev
                // principal below rather than hard-failing, same convenience as before.
            }
        }

        if (skipAuth)
        {
            context.Items["User"] = BuildDevPrincipal(httpRequestData);
            await next(context);
            return;
        }

        var (allowAnonymous, _) = ResolveAuthorizationRequirements(context);
        if (allowAnonymous)
        {
            await next(context);
            return;
        }

        if (!httpRequestData.Headers.TryGetValues("Authorization", out _))
        {
            await SetUnauthorizedResponse(context, httpRequestData, "Missing Authorization header.");
            return;
        }

        await SetUnauthorizedResponse(context, httpRequestData, "Invalid Authorization scheme.");
    }

    private ClaimsPrincipal? ValidateToken(string token)
    {
        try
        {
            // Same fallback default as IdentityService.GenerateJwtAsync — keeps validation aligned
            // when JWT_SECRET is not set in Azure Function App application settings. Uses
            // IsNullOrEmpty rather than `??` deliberately: an App Setting (or local.settings.json
            // entry) explicitly present but set to "" is a real, confirmed misconfiguration state
            // (PaymentsService's local.settings.json had exactly this), and `??` only substitutes
            // on null - an empty string sails through it and produces a zero-length signing key,
            // which throws deep inside SymmetricSecurityKey's constructor on every single request.
            var configuredSecret = _configuration["JWT_SECRET"];
            var secretRaw = string.IsNullOrEmpty(configuredSecret)
                ? "U3RheUhlcmVNdHBTZWN1cmVKV1RLZXkyMDI2IVNlY3JldA=="
                : configuredSecret;

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

    // Stable fallback identity for local SKIP_AUTH testing when no X-User-Id header is sent (the
    // ClientApp's real browser flow never sends one - it authenticates with a real Bearer JWT,
    // which SKIP_AUTH mode bypasses entirely). A fresh Guid.NewGuid() per request here used to mean
    // every single request - including the "list my conversations" call right after a chat - got a
    // brand new random identity, so conversation history could never match anything: confirmed via
    // the DB that no ai_conversations.user_id ever matched a real registered user. Every local
    // request without an explicit X-User-Id now consistently acts as this same dev user instead.
    private static readonly Guid DefaultDevUserId = Guid.Parse("11111111-1111-1111-1111-111111111111");

    private static ClaimsPrincipal BuildDevPrincipal(HttpRequestData req)
    {
        var id = DefaultDevUserId;
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

            // Bypass authentication for automatically injected OpenAPI/Swagger endpoints
            if (entryPoint.StartsWith("Microsoft.Azure.Functions.Worker.Extensions.OpenApi", StringComparison.OrdinalIgnoreCase))
                return (true, Array.Empty<string>());

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
        response.Headers.Add("Content-Type", "application/json; charset=utf-8");
        // JSON { error } matches the shape individual function endpoints already use for their own
        // 403s, so frontend error handling can rely on one consistent body shape across all 8 apps
        // instead of this one path alone returning bare plain text.
        await response.WriteStringAsync(
            System.Text.Json.JsonSerializer.Serialize(new { error = message }));
        var invocationResult = context.GetInvocationResult();
        invocationResult.Value = response;
    }
}
