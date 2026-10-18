using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StayHere.Domain.Entities;
using StayHere.Infrastructure.Persistence;

namespace StayHere.PaymentsService.Mpesa;

/// <summary>
/// Credits a property owner's wallet when one of their listings' rental payments is confirmed.
/// There are three independent places a payment transitions into "Confirmed" - the STK callback,
/// the QueryStkStatus self-heal path, and the C2B confirmation - with no shared "mark confirmed"
/// codepath between them, so each must call this exactly once at the point of confirmation.
/// </summary>
internal static class WalletCreditHelper
{
    public static async Task CreditOwnerWalletAsync(
        StayHereDbContext db, ILogger log, RentalPayment payment, Guid? listingId)
    {
        if (listingId is not { } lid || lid == Guid.Empty)
        {
            log.LogWarning(
                "Could not credit a wallet for payment {PaymentId} - no listing could be resolved.",
                payment.Id);
            return;
        }

        var ownerId = await db.Listings
            .Where(l => l.Id == lid)
            .Select(l => (Guid?)l.OwnerId)
            .FirstOrDefaultAsync();
        if (ownerId is not { } oid)
        {
            log.LogWarning(
                "Could not credit a wallet for payment {PaymentId} - listing {ListingId} not found.",
                payment.Id, lid);
            return;
        }

        var wallet = await db.Wallets.FirstOrDefaultAsync(w => w.PropertyOwnerId == oid);
        if (wallet is null)
        {
            log.LogWarning(
                "Could not credit a wallet for payment {PaymentId} - owner {OwnerId} has no wallet.",
                payment.Id, oid);
            return;
        }

        wallet.Balance += payment.Amount;
        wallet.UpdatedAt = DateTime.UtcNow;
        log.LogInformation(
            "Credited {Amount} {Currency} to owner {OwnerId}'s wallet for payment {PaymentId} (new balance: {Balance}).",
            payment.Amount, payment.Currency, oid, payment.Id, wallet.Balance);
    }
}
