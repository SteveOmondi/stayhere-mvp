using StayHere.Domain.Entities;

namespace StayHere.Domain.Repositories;

public interface IOtpRepository
{
    Task<OtpVerification?> GetLatestActiveOtpAsync(string target);
    Task CreateAsync(OtpVerification otp);
    Task UpdateAsync(OtpVerification otp);
}
