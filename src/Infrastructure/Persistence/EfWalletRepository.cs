using Microsoft.EntityFrameworkCore;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Infrastructure.Persistence;

public class EfWalletRepository : IWalletRepository
{
    private readonly StayHereDbContext _context;

    public EfWalletRepository(StayHereDbContext context)
    {
        _context = context;
    }

    public async Task<Wallet?> GetByIdAsync(Guid id)
    {
        return await _context.Wallets.FindAsync(id);
    }

    public async Task<Wallet?> GetByOwnerIdAsync(Guid propertyOwnerId)
    {
        return await _context.Wallets
            .FirstOrDefaultAsync(w => w.PropertyOwnerId == propertyOwnerId);
    }

    public async Task CreateAsync(Wallet wallet)
    {
        _context.Wallets.Add(wallet);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Wallet wallet)
    {
        _context.Wallets.Update(wallet);
        await _context.SaveChangesAsync();
    }

    public async Task<decimal> GetBalanceAsync(Guid walletId)
    {
        var wallet = await _context.Wallets.FindAsync(walletId);
        return wallet?.Balance ?? 0;
    }
}
