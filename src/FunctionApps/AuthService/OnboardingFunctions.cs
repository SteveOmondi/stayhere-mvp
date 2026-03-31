using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using StayHere.Application.Onboarding.Models;
using StayHere.Application.Onboarding.Services;

namespace StayHere.AuthService.Functions;

public class OnboardingFunctions
{
    private readonly IOnboardingService _onboardingService;
    private readonly ILogger<OnboardingFunctions> _logger;

    public OnboardingFunctions(IOnboardingService onboardingService, ILogger<OnboardingFunctions> logger)
    {
        _onboardingService = onboardingService;
        _logger = logger;
    }

    [Function("Onboard")]
    public async Task<HttpResponseData> Onboard(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/onboard")] HttpRequestData req)
    {
        _logger.LogInformation("Processing Onboarding request.");

        var body = await new StreamReader(req.Body).ReadToEndAsync();
        var request = JsonSerializer.Deserialize<OnboardUserRequest>(body, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        if (request == null) return req.CreateResponse(HttpStatusCode.BadRequest);

        try
        {
            var response = await _onboardingService.OnboardUserAsync(request);
            var res = req.CreateResponse(HttpStatusCode.OK);
            await res.WriteAsJsonAsync(response);
            return res;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during Onboarding");
            var res = req.CreateResponse(HttpStatusCode.BadRequest);
            await res.WriteStringAsync(ex.Message);
            return res;
        }
    }
}
