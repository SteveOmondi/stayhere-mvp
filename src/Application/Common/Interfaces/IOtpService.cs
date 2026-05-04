using StayHere.Domain.Entities;

namespace StayHere.Application.Common.Interfaces;

public interface IOtpService
{
    Task<string> GenerateOtpAsync(string target, OtpType type);
    Task<bool> VerifyOtpAsync(string target, string code);
    Task<bool> SendOtpAsync(string target, string code, OtpType type);
}
