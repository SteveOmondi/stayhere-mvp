namespace StayHere.Domain;

/// <summary>Must match Postgres column type vector(N) and the embedding model output size.</summary>
public static class StayHereEmbeddingDimensions
{
    public const int Default = 1536;
}
