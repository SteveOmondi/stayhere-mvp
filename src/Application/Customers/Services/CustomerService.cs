using System.Security.Cryptography;
using System.Text;
using StayHere.Application.Common.Interfaces;
using StayHere.Application.Customers.Models;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Application.Customers.Services;

public class CustomerService : ICustomerService
{
    private readonly ICustomerRepository _customerRepository;
    private readonly IDocumentRepository _documentRepository;

    public CustomerService(ICustomerRepository customerRepository, IDocumentRepository documentRepository)
    {
        _customerRepository = customerRepository;
        _documentRepository = documentRepository;
    }

    public async Task<CustomerDto> CreateCustomerAsync(CreateCustomerRequest request)
    {
        var now = DateTime.UtcNow;
        var customer = new Customer
        {
            Id = Guid.NewGuid(),
            Email = request.Email,
            Phone = request.Phone,
            FirstName = request.FirstName,
            LastName = request.LastName,
            DisplayName = request.DisplayName,
            CountryId = request.CountryId,
            CityId = request.CityId,
            PreferredLanguage = request.PreferredLanguage,
            PreferredCurrency = request.PreferredCurrency,
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await _customerRepository.AddAsync(customer);
        return MapToDto(created);
    }

    public async Task<CustomerDto?> GetCustomerByIdAsync(Guid id)
    {
        var customer = await _customerRepository.GetByIdAsync(id);
        return customer is null ? null : MapToDto(customer);
    }

    public async Task<CustomerDto?> GetCustomerByPhoneAsync(string phone)
    {
        var customer = await _customerRepository.GetByPhoneAsync(phone);
        return customer is null ? null : MapToDto(customer);
    }

    public async Task<IReadOnlyList<CustomerDto>> GetCustomersByRegionAsync(Guid? countryId, Guid? cityId)
    {
        var customers = await _customerRepository.GetByRegionAsync(countryId, cityId);
        return customers.Select(MapToDto).ToList();
    }

    public async Task<IReadOnlyList<CustomerDto>> GetCustomersByListingAsync(Guid listingId)
    {
        var customers = await _customerRepository.GetByListingAsync(listingId);
        return customers.Select(MapToDto).ToList();
    }

    public async Task<CustomerDto?> UpdateCustomerAsync(Guid id, UpdateCustomerRequest request)
    {
        var customer = await _customerRepository.GetByIdAsync(id);
        if (customer is null) return null;

        customer.FirstName = request.FirstName ?? customer.FirstName;
        customer.LastName = request.LastName ?? customer.LastName;
        customer.DisplayName = request.DisplayName ?? customer.DisplayName;
        customer.CountryId = request.CountryId ?? customer.CountryId;
        customer.CityId = request.CityId ?? customer.CityId;
        customer.AddressLine = request.AddressLine ?? customer.AddressLine;
        customer.DateOfBirth = request.DateOfBirth ?? customer.DateOfBirth;
        customer.IdType = request.IdType ?? customer.IdType;
        if (!string.IsNullOrEmpty(request.IdNumber))
        {
            customer.IdNumberEncrypted = Encrypt(request.IdNumber);
        }
        customer.PreferredLanguage = request.PreferredLanguage ?? customer.PreferredLanguage;
        customer.PreferredCurrency = request.PreferredCurrency ?? customer.PreferredCurrency;
        customer.ProfilePhotoUrl = request.ProfilePhotoUrl ?? customer.ProfilePhotoUrl;
        customer.NotificationPreferencesJson = request.NotificationPreferencesJson ?? customer.NotificationPreferencesJson;
        customer.UpdatedAt = DateTime.UtcNow;

        await _customerRepository.UpdateAsync(customer);
        return MapToDto(customer);
    }

    public Task DeactivateCustomerAsync(Guid id) => _customerRepository.DeactivateAsync(id);

    public async Task<CustomerPropertyDto> AttachPropertyAsync(Guid customerId, AttachCustomerPropertyRequest request)
    {
        var customer = await _customerRepository.GetByIdAsync(customerId) ?? throw new InvalidOperationException("Customer not found");

        var now = DateTime.UtcNow;
        var cp = new CustomerProperty
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            ListingId = request.ListingId,
            RelationshipType = request.RelationshipType,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            AgreedPrice = request.AgreedPrice,
            Currency = request.Currency,
            UnitNumber = request.UnitNumber,
            FloorNumber = request.FloorNumber,
            Notes = request.Notes,
            CreatedAt = now,
            UpdatedAt = now
        };

        customer.Properties.Add(cp);
        customer.UpdatedAt = now;
        await _customerRepository.UpdateAsync(customer);

        return MapToDto(cp);
    }

    public async Task<IReadOnlyList<CustomerPropertyDto>> GetCustomerPropertiesAsync(Guid customerId)
    {
        var customer = await _customerRepository.GetByIdAsync(customerId);
        if (customer is null) return Array.Empty<CustomerPropertyDto>();

        return customer.Properties.Select(MapToDto).ToList();
    }

    public async Task<DocumentDto> AddDocumentAsync(CreateDocumentRequest request)
    {
        var document = new Document
        {
            Id = Guid.NewGuid(),
            EntityType = request.EntityType,
            EntityId = request.EntityId,
            DocumentType = request.DocumentType,
            FileUrl = request.FileUrl,
            UploadedAt = DateTime.UtcNow
        };

        var created = await _documentRepository.AddAsync(document);
        return MapToDto(created);
    }

    public async Task<IReadOnlyList<DocumentDto>> GetDocumentsAsync(string entityType, Guid entityId)
    {
        var docs = await _documentRepository.GetByEntityAsync(entityType, entityId);
        return docs.Select(MapToDto).ToList();
    }

    private static CustomerDto MapToDto(Customer c) =>
        new(
            c.Id,
            c.Email,
            c.Phone,
            c.FirstName,
            c.LastName,
            c.DisplayName,
            c.CountryId,
            c.CityId,
            c.AddressLine,
            c.DateOfBirth,
            c.IdType,
            c.KycStatus,
            c.PreferredLanguage,
            c.PreferredCurrency,
            c.ProfilePhotoUrl,
            c.NotificationPreferencesJson,
            c.AccountStatus,
            c.CreatedAt,
            c.UpdatedAt,
            c.LastLoginAt);

    private static CustomerPropertyDto MapToDto(CustomerProperty p) =>
        new(
            p.Id,
            p.ListingId,
            p.RelationshipType,
            p.StartDate,
            p.EndDate,
            p.AgreedPrice,
            p.Currency,
            p.UnitNumber,
            p.FloorNumber,
            p.Notes);

    private static DocumentDto MapToDto(Document d) =>
        new(
            d.Id,
            d.EntityType,
            d.EntityId,
            d.DocumentType,
            d.FileUrl,
            d.UploadedAt);

    // Very simple reversible "encryption" placeholder. Replace with a proper key management solution.
    private static string Encrypt(string value)
    {
        var bytes = Encoding.UTF8.GetBytes(value);
        return Convert.ToBase64String(SHA256.HashData(bytes));
    }
}

