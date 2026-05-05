using System.Text.Json.Serialization;

namespace StayHere.Application.Authentication.Models;

public class OtpResponse
{
    public bool Succeeded { get; set; }
    public string Message { get; set; } = string.Empty;

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Otp { get; set; } // Only populated in Test mode
}
