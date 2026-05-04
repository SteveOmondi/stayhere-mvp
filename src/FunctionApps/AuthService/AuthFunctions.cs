using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using StayHere.Application.Authentication.Models;
using StayHere.Application.Common.Interfaces;
using System.Text.Json;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Attributes;
using Microsoft.OpenApi.Models;

namespace StayHere.AuthService.Functions;

public class AuthFunctions
{
    private readonly IAuthService _authService;
    private readonly ILogger<AuthFunctions> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public AuthFunctions(IAuthService authService, ILogger<AuthFunctions> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    [Function("Signup")]
    [OpenApiOperation(operationId: "Signup", tags: new[] { "Auth" }, Summary = "Register a new user", Description = "Creates a new user account.")]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(RegisterRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(UserDto), Description = "The registered user details.")]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.BadRequest, contentType: "text/plain", bodyType: typeof(string))]
    public async Task<HttpResponseData> Signup(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "signup")] HttpRequestData req)
    {
        _logger.LogInformation("Processing Signup request.");

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var registerRequest = JsonSerializer.Deserialize<RegisterRequest>(body, JsonOptions);

            if (registerRequest == null) return req.CreateResponse(HttpStatusCode.BadRequest);

            var user = await _authService.RegisterAsync(registerRequest);
            return await CreateJsonResponse(req, user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during Signup");
            var res = req.CreateResponse(HttpStatusCode.BadRequest);
            await res.WriteStringAsync(ex.Message);
            return res;
        }
    }

    [Function("Login")]
    [OpenApiOperation(operationId: "Login", tags: new[] { "Auth" }, Summary = "Login or Request OTP", Description = "Handles Entra ID login or requests a local OTP.")]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(LoginRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(AuthResponse), Description = "Login successful.")]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.Unauthorized, contentType: "text/plain", bodyType: typeof(string))]
    public async Task<HttpResponseData> Login(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "login")] HttpRequestData req)
    {
        _logger.LogInformation("Processing Login request.");

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var loginRequest = JsonSerializer.Deserialize<LoginRequest>(body, JsonOptions);

            if (loginRequest == null) return req.CreateResponse(HttpStatusCode.BadRequest);

            if (!string.IsNullOrEmpty(loginRequest.EntraToken))
            {
                var response = await _authService.LoginWithEntraAsync(loginRequest.EntraToken);
                return await CreateJsonResponse(req, response);
            }
            
            if (!string.IsNullOrEmpty(loginRequest.Email))
            {
                var success = await _authService.RequestOtpAsync(new OtpRequest(loginRequest.Email, OtpTypeDto.Email));
                var res = req.CreateResponse(success ? HttpStatusCode.OK : HttpStatusCode.BadRequest);
                await res.WriteAsJsonAsync(new { succeeded = success, message = success ? "Verification code sent to your email." : "Failed to send verification code. Please check your email address." });
                return res;
            }

            if (!string.IsNullOrEmpty(loginRequest.PhoneNumber))
            {
                var success = await _authService.RequestOtpAsync(new OtpRequest(loginRequest.PhoneNumber, OtpTypeDto.Sms));
                var res = req.CreateResponse(success ? HttpStatusCode.OK : HttpStatusCode.BadRequest);
                await res.WriteAsJsonAsync(new { succeeded = success, message = success ? "Verification code sent to your phone via SMS." : "Failed to deliver SMS. Please ensure your phone number is correct and try again." });
                return res;
            }

            return req.CreateResponse(HttpStatusCode.BadRequest);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during Login");
            var res = req.CreateResponse(HttpStatusCode.Unauthorized);
            await res.WriteStringAsync(ex.Message);
            return res;
        }
    }

    [Function("VerifyOtp")]
    [OpenApiOperation(operationId: "VerifyOtp", tags: new[] { "Auth" }, Summary = "Verify OTP and Login", Description = "Verifies the provided OTP and returns an authentication token.")]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(OtpVerificationRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(AuthResponse))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.Unauthorized, contentType: "text/plain", bodyType: typeof(string))]
    public async Task<HttpResponseData> VerifyOtp(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "verifyotp")] HttpRequestData req)
    {
        _logger.LogInformation("Processing VerifyOtp request.");

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var verificationRequest = JsonSerializer.Deserialize<OtpVerificationRequest>(body, JsonOptions);

            if (verificationRequest == null) return req.CreateResponse(HttpStatusCode.BadRequest);

            var response = await _authService.VerifyOtpAndLoginAsync(verificationRequest);
            return await CreateJsonResponse(req, response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during VerifyOtp");
            var res = req.CreateResponse(HttpStatusCode.Unauthorized);
            await res.WriteStringAsync(ex.Message);
            return res;
        }
    }

    [Function("GetProfiles")]
    [OpenApiOperation(operationId: "GetProfiles", tags: new[] { "Auth" }, Summary = "Get User Profiles", Description = "Retrieves all profiles associated with a user.")]
    [OpenApiParameter(name: "userId", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<UserProfileDto>))]
    public async Task<HttpResponseData> GetProfiles(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "profiles/{userId:guid}")] HttpRequestData req,
        Guid userId)
    {
        _logger.LogInformation("Processing GetProfiles request.");

        try
        {
            var profiles = await _authService.GetProfilesAsync(userId);
            return await CreateJsonResponse(req, profiles);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during GetProfiles");
            var res = req.CreateResponse(HttpStatusCode.BadRequest);
            await res.WriteStringAsync(ex.Message);
            return res;
        }
    }

    private async Task<HttpResponseData> CreateJsonResponse<T>(HttpRequestData req, T content)
    {
        var response = req.CreateResponse(HttpStatusCode.OK);
        response.Headers.Add("Content-Type", "application/json; charset=utf-8");
        await response.WriteStringAsync(JsonSerializer.Serialize(content, JsonOptions));
        return response;
    }
}
