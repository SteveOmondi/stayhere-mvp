using StayHere.Application.StaticData.Models;

namespace StayHere.Application.Common.Interfaces;

public interface IUserTypeDefinitionService
{
    Task<IEnumerable<UserTypeDefinitionDto>> GetAllUserTypesAsync();
    Task<UserTypeDefinitionDto> CreateUserTypeAsync(CreateUserTypeDefinitionRequest request);
}
