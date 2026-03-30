using StayHere.Application.Customers.Models;

namespace StayHere.Application.Common.Interfaces;

public interface ICustomerService
{
    Task<CustomerDto> CreateCustomerAsync(CreateCustomerRequest request);
    Task<CustomerDto?> GetCustomerByIdAsync(Guid id);
    Task<CustomerDto?> GetCustomerByPhoneAsync(string phone);
    Task<IReadOnlyList<CustomerDto>> GetCustomersByRegionAsync(Guid? countryId, Guid? cityId);
    Task<IReadOnlyList<CustomerDto>> GetCustomersByListingAsync(Guid listingId);
    Task<IReadOnlyList<CustomerDto>> GetAllCustomersAsync();
    Task<CustomerDto?> UpdateCustomerAsync(Guid id, UpdateCustomerRequest request);
    Task DeactivateCustomerAsync(Guid id);

    Task<CustomerPropertyDto> AttachPropertyAsync(Guid customerId, AttachCustomerPropertyRequest request);
    Task<IReadOnlyList<CustomerPropertyDto>> GetCustomerPropertiesAsync(Guid customerId);

    Task<DocumentDto> AddDocumentAsync(CreateDocumentRequest request);
    Task<IReadOnlyList<DocumentDto>> GetDocumentsAsync(string entityType, Guid entityId);
}

