namespace StayHere.Infrastructure.Notifications.Models;

public record OnFonSmsRequest(
    string SenderId,
    List<OnFonMessageParameter> MessageParameters,
    string ApiKey,
    string ClientId);

public record OnFonMessageParameter(string Number, string Text);

public class OnFonApiResponse
{
    public int ErrorCode { get; set; }
    public string? ErrorDescription { get; set; }
    public List<OnFonSmsData>? Data { get; set; }
}

public class OnFonSmsData
{
    public string? MobileNumber { get; set; }
    public string? MessageId { get; set; }
}
