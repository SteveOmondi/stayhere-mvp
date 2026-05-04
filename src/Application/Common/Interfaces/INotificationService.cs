namespace StayHere.Application.Common.Interfaces;

public interface INotificationService
{
    Task SendEmailAsync(string to, string subject, string body);
    Task<bool> SendSmsAsync(string to, string message);
    Task SendWhatsAppAsync(string to, string message);
}
