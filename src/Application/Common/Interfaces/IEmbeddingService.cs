namespace StayHere.Application.Common.Interfaces;

public interface IEmbeddingService
{
    /// <summary>Produces a single embedding vector for the given text (dimension must match DB column).</summary>
    Task<float[]> EmbedAsync(string text, CancellationToken cancellationToken = default);
}
