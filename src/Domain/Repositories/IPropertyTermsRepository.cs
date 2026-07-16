using StayHere.Domain.Entities;

namespace StayHere.Domain.Repositories;

public interface IPropertyTermsRepository
{
    Task<PropertyTerms?> GetActiveByListingIdAsync(Guid listingId);
    Task<IReadOnlyDictionary<Guid, PropertyTerms>> GetActiveByListingIdsAsync(IEnumerable<Guid> listingIds);
    Task CreateAsync(PropertyTerms terms);
    Task UpdateAsync(PropertyTerms terms);
}
