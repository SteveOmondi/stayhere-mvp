namespace StayHere.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? FullName { get; set; }
    public string? EntraObjectId { get; set; }
    public List<UserRole> Roles { get; set; } = new();
    public UserType Type { get; set; } = UserType.Individual;
    public Guid? OrganizationId { get; set; }
    public Organization? Organization { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLogin { get; set; }
}

public enum UserType
{
    Individual,
    Business
}

public enum UserRole
{
    Tenant,
    PropertyOwner,
    PropertyManager,
    CareTaker,
    Fundi,
    Admin
}
