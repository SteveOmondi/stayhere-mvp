using StayHere.Domain.Entities;

namespace StayHere.Domain.Repositories;

public interface ITenantApplicationRepository
{
    /// <summary>Includes Documents and Payments.</summary>
    Task<TenantApplication?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Includes Documents and Payments. Matches CustomerId against both a Customer's primary key
    /// and its UserId - see IViewingBookingRepository's remark on the same historical inconsistency.
    /// Both are nullable and at least one should be provided, or nothing will match.
    /// </summary>
    Task<IReadOnlyList<TenantApplication>> GetByCustomerAsync(Guid? customerId, Guid? userId, CancellationToken cancellationToken = default);
}
