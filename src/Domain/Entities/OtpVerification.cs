namespace StayHere.Domain.Entities;

public class OtpVerification
{
    public Guid Id { get; set; }
    public string Target { get; set; } = string.Empty; // Email or Phone
    public string Code { get; set; } = string.Empty;
    public DateTime Expiry { get; set; }
    public bool IsUsed { get; set; }
    public int Attempts { get; set; }
    public OtpType Type { get; set; }
}

public enum OtpType
{
    Email,
    Sms,
    WhatsApp
}
