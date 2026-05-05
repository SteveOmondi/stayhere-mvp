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

            if (registerRequest == null) 
            {
                var badRes = req.CreateResponse(HttpStatusCode.BadRequest);
                await badRes.WriteAsJsonAsync(new { Succeeded = false, Message = "Invalid request body." });
                return badRes;
            }

            var user = await _authService.RegisterAsync(registerRequest);
            return await CreateJsonResponse(req, user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during Signup");
            var res = req.CreateResponse(HttpStatusCode.BadRequest);
            await res.WriteAsJsonAsync(new { Succeeded = false, Message = ex.Message });
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

            if (loginRequest == null)
            {
                var badRes = req.CreateResponse(HttpStatusCode.BadRequest);
                await badRes.WriteAsJsonAsync(new { Succeeded = false, Message = "Invalid request body." });
                return badRes;
            }

            if (!string.IsNullOrEmpty(loginRequest.EntraToken))
            {
                var response = await _authService.LoginWithEntraAsync(loginRequest.EntraToken);
                return await CreateJsonResponse(req, response);
            }
            
            if (!string.IsNullOrEmpty(loginRequest.Email))
            {
                var otpRes = await _authService.RequestOtpAsync(new OtpRequest(loginRequest.Email, OtpTypeDto.Email));
                var res = req.CreateResponse(otpRes.Succeeded ? HttpStatusCode.OK : HttpStatusCode.BadRequest);
                await res.WriteAsJsonAsync(otpRes);
                return res;
            }

            if (!string.IsNullOrEmpty(loginRequest.PhoneNumber))
            {
                var otpRes = await _authService.RequestOtpAsync(new OtpRequest(loginRequest.PhoneNumber, OtpTypeDto.Sms));
                var res = req.CreateResponse(otpRes.Succeeded ? HttpStatusCode.OK : HttpStatusCode.BadRequest);
                await res.WriteAsJsonAsync(otpRes);
                return res;
            }

            var errorRes = req.CreateResponse(HttpStatusCode.BadRequest);
            await errorRes.WriteAsJsonAsync(new { Succeeded = false, Message = "Please provide Email, Phone Number, or Entra Token." });
            return errorRes;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during Login");
            var res = req.CreateResponse(HttpStatusCode.Unauthorized);
            await res.WriteAsJsonAsync(new { Succeeded = false, Message = ex.Message });
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

            if (verificationRequest == null)
            {
                var badRes = req.CreateResponse(HttpStatusCode.BadRequest);
                await badRes.WriteAsJsonAsync(new { Succeeded = false, Message = "Invalid request body." });
                return badRes;
            }

            var response = await _authService.VerifyOtpAndLoginAsync(verificationRequest);
            return await CreateJsonResponse(req, response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during VerifyOtp code");
            var res = req.CreateResponse(HttpStatusCode.Unauthorized);
            await res.WriteAsJsonAsync(new { Succeeded = false, Message = ex.Message });
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
            return await CreateJsonResponse(req, new ProfilesResponse
            {
                Succeeded = true,
                Message = "Profiles retrieved successfully.",
                Profiles = profiles
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during GetProfiles");
            var res = req.CreateResponse(HttpStatusCode.BadRequest);
            await res.WriteAsJsonAsync(new { Succeeded = false, Message = ex.Message });
            return res;
        }
    }

    [Function("UpdateProfile")]
    [OpenApiOperation(operationId: "UpdateProfile", tags: new[] { "Auth" }, Summary = "Update User Profile", Description = "Updates user profile details like phone number and full name.")]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(UpdateProfileRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(object))]
    public async Task<HttpResponseData> UpdateProfile(
        [HttpTrigger(AuthorizationLevel.Anonymous, "patch", Route = "profile/update")] HttpRequestData req)
    {
        _logger.LogInformation("Processing UpdateProfile request.");

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var updateRequest = JsonSerializer.Deserialize<UpdateProfileRequest>(body, JsonOptions);

            if (updateRequest == null)
            {
                var badRes = req.CreateResponse(HttpStatusCode.BadRequest);
                await badRes.WriteAsJsonAsync(new { Succeeded = false, Message = "Invalid request body." });
                return badRes;
            }

            var success = await _authService.UpdateProfileAsync(updateRequest);
            
            var res = req.CreateResponse(success ? HttpStatusCode.OK : HttpStatusCode.BadRequest);
            await res.WriteAsJsonAsync(new { Succeeded = success, Message = success ? "Profile updated successfully." : "Failed to update profile." });
            return res;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during UpdateProfile");
            var res = req.CreateResponse(HttpStatusCode.BadRequest);
            await res.WriteAsJsonAsync(new { Succeeded = false, Message = ex.Message });
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
