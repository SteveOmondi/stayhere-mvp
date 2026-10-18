using StayHere.Domain.Entities;

namespace StayHere.Domain.Repositories;

public interface IViewingBookingRepository
{
    Task<ViewingBooking?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Matches CustomerId against both a Customer's primary key and its UserId - some historical
    /// records store the caller's UserId directly in CustomerId when no formal Customer profile
    /// exists yet (see ApplicationFunctions.cs's equivalent defensive lookup), so both must be
    /// checked. Both are nullable and at least one should be provided, or nothing will match.
    /// </summary>
    Task<IReadOnlyList<ViewingBooking>> GetByCustomerAsync(Guid? customerId, Guid? userId, CancellationToken cancellationToken = default);

    Task CreateAsync(ViewingBooking booking, CancellationToken cancellationToken = default);

    Task UpdateAsync(ViewingBooking booking, CancellationToken cancellationToken = default);
}
