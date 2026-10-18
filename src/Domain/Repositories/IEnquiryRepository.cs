using StayHere.Domain.Entities;

namespace StayHere.Domain.Repositories;

/// <summary>
/// Sage's own data-access path to enquiries - separate from EnquiryFunctions' direct DbContext
/// use (same split already established for ViewingBooking/SavedListing: the Function endpoints
/// and the agent tool executor are two different callers with two different access patterns).
/// </summary>
public interface IEnquiryRepository
{
    /// <summary>Matches CustomerId against both a Customer's primary key and its UserId - same
    /// dual-match rationale as IViewingBookingRepository.GetByCustomerAsync.</summary>
    Task<Enquiry?> FindByListingAndCustomerAsync(Guid listingId, Guid? customerId, Guid? userId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Enquiry>> GetByCustomerAsync(Guid? customerId, Guid? userId, CancellationToken cancellationToken = default);

    Task CreateAsync(Enquiry enquiry, CancellationToken cancellationToken = default);

    Task UpdateAsync(Enquiry enquiry, CancellationToken cancellationToken = default);

    Task AddMessageAsync(EnquiryMessage message, CancellationToken cancellationToken = default);

    /// <summary>One grouped query for the whole list - never N+1. Counts messages from the Owner
    /// side that are newer than each enquiry's CustomerLastReadAt.</summary>
    Task<IReadOnlyDictionary<Guid, int>> CountUnreadForCustomerAsync(IReadOnlyCollection<Guid> enquiryIds, CancellationToken cancellationToken = default);
}
