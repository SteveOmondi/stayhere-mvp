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

    [Function("Login")]
    public async Task<HttpResponseData> Login(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post")] HttpRequestData req)
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
        [HttpTrigger(AuthorizationLevel.Anonymous, "post")] HttpRequestData req)
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

    private async Task<HttpResponseData> CreateJsonResponse<T>(HttpRequestData req, T content)
    {
        var response = req.CreateResponse(HttpStatusCode.OK);
        await response.WriteAsJsonAsync(content);
        return response;
    }
}
