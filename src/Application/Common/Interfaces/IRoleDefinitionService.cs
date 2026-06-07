using StayHere.Application.StaticData.Models;

namespace StayHere.Application.Common.Interfaces;

public interface IRoleDefinitionService
{
    Task<IEnumerable<RoleDefinitionDto>> GetAllRolesAsync();
    Task<RoleDefinitionDto> CreateRoleAsync(CreateRoleDefinitionRequest request);
}
