namespace StayHere.Domain.Entities;

public class PropertyOwner
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public Guid WalletId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
