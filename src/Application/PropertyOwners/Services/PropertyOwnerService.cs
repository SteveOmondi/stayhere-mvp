using StayHere.Application.Common.Interfaces;
using StayHere.Application.PropertyOwners.Models;
using StayHere.Application.Properties.Models;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Application.PropertyOwners.Services;

public class PropertyOwnerService : IPropertyOwnerService
{
    private readonly IPropertyOwnerRepository _ownerRepository;
    private readonly IWalletRepository _walletRepository;
    private readonly IAgentRepository _agentRepository;
    private readonly ICaretakerRepository _caretakerRepository;
    private readonly IPropertyRepository _propertyRepository;
    private readonly IListingRepository _listingRepository;

    public PropertyOwnerService(
        IPropertyOwnerRepository ownerRepository,
        IWalletRepository walletRepository,
        IAgentRepository agentRepository,
        ICaretakerRepository caretakerRepository,
        IPropertyRepository propertyRepository,
        IListingRepository listingRepository)
    {
        _ownerRepository = ownerRepository;
        _walletRepository = walletRepository;
        _agentRepository = agentRepository;
        _caretakerRepository = caretakerRepository;
        _propertyRepository = propertyRepository;
        _listingRepository = listingRepository;
    }

    public async Task<PropertyOwnerDto> CreatePropertyOwnerAsync(CreatePropertyOwnerRequest request)
    {
        var ownerId = Guid.NewGuid();
        var wallet = new Wallet
        {
            Id = Guid.NewGuid(),
            PropertyOwnerId = ownerId,
            Balance = 0,
            Currency = "KES",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _walletRepository.CreateAsync(wallet);

        var owner = new PropertyOwner
        {
            Id = ownerId,
            UserId = request.UserId,
            FullName = request.FullName,
            Phone = request.Phone,
            Email = request.Email,
            WalletId = wallet.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _ownerRepository.CreateAsync(owner);

        return MapToDto(owner, wallet);
    }

    public async Task<PropertyOwnerDto?> GetPropertyOwnerByIdAsync(Guid id)
    {
        var owner = await _ownerRepository.GetByIdAsync(id);
        if (owner == null) return null;
        var wallet = await _walletRepository.GetByIdAsync(owner.WalletId);
        return MapToDto(owner, wallet);
    }

    public async Task<PropertyOwnerDto?> GetPropertyOwnerByUserIdAsync(Guid userId)
    {
        var owner = await _ownerRepository.GetByUserIdAsync(userId);
        if (owner == null) return null;
        var wallet = await _walletRepository.GetByIdAsync(owner.WalletId);
        return MapToDto(owner, wallet);
    }

    public async Task<PropertyOwnerDto?> GetPropertyOwnerByEmailAsync(string email)
    {
        var owner = await _ownerRepository.GetByEmailAsync(email);
        if (owner == null) return null;
        var wallet = await _walletRepository.GetByIdAsync(owner.WalletId);
        return MapToDto(owner, wallet);
    }

    public async Task<PropertyOwnerDto?> UpdatePropertyOwnerAsync(Guid id, UpdatePropertyOwnerRequest request)
    {
        var owner = await _ownerRepository.GetByIdAsync(id);
        if (owner == null) return null;

        if (request.FullName != null) owner.FullName = request.FullName;
        if (request.Phone != null) owner.Phone = request.Phone;
        if (request.Email != null) owner.Email = request.Email;
        owner.UpdatedAt = DateTime.UtcNow;

        await _ownerRepository.UpdateAsync(owner);
        var wallet = await _walletRepository.GetByIdAsync(owner.WalletId);
        return MapToDto(owner, wallet);
    }

    public async Task<WalletDto?> GetWalletAsync(Guid propertyOwnerId)
    {
        var wallet = await _walletRepository.GetByOwnerIdAsync(propertyOwnerId);
        return wallet == null ? null : new WalletDto(wallet.Id, wallet.PropertyOwnerId, wallet.Balance, wallet.Currency, wallet.UpdatedAt);
    }

    public async Task<WalletDto?> GetWalletByOwnerIdAsync(Guid propertyOwnerId)
    {
        return await GetWalletAsync(propertyOwnerId);
    }

    public async Task<IEnumerable<PropertyListDto>> GetOwnerPropertiesAsync(Guid ownerId)
    {
        var properties = await _propertyRepository.GetByOwnerIdAsync(ownerId);
        return properties.Select(p => new PropertyListDto(
            p.Id,
            p.PropertyCode,
            p.BuildingName,
            p.TotalUnits,
            p.TotalFloors,
            p.Location.City,
            p.Location.County
        ));
    }

    public async Task<PaginatedResult<ListingListDto>> GetOwnerListingsAsync(Guid ownerId, int page = 1, int pageSize = 20)
    {
        var listings = await _listingRepository.GetByOwnerIdAsync(ownerId);
        var list = listings.ToList();
        var totalCount = list.Count;
        var paged = list.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        var propertyIds = paged.Select(l => l.PropertyId).Distinct().ToList();
        var properties = new Dictionary<Guid, Property>();
        foreach (var id in propertyIds)
        {
            var prop = await _propertyRepository.GetByIdAsync(id);
            if (prop != null) properties[id] = prop;
        }

        var items = paged.Select(l => new ListingListDto(
            l.Id,
            l.ListingCode,
            l.PropertyId,
            properties.GetValueOrDefault(l.PropertyId)?.BuildingName ?? "",
            l.UnitNumber,
            l.FloorNumber,
            l.Title,
            l.Price,
            l.PriceCurrency,
            l.PropertyType.ToString(),
            l.ListingType.ToString(),
            l.Bedrooms,
            l.Bathrooms,
            l.Location.City,
            l.Location.County,
            l.Images.FirstOrDefault(),
            l.AvailabilityStatus.ToString(),
            l.Views,
            l.Rating,
            l.IsFeatured,
            l.ListedDate
        ));
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
        return new PaginatedResult<ListingListDto>(items, totalCount, page, pageSize, totalPages);
    }

    public async Task<AgentDto> CreateAgentAsync(Guid propertyOwnerId, CreateAgentRequest request)
    {
        var owner = await _ownerRepository.GetByIdAsync(propertyOwnerId);
        if (owner == null)
            throw new ArgumentException("Property owner not found", nameof(propertyOwnerId));

        var agent = new Agent
        {
            Id = Guid.NewGuid(),
            PropertyOwnerId = propertyOwnerId,
            FullName = request.FullName,
            Phone = request.Phone,
            Email = request.Email,
            CreatedAt = DateTime.UtcNow
        };
        await _agentRepository.CreateAsync(agent);
        return new AgentDto(agent.Id, agent.PropertyOwnerId, agent.FullName, agent.Phone, agent.Email, agent.CreatedAt);
    }

    public async Task<AgentDto?> GetAgentByIdAsync(Guid id)
    {
        var agent = await _agentRepository.GetByIdAsync(id);
        return agent == null ? null : new AgentDto(agent.Id, agent.PropertyOwnerId, agent.FullName, agent.Phone, agent.Email, agent.CreatedAt);
    }

    public async Task<IEnumerable<AgentDto>> GetOwnerAgentsAsync(Guid propertyOwnerId)
    {
        var agents = await _agentRepository.GetByOwnerIdAsync(propertyOwnerId);
        return agents.Select(a => new AgentDto(a.Id, a.PropertyOwnerId, a.FullName, a.Phone, a.Email, a.CreatedAt));
    }

    public async Task<CaretakerDto> CreateCaretakerAsync(Guid propertyOwnerId, CreateCaretakerRequest request)
    {
        var owner = await _ownerRepository.GetByIdAsync(propertyOwnerId);
        if (owner == null)
            throw new ArgumentException("Property owner not found", nameof(propertyOwnerId));

        var caretaker = new Caretaker
        {
            Id = Guid.NewGuid(),
            PropertyOwnerId = propertyOwnerId,
            FullName = request.FullName,
            Phone = request.Phone,
            Email = request.Email,
            CreatedAt = DateTime.UtcNow
        };
        await _caretakerRepository.CreateAsync(caretaker);
        return new CaretakerDto(caretaker.Id, caretaker.PropertyOwnerId, caretaker.FullName, caretaker.Phone, caretaker.Email, caretaker.CreatedAt);
    }

    public async Task<CaretakerDto?> GetCaretakerByIdAsync(Guid id)
    {
        var caretaker = await _caretakerRepository.GetByIdAsync(id);
        return caretaker == null ? null : new CaretakerDto(caretaker.Id, caretaker.PropertyOwnerId, caretaker.FullName, caretaker.Phone, caretaker.Email, caretaker.CreatedAt);
    }

    public async Task<IEnumerable<CaretakerDto>> GetOwnerCaretakersAsync(Guid propertyOwnerId)
    {
        var caretakers = await _caretakerRepository.GetByOwnerIdAsync(propertyOwnerId);
        return caretakers.Select(c => new CaretakerDto(c.Id, c.PropertyOwnerId, c.FullName, c.Phone, c.Email, c.CreatedAt));
    }

    private static PropertyOwnerDto MapToDto(PropertyOwner owner, Wallet? wallet)
    {
        return new PropertyOwnerDto(
            owner.Id,
            owner.UserId,
            owner.FullName,
            owner.Phone,
            owner.Email,
            owner.WalletId,
            wallet?.Balance ?? 0,
            wallet?.Currency ?? "KES",
            owner.CreatedAt,
            owner.UpdatedAt
        );
    }
}
