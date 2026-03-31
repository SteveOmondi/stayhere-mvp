using Microsoft.EntityFrameworkCore;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Infrastructure.Persistence;

public class EfOtpRepository : IOtpRepository
{
    private readonly StayHereDbContext _context;

    public EfOtpRepository(StayHereDbContext context)
    {
        _context = context;
    }

    public async Task<OtpVerification?> GetLatestActiveOtpAsync(string target)
    {
        return await _context.OtpVerifications
            .Where(o => o.Target == target && !o.IsUsed && o.Expiry > DateTime.UtcNow)
            .OrderByDescending(o => o.Expiry)
            .FirstOrDefaultAsync();
    }

    public async Task CreateAsync(OtpVerification otp)
    {
        _context.OtpVerifications.Add(otp);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(OtpVerification otp)
    {
        _context.OtpVerifications.Update(otp);
        await _context.SaveChangesAsync();
    }
}
