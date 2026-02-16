using StayHere.Application.Properties.Models;

namespace StayHere.Application.Common.Interfaces;

public interface IPropertyService
{
    Task<PropertyDto> CreatePropertyAsync(Guid ownerId, CreatePropertyRequest request);
    Task<PropertyDto?> GetPropertyAsync(Guid id);
    Task<IEnumerable<PropertyDto>> GetOwnerPortfolioAsync(Guid ownerId);
}
