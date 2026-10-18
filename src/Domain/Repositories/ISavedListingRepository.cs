using StayHere.Domain.Entities;

namespace StayHere.Domain.Repositories;

public interface ISavedListingRepository
{
    /// <summary>
    /// Matches CustomerId against both a Customer's primary key and its UserId - same dual-match
    /// rationale as IViewingBookingRepository.GetByCustomerAsync. Both are nullable and at least
    /// one should be provided, or nothing will match.
    /// </summary>
    Task<IReadOnlyList<SavedListing>> GetByCustomerAsync(Guid? customerId, Guid? userId, CancellationToken cancellationToken = default);

    Task<SavedListing?> FindAsync(Guid? customerId, Guid? userId, Guid listingId, CancellationToken cancellationToken = default);

    Task CreateAsync(SavedListing saved, CancellationToken cancellationToken = default);

    Task DeleteAsync(SavedListing saved, CancellationToken cancellationToken = default);
}
