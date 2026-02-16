namespace StayHere.Application.Authentication.Models;

public record LoginRequest(string? Email, string? PhoneNumber, string? EntraToken);

public record OtpRequest(string Target, OtpTypeDto Type);

public record OtpVerificationRequest(string Target, string Code);

public record AuthResponse(string Token, UserDto User);

public record UserDto(Guid Id, string Email, string? FullName, string Role);

public enum OtpTypeDto
{
    Email,
    Sms,
    WhatsApp
}
