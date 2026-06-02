namespace StayHere.Application.Common.Interfaces;

public interface IChatService
{
    Task<string> GenerateResponseAsync(
        string prompt,
        int maxTokens = 1000,
        double temperature = 0.7,
        CancellationToken cancellationToken = default,
        string? systemPrompt = null);
}
