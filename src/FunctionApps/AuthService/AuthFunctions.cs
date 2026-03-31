using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using StayHere.Application.Authentication.Models;
using StayHere.Application.Common.Interfaces;
using System.Text.Json;

namespace StayHere.AuthService.Functions;

public class AuthFunctions
{
    private readonly IAuthService _authService;
    private readonly ILogger<AuthFunctions> _logger;

    public AuthFunctions(IAuthService authService, ILogger<AuthFunctions> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    [Function("Signup")]
    public async Task<HttpResponseData> Signup(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/signup")] HttpRequestData req)
    {
        _logger.LogInformation("Processing Signup request.");

        var body = await new StreamReader(req.Body).ReadToEndAsync();
        var registerRequest = JsonSerializer.Deserialize<RegisterRequest>(body, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        if (registerRequest == null) return req.CreateResponse(HttpStatusCode.BadRequest);

        try
        {
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
    public async Task<HttpResponseData> Login(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/login")] HttpRequestData req)
    {
        _logger.LogInformation("Processing Login request.");

        var body = await new StreamReader(req.Body).ReadToEndAsync();
        var loginRequest = JsonSerializer.Deserialize<LoginRequest>(body, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        if (loginRequest == null) return req.CreateResponse(HttpStatusCode.BadRequest);

        try
        {
            if (!string.IsNullOrEmpty(loginRequest.EntraToken))
            {
                var response = await _authService.LoginWithEntraAsync(loginRequest.EntraToken);
                return await CreateJsonResponse(req, response);
            }
            
            if (!string.IsNullOrEmpty(loginRequest.Email))
            {
                await _authService.RequestOtpAsync(new OtpRequest(loginRequest.Email, OtpTypeDto.Email));
                return req.CreateResponse(HttpStatusCode.OK);
            }

            if (!string.IsNullOrEmpty(loginRequest.PhoneNumber))
            {
                await _authService.RequestOtpAsync(new OtpRequest(loginRequest.PhoneNumber, OtpTypeDto.Sms));
                return req.CreateResponse(HttpStatusCode.OK);
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
    public async Task<HttpResponseData> VerifyOtp(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/verifyotp")] HttpRequestData req)
    {
        _logger.LogInformation("Processing VerifyOtp request.");

        var body = await new StreamReader(req.Body).ReadToEndAsync();
        var verificationRequest = JsonSerializer.Deserialize<OtpVerificationRequest>(body, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        if (verificationRequest == null) return req.CreateResponse(HttpStatusCode.BadRequest);

        try
        {
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
    public async Task<HttpResponseData> GetProfiles(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "auth/profiles/{userId:guid}")] HttpRequestData req,
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
        await response.WriteAsJsonAsync(content);
        return response;
    }
}
