using StayHere.Application.Common.Interfaces;
using StayHere.Application.StaticData.Models;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Application.StaticData.Services;

public class UserTypeDefinitionService : IUserTypeDefinitionService
{
    private readonly IUserTypeDefinitionRepository _repo;

    public UserTypeDefinitionService(IUserTypeDefinitionRepository repo) => _repo = repo;

    public async Task<IEnumerable<UserTypeDefinitionDto>> GetAllUserTypesAsync()
    {
        var systemTypes = Enum.GetNames(typeof(UserType))
            .Select(name => new UserTypeDefinitionDto(Guid.Empty, name, null, true, null));

        var customTypes = (await _repo.GetAllAsync())
            .Select(t => new UserTypeDefinitionDto(t.Id, t.Name, t.Description, false, t.CreatedAt));

        return systemTypes.Concat(customTypes);
    }

    public async Task<UserTypeDefinitionDto> CreateUserTypeAsync(CreateUserTypeDefinitionRequest request)
    {
        var entity = new UserTypeDefinition
        {
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
        };
        var created = await _repo.CreateAsync(entity);
        return new UserTypeDefinitionDto(created.Id, created.Name, created.Description, false, created.CreatedAt);
    }
}
