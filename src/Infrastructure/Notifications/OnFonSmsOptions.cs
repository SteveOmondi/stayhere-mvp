namespace StayHere.Infrastructure.Notifications;

public class OnFonSmsOptions
{
    public const string SectionName = "OnFonSms";
    public string ClientId { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.onfonmedia.co.ke";
    public string SenderId { get; set; } = "STAYHERE";
}
