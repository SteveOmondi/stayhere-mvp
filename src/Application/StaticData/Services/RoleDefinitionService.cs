using StayHere.Application.Common.Interfaces;
using StayHere.Application.StaticData.Models;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Application.StaticData.Services;

public class RoleDefinitionService : IRoleDefinitionService
{
    private readonly IRoleDefinitionRepository _repo;

    public RoleDefinitionService(IRoleDefinitionRepository repo) => _repo = repo;

    public async Task<IEnumerable<RoleDefinitionDto>> GetAllRolesAsync()
    {
        // Merge system enum roles + DB-stored custom roles
        var systemRoles = Enum.GetNames(typeof(UserRole))
            .Select(name => new RoleDefinitionDto(Guid.Empty, name, null, true, null));

        var customRoles = (await _repo.GetAllAsync())
            .Select(r => new RoleDefinitionDto(r.Id, r.Name, r.Description, false, r.CreatedAt));

        return systemRoles.Concat(customRoles);
    }

    public async Task<RoleDefinitionDto> CreateRoleAsync(CreateRoleDefinitionRequest request)
    {
        var entity = new RoleDefinition
        {
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
        };
        var created = await _repo.CreateAsync(entity);
        return new RoleDefinitionDto(created.Id, created.Name, created.Description, false, created.CreatedAt);
    }
}
