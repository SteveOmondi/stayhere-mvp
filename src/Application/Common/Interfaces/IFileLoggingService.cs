namespace StayHere.Application.Common.Interfaces;

public interface IFileLoggingService
{
    Task AppendLogAsync(string? customerId, string content);
    Task<string> ReadLogAsync(string? customerId, string date);
}
