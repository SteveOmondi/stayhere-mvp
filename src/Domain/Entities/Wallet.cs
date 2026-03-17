namespace StayHere.Domain.Entities;

public class Wallet
{
    public Guid Id { get; set; }
    public Guid PropertyOwnerId { get; set; }
    public decimal Balance { get; set; }
    public string Currency { get; set; } = "KES";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
