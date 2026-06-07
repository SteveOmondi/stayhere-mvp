namespace StayHere.Application.StaticData.Models;

public record CreateRoleDefinitionRequest(string Name, string? Description);

public record RoleDefinitionDto(Guid Id, string Name, string? Description, bool IsSystem, DateTime? CreatedAt);

public record CreateUserTypeDefinitionRequest(string Name, string? Description);

public record UserTypeDefinitionDto(Guid Id, string Name, string? Description, bool IsSystem, DateTime? CreatedAt);
