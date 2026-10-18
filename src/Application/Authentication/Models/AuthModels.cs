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

/// <summary>
/// Accepts the identifier under either "Email" or "PhoneNumber" (whichever the client actually has),
/// resolving to a single Target - previously this only ever bound "PhoneNumber", so any client that
/// sent "Email" (the natural field for an email-based OTP) silently failed verification with
/// "Target (Email/Phone) is required." even though the OTP itself was requested and delivered fine.
/// </summary>
public record OtpVerificationRequest(
    string? Email,
    string? PhoneNumber,
    [property: JsonPropertyName("otp")] string Code)
{
    [JsonIgnore]
    public string Target => !string.IsNullOrWhiteSpace(Email) ? Email! : (PhoneNumber ?? string.Empty);
}

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

/// <summary>Phone is nullable - falls back to the owning User.PhoneNumber when the role-specific
/// profile (Customer/PropertyOwner) hasn't set its own, so callers always get the best number
/// available rather than nothing. This is the one endpoint any signed-in user can call for their
/// own profile (bare [Authorize], no role check) - the reliable place for the client apps to
/// prefill a form with "my name and phone" rather than guessing from JWT claims.</summary>
public record UserProfileDto(Guid ProfileId, string Role, string DisplayName, string? Phone = null);
