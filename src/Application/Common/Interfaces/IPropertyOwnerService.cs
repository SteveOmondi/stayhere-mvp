using StayHere.Application.PropertyOwners.Models;
using StayHere.Application.Properties.Models;

namespace StayHere.Application.Common.Interfaces;

public interface IPropertyOwnerService
{
    Task<PropertyOwnerDto> CreatePropertyOwnerAsync(CreatePropertyOwnerRequest request);
    Task<PropertyOwnerDto?> GetPropertyOwnerByIdAsync(Guid id);
    Task<PropertyOwnerDto?> GetPropertyOwnerByUserIdAsync(Guid userId);
    Task<PropertyOwnerDto?> GetPropertyOwnerByEmailAsync(string email);
    Task<PropertyOwnerDto?> UpdatePropertyOwnerAsync(Guid id, UpdatePropertyOwnerRequest request);
    Task<PaginatedResult<PropertyOwnerDto>> GetAllPropertyOwnersAsync(int page = 1, int pageSize = 20);

    Task<WalletDto?> GetWalletAsync(Guid propertyOwnerId);
    Task<WalletDto?> GetWalletByOwnerIdAsync(Guid propertyOwnerId);

    Task<IEnumerable<PropertyListDto>> GetOwnerPropertiesAsync(Guid ownerId);
    Task<PaginatedResult<ListingListDto>> GetOwnerListingsAsync(Guid ownerId, int page = 1, int pageSize = 20);

    Task<AgentDto> CreateAgentAsync(Guid propertyOwnerId, CreateAgentRequest request);
    Task<AgentDto?> GetAgentByIdAsync(Guid id);
    Task<IEnumerable<AgentDto>> GetOwnerAgentsAsync(Guid propertyOwnerId);

    Task<CaretakerDto> CreateCaretakerAsync(Guid propertyOwnerId, CreateCaretakerRequest request);
    Task<CaretakerDto?> GetCaretakerByIdAsync(Guid id);
    Task<IEnumerable<CaretakerDto>> GetOwnerCaretakersAsync(Guid propertyOwnerId);
}
