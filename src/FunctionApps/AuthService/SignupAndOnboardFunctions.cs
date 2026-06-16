using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using StayHere.Application.Authentication.Models;
using StayHere.Application.Common.Interfaces;
using StayHere.Application.Onboarding.Models;
using StayHere.Application.Onboarding.Services;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Attributes;
using Microsoft.OpenApi.Models;
using StayHere.Shared.Attributes;

namespace StayHere.AuthService.Functions;

public class SignupAndOnboardFunctions
{
    private readonly IAuthService _authService;
    private readonly IOnboardingService _onboardingService;
    private readonly ILogger<SignupAndOnboardFunctions> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public SignupAndOnboardFunctions(
        IAuthService authService,
        IOnboardingService onboardingService,
        ILogger<SignupAndOnboardFunctions> logger)
    {
        _authService = authService;
        _onboardingService = onboardingService;
        _logger = logger;
    }

    [Function("SignupAndOnboard")]
    [AllowAnonymous]
    [OpenApiOperation(
        operationId: "SignupAndOnboard",
        tags: new[] { "Auth" },
        Summary = "Register and onboard a user in one step",
        Description = "Creates a new user account and immediately provisions their role-specific profile (Tenant or PropertyOwner). Equivalent to calling /signup followed by /onboard.")]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(SignupAndOnboardRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(SignupAndOnboardResponse))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.BadRequest, contentType: "application/json", bodyType: typeof(object))]
    public async Task<HttpResponseData> SignupAndOnboard(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/register")] HttpRequestData req)
    {
        _logger.LogInformation("Processing SignupAndOnboard request.");

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<SignupAndOnboardRequest>(body, JsonOptions);

            if (request == null || string.IsNullOrWhiteSpace(request.Email)
                                || string.IsNullOrWhiteSpace(request.FullName)
                                || string.IsNullOrWhiteSpace(request.Role))
            {
                var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                await bad.WriteAsJsonAsync(new { Succeeded = false, Message = "FullName, Email, and Role are required." });
                return bad;
            }

            // Step 1: register the auth user
            UserDto user;
            try
            {
                user = await _authService.RegisterAsync(new RegisterRequest(
                    request.Email,
                    request.PhoneNumber,
                    request.FullName));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Signup step failed for {Email}", request.Email);
                var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                await bad.WriteAsJsonAsync(new { Succeeded = false, Message = ex.Message });
                return bad;
            }

            // Step 2: provision the role profile
            OnboardUserResponse onboard;
            try
            {
                onboard = await _onboardingService.OnboardUserAsync(new OnboardUserRequest(
                    user.Id,
                    request.Role,
                    request.FullName,
                    request.PhoneNumber ?? string.Empty,
                    request.Email));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Onboarding step failed for UserId {UserId}", user.Id);
                // Signup succeeded but onboarding failed — surface the userId so the client can retry /onboard
                var partial = req.CreateResponse(HttpStatusCode.BadRequest);
                await partial.WriteAsJsonAsync(new
                {
                    Succeeded = false,
                    Message = $"Account created but onboarding failed: {ex.Message}. Use POST /auth/onboard with UserId {user.Id} to complete setup.",
                    UserId = user.Id
                });
                return partial;
            }

            var res = req.CreateResponse(HttpStatusCode.OK);
            res.Headers.Add("Content-Type", "application/json; charset=utf-8");
            await res.WriteStringAsync(JsonSerializer.Serialize(new SignupAndOnboardResponse
            {
                Succeeded = true,
                Message = "Registration and onboarding complete.",
                UserId = user.Id,
                ProfileId = onboard.ProfileId,
                Role = onboard.Role,
                User = user
            }, JsonOptions));
            return res;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in SignupAndOnboard");
            var err = req.CreateResponse(HttpStatusCode.BadRequest);
            await err.WriteAsJsonAsync(new { Succeeded = false, Message = ex.Message });
            return err;
        }
    }
}
