namespace StayHere.Domain.Entities;

public class Agent
{
    public Guid Id { get; set; }
    public Guid PropertyOwnerId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public DateTime CreatedAt { get; set; }
}
