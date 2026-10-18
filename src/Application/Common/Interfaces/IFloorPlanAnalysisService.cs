namespace StayHere.Application.Common.Interfaces;

/// <summary>One room's AI-traced outline, in FRACTION coordinates (0-1) of the source image's width/height.</summary>
public record FloorPlanAnalysisRoom(string Label, List<double[]> Points, string? DimensionText = null);

/// <summary>One detected door/window symbol, point in FRACTION coordinates (0-1) of the source image.</summary>
public record FloorPlanAnalysisOpening(double[] Point, string Type, string? Room = null);

/// <summary>
/// Raw AI draft of a floor plan image — fraction coordinates, not yet converted to real-world
/// meters (the caller does that once it knows the image's pixel dimensions and has resolved a
/// scale, e.g. from the listing's own known size).
/// </summary>
public record FloorPlanAnalysisResult(
    List<FloorPlanAnalysisRoom> Rooms,
    List<FloorPlanAnalysisOpening> Openings,
    string? OverallStatedSize,
    double? EstimatedTotalWidthMeters
);

/// <summary>
/// Analyzes an uploaded floor plan image with a vision-capable LLM: traces room polygons and
/// finds door/window drafting symbols. Implementations should never invent rooms/openings they
/// can't actually see — a human always reviews the result before it's saved to a Listing.
/// </summary>
public interface IFloorPlanAnalysisService
{
    Task<FloorPlanAnalysisResult> AnalyzeAsync(byte[] imageBytes, string mimeType, CancellationToken cancellationToken = default);
}
