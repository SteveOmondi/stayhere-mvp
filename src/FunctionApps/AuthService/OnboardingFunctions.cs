using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using StayHere.Application.Onboarding.Models;
using StayHere.Application.Onboarding.Services;
using StayHere.Application.Authentication.Models;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Attributes;
using Microsoft.OpenApi.Models;

namespace StayHere.AuthService.Functions;

public class OnboardingFunctions
{
    private readonly IOnboardingService _onboardingService;
    private readonly ILogger<OnboardingFunctions> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public OnboardingFunctions(IOnboardingService onboardingService, ILogger<OnboardingFunctions> logger)
    {
        _onboardingService = onboardingService;
        _logger = logger;
    }

    [Function("Onboard")]
    [OpenApiOperation(operationId: "Onboard", tags: new[] { "Onboarding" }, Summary = "Onboard a user", Description = "Completes the onboarding process for a registered user.")]
    [OpenApiRequestBody(contentType: "application/json", bodyType: typeof(OnboardUserRequest), Required = true)]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "application/json", bodyType: typeof(UserDto))]
    [OpenApiResponseWithBody(statusCode: HttpStatusCode.BadRequest, contentType: "text/plain", bodyType: typeof(string))]
    public async Task<HttpResponseData> Onboard(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/onboard")] HttpRequestData req)
    {
        _logger.LogInformation("Processing Onboarding request.");

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = JsonSerializer.Deserialize<OnboardUserRequest>(body, JsonOptions);

            if (request == null) return req.CreateResponse(HttpStatusCode.BadRequest);

            var response = await _onboardingService.OnboardUserAsync(request);
            var res = req.CreateResponse(HttpStatusCode.OK);
            res.Headers.Add("Content-Type", "application/json; charset=utf-8");
            await res.WriteStringAsync(JsonSerializer.Serialize(response, JsonOptions));
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
