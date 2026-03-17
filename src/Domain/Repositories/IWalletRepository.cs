using StayHere.Domain.Entities;

namespace StayHere.Domain.Repositories;

public interface IWalletRepository
{
    Task<Wallet?> GetByIdAsync(Guid id);
    Task<Wallet?> GetByOwnerIdAsync(Guid propertyOwnerId);
    Task CreateAsync(Wallet wallet);
    Task UpdateAsync(Wallet wallet);
    Task<decimal> GetBalanceAsync(Guid walletId);
}
