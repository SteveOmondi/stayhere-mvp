using StayHere.Application.Authentication.Models;

namespace StayHere.Application.Common.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> LoginWithEntraAsync(string entraToken);
    Task<bool> RequestOtpAsync(OtpRequest request);
    Task<AuthResponse> VerifyOtpAndLoginAsync(OtpVerificationRequest request);
    Task<UserDto> RegisterAsync(RegisterRequest request);
    Task<List<UserProfileDto>> GetProfilesAsync(Guid userId);
}
