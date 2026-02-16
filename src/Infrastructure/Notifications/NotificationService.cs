using StayHere.Application.Common.Interfaces;

namespace StayHere.Infrastructure.Notifications;

public class NotificationService : INotificationService
{
    // These would be replaced with actual Twilio/SendGrid implementations
    public Task SendEmailAsync(string to, string subject, string body)
    {
        // Mocking email send
        Console.WriteLine($"Email sent to {to}: {subject} - {body}");
        return Task.CompletedTask;
    }

    public Task SendSmsAsync(string to, string message)
    {
        // Mocking SMS send
        Console.WriteLine($"SMS sent to {to}: {message}");
        return Task.CompletedTask;
    }

    public Task SendWhatsAppAsync(string to, string message)
    {
        // Mocking WhatsApp send
        Console.WriteLine($"WhatsApp sent to {to}: {message}");
        return Task.CompletedTask;
    }
}
