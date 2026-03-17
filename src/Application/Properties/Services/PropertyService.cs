using StayHere.Application.Common.Interfaces;
using StayHere.Application.Properties.Models;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Application.Properties.Services;

public class PropertyService : IPropertyService
{
    private readonly IPropertyRepository _propertyRepository;

    public PropertyService(IPropertyRepository propertyRepository)
    {
        _propertyRepository = propertyRepository;
    }

    public async Task<PropertyDto> CreatePropertyAsync(Guid ownerId, CreatePropertyRequest request)
    {
        var propertyCode = await _propertyRepository.GeneratePropertyCodeAsync();

        var property = new Property
        {
            Id = Guid.NewGuid(),
            PropertyCode = propertyCode,
            BuildingName = request.BuildingName,
            Description = request.Description,
            TotalUnits = request.TotalUnits,
            TotalFloors = request.TotalFloors,
            Location = new PropertyLocation(
                request.Location.Country,
                request.Location.County,
                request.Location.City,
                request.Location.Suburb,
                request.Location.Street,
                request.Location.Latitude,
                request.Location.Longitude
            ),
            OwnerId = ownerId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _propertyRepository.CreateAsync(property);
        return MapToDto(property);
    }

    public async Task<PropertyDto?> GetPropertyByIdAsync(Guid id)
    {
        var property = await _propertyRepository.GetByIdAsync(id);
        return property == null ? null : MapToDto(property);
    }

    public async Task<PropertyDto?> GetPropertyByCodeAsync(string propertyCode)
    {
        var property = await _propertyRepository.GetByPropertyCodeAsync(propertyCode);
        return property == null ? null : MapToDto(property);
    }

    public async Task<PaginatedResult<PropertyListDto>> GetAllPropertiesAsync(int page = 1, int pageSize = 20)
    {
        var properties = await _propertyRepository.GetAllAsync(page, pageSize);
        var totalCount = await _propertyRepository.GetTotalCountAsync();
        return CreatePaginatedResult(properties, totalCount, page, pageSize);
    }

    public async Task<PaginatedResult<PropertyListDto>> GetPropertiesByOwnerAsync(Guid ownerId, int page = 1, int pageSize = 20)
    {
        var properties = await _propertyRepository.GetByOwnerIdAsync(ownerId);
        var list = properties.ToList();
        var paged = list.Skip((page - 1) * pageSize).Take(pageSize);
        return CreatePaginatedResult(paged, list.Count, page, pageSize);
    }

    public async Task<PropertyDto?> UpdatePropertyAsync(Guid id, Guid requesterId, UpdatePropertyRequest request)
    {
        var property = await _propertyRepository.GetByIdAsync(id);
        if (property == null) return null;

        if (property.OwnerId != requesterId)
            throw new UnauthorizedAccessException("You don't have permission to update this property");

        if (request.BuildingName != null) property.BuildingName = request.BuildingName;
        if (request.Description != null) property.Description = request.Description;
        if (request.TotalUnits.HasValue) property.TotalUnits = request.TotalUnits.Value;
        if (request.TotalFloors.HasValue) property.TotalFloors = request.TotalFloors.Value;
        if (request.Location != null)
        {
            property.Location = new PropertyLocation(
                request.Location.Country,
                request.Location.County,
                request.Location.City,
                request.Location.Suburb,
                request.Location.Street,
                request.Location.Latitude,
                request.Location.Longitude
            );
        }
        property.UpdatedAt = DateTime.UtcNow;

        await _propertyRepository.UpdateAsync(property);
        return MapToDto(property);
    }

    public async Task<bool> DeletePropertyAsync(Guid id, Guid requesterId)
    {
        var property = await _propertyRepository.GetByIdAsync(id);
        if (property == null) return false;

        if (property.OwnerId != requesterId)
            throw new UnauthorizedAccessException("Only the owner can delete a property");

        await _propertyRepository.DeleteAsync(id);
        return true;
    }

    private static PropertyDto MapToDto(Property property)
    {
        return new PropertyDto(
            property.Id,
            property.PropertyCode,
            property.BuildingName,
            property.Description,
            property.TotalUnits,
            property.TotalFloors,
            new LocationDto(
                property.Location.Country,
                property.Location.County,
                property.Location.City,
                property.Location.Suburb,
                property.Location.Street,
                property.Location.Latitude,
                property.Location.Longitude
            ),
            property.OwnerId,
            property.CreatedAt,
            property.UpdatedAt
        );
    }

    private static PropertyListDto MapToListDto(Property property)
    {
        return new PropertyListDto(
            property.Id,
            property.PropertyCode,
            property.BuildingName,
            property.TotalUnits,
            property.TotalFloors,
            property.Location.City,
            property.Location.County
        );
    }

    private static PaginatedResult<PropertyListDto> CreatePaginatedResult(
        IEnumerable<Property> properties, int totalCount, int page, int pageSize)
    {
        var items = properties.Select(MapToListDto);
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
        return new PaginatedResult<PropertyListDto>(items, totalCount, page, pageSize, totalPages);
    }
}
