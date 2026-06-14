using System.Text.Json.Serialization;
namespace StayHere.Application.Authentication.Models;

public record LoginRequest(string? Email, string? PhoneNumber, string? EntraToken);
public record RegisterRequest(string Email, string? PhoneNumber, string FullName, string UserType = "Individual");

public record SignupAndOnboardRequest(
    string FullName,
    string Email,
    string? PhoneNumber,
    string Role  // Tenant | PropertyOwner | Admin
);

public class SignupAndOnboardResponse
{
    public bool Succeeded { get; set; } = true;
    public string Message { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public Guid ProfileId { get; set; }
    public string Role { get; set; } = string.Empty;
    public UserDto? User { get; set; }
}

public record OtpRequest(string Target, OtpTypeDto Type);

public record OtpVerificationRequest(
    [property: JsonPropertyName("PhoneNumber")] string Target, 
    [property: JsonPropertyName("otp")] string Code);

public record UpdateProfileRequest(Guid UserId, string? PhoneNumber, string? FullName, string? Role);

public class AuthResponse
{
    public bool Succeeded { get; set; } = true;
    public string Message { get; set; } = "Success";
    public string Token { get; set; } = string.Empty;
    public UserDto? User { get; set; }
}

public class ProfilesResponse
{
    public bool Succeeded { get; set; } = true;
    public string Message { get; set; } = "Profiles retrieved";
    public List<UserProfileDto> Profiles { get; set; } = new();
}

public record UserDto(
    Guid Id, 
    string Email, 
    string? FullName, 
    List<string> Roles, 
    string UserType, 
    Guid? OrganizationId = null,
    string? OrganizationName = null,
    bool IsOnboarded = false);

public enum OtpTypeDto
{
    Email,
    Sms,
    WhatsApp
}

public record UserProfileDto(Guid ProfileId, string Role, string DisplayName);
