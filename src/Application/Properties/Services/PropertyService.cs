using StayHere.Application.Common.Interfaces;
using StayHere.Application.Properties.Models;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Application.Properties.Services;

public class PropertyService : IPropertyService
{
    private readonly IPropertyRepository _propertyRepository;
    private readonly IPropertyAttributeRepository _attributeRepository;
    private readonly ICacheService _cacheService;

    public PropertyService(
        IPropertyRepository propertyRepository,
        IPropertyAttributeRepository attributeRepository,
        ICacheService cacheService)
    {
        _propertyRepository = propertyRepository;
        _attributeRepository = attributeRepository;
        _cacheService = cacheService;
    }

    public async Task<PropertyDto> CreatePropertyAsync(Guid ownerId, CreatePropertyRequest request)
    {
        var property = new Property
        {
            Id = Guid.NewGuid(),
            OwnerId = ownerId,
            Title = request.Title,
            Description = request.Description,
            Address = new Address(
                request.Address.Street,
                request.Address.City,
                request.Address.State,
                request.Address.PostalCode,
                request.Address.Country
            ),
            Status = PropertyStatus.PendingVerification,
            Type = MapPropertyType(request.Type),
            MonthlyRent = request.MonthlyRent,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _propertyRepository.CreateAsync(property);

        var attributes = new PropertyAttribute
        {
            PropertyId = property.Id.ToString(),
            Attributes = request.Attributes ?? new(),
            Amenities = request.Amenities ?? new()
        };

        await _attributeRepository.UpsertAsync(attributes);

        return MapToDto(property, attributes);
    }

    public async Task<PropertyDto?> GetPropertyAsync(Guid id)
    {
        var property = await _propertyRepository.GetByIdAsync(id);
        if (property == null) return null;

        var attributes = await _attributeRepository.GetByPropertyIdAsync(id);
        return MapToDto(property, attributes);
    }

    public async Task<IEnumerable<PropertyDto>> GetOwnerPortfolioAsync(Guid ownerId)
    {
        var cacheKey = $"portfolio_{ownerId}";
        var cachedPortfolio = await _cacheService.GetAsync<IEnumerable<PropertyDto>>(cacheKey);
        
        if (cachedPortfolio != null)
        {
            return cachedPortfolio;
        }

        var properties = await _propertyRepository.GetByOwnerIdAsync(ownerId);
        var dtos = new List<PropertyDto>();

        foreach (var property in properties)
        {
            var attributes = await _attributeRepository.GetByPropertyIdAsync(property.Id);
            dtos.Add(MapToDto(property, attributes));
        }

        await _cacheService.SetAsync(cacheKey, dtos, TimeSpan.FromMinutes(30));
        
        return dtos;
    }

    private PropertyDto MapToDto(Property property, PropertyAttribute? attributes)
    {
        return new PropertyDto(
            property.Id,
            property.OwnerId,
            property.Title,
            property.Description,
            new AddressDto(
                property.Address.Street,
                property.Address.City,
                property.Address.State,
                property.Address.PostalCode,
                property.Address.Country
            ),
            property.Status.ToString(),
            property.Type.ToString(),
            property.MonthlyRent,
            property.Currency,
            attributes?.Attributes ?? new(),
            attributes?.Amenities ?? new(),
            attributes?.Images.Select(i => i.Url).ToList() ?? new()
        );
    }

    private PropertyType MapPropertyType(PropertyTypeDto type) => type switch
    {
        PropertyTypeDto.Apartment => PropertyType.Apartment,
        PropertyTypeDto.House => PropertyType.House,
        PropertyTypeDto.Studio => PropertyType.Studio,
        PropertyTypeDto.Commercial => PropertyType.Commercial,
        PropertyTypeDto.Land => PropertyType.Land,
        _ => throw new ArgumentOutOfRangeException(nameof(type), type, null)
    };
}
