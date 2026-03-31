using StayHere.Application.Onboarding.Models;

namespace StayHere.Application.Onboarding.Services;

public interface IOnboardingService
{
    Task<OnboardUserResponse> OnboardUserAsync(OnboardUserRequest request);
}
