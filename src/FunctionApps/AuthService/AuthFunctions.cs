using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using StayHere.Application.Authentication.Models;
using StayHere.Application.Common.Interfaces;
using System.Text.Json;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Attributes;
using Microsoft.OpenApi.Models;
using StayHere.Shared.Attributes;

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
    [AllowAnonymous]
    [OpenApiOperation(operationId: "Signup", tags: new[] { "Auth" }, Summary = "Register a new user", Description = "Creates a new user account.")]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(RegisterRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(UserDto), Description = "The registered user details.")]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.BadRequest, contentType: "text/plain", bodyType: typeof(string))]
    public async Task<HttpResponseData> Signup(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/signup")] HttpRequestData req)
    {
        _logger.LogInformation("Processing Signup request.");

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var registerRequest = JsonSerializer.Deserialize<RegisterRequest>(body, JsonOptions);

            if (registerRequest == null)
            {
                return await CreateJsonResponse(req, new { Succeeded = false, Message = "Invalid request body." }, HttpStatusCode.BadRequest);
            }

            var user = await _authService.RegisterAsync(registerRequest);
            return await CreateJsonResponse(req, user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during Signup");
            return await CreateJsonResponse(req, new { Succeeded = false, Message = ex.Message }, HttpStatusCode.BadRequest);
        }
    }

    [Function("Login")]
    [AllowAnonymous]
    [OpenApiOperation(operationId: "Login", tags: new[] { "Auth" }, Summary = "Login or Request OTP", Description = "Handles Entra ID login or requests a local OTP.")]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(LoginRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(AuthResponse), Description = "Login successful.")]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.Unauthorized, contentType: "text/plain", bodyType: typeof(string))]
    public async Task<HttpResponseData> Login(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/login")] HttpRequestData req)
    {
        _logger.LogInformation("Processing Login request.");

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var loginRequest = JsonSerializer.Deserialize<LoginRequest>(body, JsonOptions);

            if (loginRequest == null)
            {
                return await CreateJsonResponse(req, new { Succeeded = false, Message = "Invalid request body." }, HttpStatusCode.BadRequest);
            }

            if (!string.IsNullOrEmpty(loginRequest.EntraToken))
            {
                var response = await _authService.LoginWithEntraAsync(loginRequest.EntraToken);
                return await CreateJsonResponse(req, response);
            }

            if (!string.IsNullOrEmpty(loginRequest.Email))
            {
                var otpRes = await _authService.RequestOtpAsync(new OtpRequest(loginRequest.Email, OtpTypeDto.Email));
                return await CreateJsonResponse(req, otpRes, otpRes.Succeeded ? HttpStatusCode.OK : HttpStatusCode.BadRequest);
            }

            if (!string.IsNullOrEmpty(loginRequest.PhoneNumber))
            {
                var otpRes = await _authService.RequestOtpAsync(new OtpRequest(loginRequest.PhoneNumber, OtpTypeDto.Sms));
                return await CreateJsonResponse(req, otpRes, otpRes.Succeeded ? HttpStatusCode.OK : HttpStatusCode.BadRequest);
            }

            return await CreateJsonResponse(req, new { Succeeded = false, Message = "Please provide Email, Phone Number, or Entra Token." }, HttpStatusCode.BadRequest);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during Login");
            return await CreateJsonResponse(req, new { Succeeded = false, Message = ex.Message }, HttpStatusCode.Unauthorized);
        }
    }

    [Function("VerifyOtp")]
    [AllowAnonymous]
    [OpenApiOperation(operationId: "VerifyOtp", tags: new[] { "Auth" }, Summary = "Verify OTP and Login", Description = "Verifies the provided OTP and returns an authentication token.")]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(OtpVerificationRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(AuthResponse))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.Unauthorized, contentType: "text/plain", bodyType: typeof(string))]
    public async Task<HttpResponseData> VerifyOtp(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/verifyotp")] HttpRequestData req)
    {
        _logger.LogInformation("Processing VerifyOtp request.");

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var verificationRequest = JsonSerializer.Deserialize<OtpVerificationRequest>(body, JsonOptions);

            if (verificationRequest == null)
            {
                return await CreateJsonResponse(req, new { Succeeded = false, Message = "Invalid request body." }, HttpStatusCode.BadRequest);
            }

            var response = await _authService.VerifyOtpAndLoginAsync(verificationRequest);
            return await CreateJsonResponse(req, response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during VerifyOtp code");
            return await CreateJsonResponse(req, new { Succeeded = false, Message = ex.Message }, HttpStatusCode.Unauthorized);
        }
    }

    [Function("GetProfiles")]
    [Authorize]
    [OpenApiOperation(operationId: "GetProfiles", tags: new[] { "Auth" }, Summary = "Get User Profiles", Description = "Retrieves all profiles associated with a user.")]
    [OpenApiParameter(name: "userId", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(List<UserProfileDto>))]
    public async Task<HttpResponseData> GetProfiles(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "auth/profiles/{userId:guid}")] HttpRequestData req,
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
            return await CreateJsonResponse(req, new { Succeeded = false, Message = ex.Message }, HttpStatusCode.BadRequest);
        }
    }

    [Function("UpdateProfile")]
    [Authorize]
    [OpenApiOperation(operationId: "UpdateProfile", tags: new[] { "Auth" }, Summary = "Update User Profile", Description = "Updates user profile details like phone number and full name.")]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(UpdateProfileRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(object))]
    public async Task<HttpResponseData> UpdateProfile(
        [HttpTrigger(AuthorizationLevel.Anonymous, "patch", Route = "auth/profile/update")] HttpRequestData req)
    {
        _logger.LogInformation("Processing UpdateProfile request.");

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var updateRequest = JsonSerializer.Deserialize<UpdateProfileRequest>(body, JsonOptions);

            if (updateRequest == null)
            {
                return await CreateJsonResponse(req, new { Succeeded = false, Message = "Invalid request body." }, HttpStatusCode.BadRequest);
            }

            var success = await _authService.UpdateProfileAsync(updateRequest);

            return await CreateJsonResponse(
                req,
                new { Succeeded = success, Message = success ? "Profile updated successfully." : "Failed to update profile." },
                success ? HttpStatusCode.OK : HttpStatusCode.BadRequest);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during UpdateProfile");
            return await CreateJsonResponse(req, new { Succeeded = false, Message = ex.Message }, HttpStatusCode.BadRequest);
        }
    }

    [Function("GetAllUsers")]
    [Authorize]
    [OpenApiOperation(operationId: "GetAllUsers", tags: new[] { "Auth" }, Summary = "Get All Users (Admin)", Description = "Returns a paginated list of all registered users. Admin only.")]
    [OpenApiParameter(name: "page", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
    [OpenApiParameter(name: "pageSize", In = ParameterLocation.Query, Required = false, Type = typeof(int))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(object))]
    public async Task<HttpResponseData> GetAllUsers(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "auth/users")] HttpRequestData req)
    {
        _logger.LogInformation("Processing GetAllUsers request.");
        try
        {
            var qs = System.Web.HttpUtility.ParseQueryString(req.Url.Query);
            int.TryParse(qs["page"], out var page);
            int.TryParse(qs["pageSize"], out var pageSize);
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 200) pageSize = 20;

            var (users, total) = await _authService.GetAllUsersAsync(page, pageSize);
            return await CreateJsonResponse(req, new
            {
                succeeded = true,
                page,
                pageSize,
                totalCount = total,
                totalPages = (int)Math.Ceiling((double)total / pageSize),
                items = users
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during GetAllUsers");
            return await CreateJsonResponse(req, new { Succeeded = false, Message = ex.Message }, HttpStatusCode.BadRequest);
        }
    }

    [Function("GetUserById")]
    [Authorize]
    [OpenApiOperation(operationId: "GetUserById", tags: new[] { "Auth" }, Summary = "Get User By ID (Admin)", Description = "Returns a single user by their auth ID. Admin only.")]
    [OpenApiParameter(name: "id", In = ParameterLocation.Path, Required = true, Type = typeof(Guid))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(UserDto))]
    public async Task<HttpResponseData> GetUserById(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "auth/users/{id:guid}")] HttpRequestData req,
        Guid id)
    {
        _logger.LogInformation("Processing GetUserById request for {Id}.", id);
        try
        {
            var user = await _authService.GetUserByIdAsync(id);
            if (user == null)
            {
                return await CreateJsonResponse(req, new { Succeeded = false, Message = "User not found." }, HttpStatusCode.NotFound);
            }
            return await CreateJsonResponse(req, user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during GetUserById");
            return await CreateJsonResponse(req, new { Succeeded = false, Message = ex.Message }, HttpStatusCode.BadRequest);
        }
    }

    private async Task<HttpResponseData> CreateJsonResponse<T>(HttpRequestData req, T content, HttpStatusCode statusCode = HttpStatusCode.OK)
    {
        var response = req.CreateResponse(statusCode);
        response.Headers.Add("Content-Type", "application/json; charset=utf-8");
        await response.WriteStringAsync(JsonSerializer.Serialize(content, JsonOptions));
        return response;
    }
}
