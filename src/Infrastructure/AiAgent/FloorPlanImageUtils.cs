using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;
using StayHere.Application.Common.Interfaces;

namespace StayHere.Infrastructure.AiAgent;

/// <summary>
/// Image-geometry helpers shared by every <see cref="IFloorPlanAnalysisService"/> implementation
/// (Gemini, Qwen/Groq, ...) - the per-room cropping and opening-deduplication logic is provider-
/// agnostic, so it lives here once rather than being copy-pasted (and risking silent divergence)
/// into each new provider added as a fallback.
/// </summary>
internal static class FloorPlanImageUtils
{
    public const int CropTargetLongSidePx = 900;
    public const double DedupeDistanceFraction = 0.03;

    public static (int Left, int Top, int Width, int Height) ComputeRoomCropRect(FloorPlanAnalysisRoom room, int imageWidth, int imageHeight)
    {
        var minXFrac = room.Points.Min(p => p[0]);
        var maxXFrac = room.Points.Max(p => p[0]);
        var minYFrac = room.Points.Min(p => p[1]);
        var maxYFrac = room.Points.Max(p => p[1]);

        var bboxLeft = minXFrac * imageWidth;
        var bboxTop = minYFrac * imageHeight;
        var bboxWidth = (maxXFrac - minXFrac) * imageWidth;
        var bboxHeight = (maxYFrac - minYFrac) * imageHeight;

        const double padFraction = 0.3;
        const double minPadPx = 100;
        var padX = Math.Max(bboxWidth * padFraction, minPadPx);
        var padY = Math.Max(bboxHeight * padFraction, minPadPx);

        var left = (int)Math.Max(0, Math.Floor(bboxLeft - padX));
        var top = (int)Math.Max(0, Math.Floor(bboxTop - padY));
        var right = (int)Math.Min(imageWidth, Math.Ceiling(bboxLeft + bboxWidth + padX));
        var bottom = (int)Math.Min(imageHeight, Math.Ceiling(bboxTop + bboxHeight + padY));

        return (left, top, Math.Max(1, right - left), Math.Max(1, bottom - top));
    }

    public static byte[] BuildRoomCrop(Image<Rgba32> source, (int Left, int Top, int Width, int Height) rect)
    {
        using var crop = source.Clone(ctx => ctx.Crop(new Rectangle(rect.Left, rect.Top, rect.Width, rect.Height)));

        var longSide = Math.Max(rect.Width, rect.Height);
        if (longSide < CropTargetLongSidePx)
        {
            var scale = (double)CropTargetLongSidePx / longSide;
            crop.Mutate(ctx => ctx.Resize((int)Math.Round(rect.Width * scale), (int)Math.Round(rect.Height * scale)));
        }

        using var ms = new MemoryStream();
        crop.Save(ms, new PngEncoder());
        return ms.ToArray();
    }

    /// <summary>
    /// Detects a self-intersecting ("bowtie") room polygon - vertices returned out of proper
    /// boundary-walking order. An SVG &lt;polygon&gt; renders these with big chunks of the shape
    /// unfilled under the default nonzero fill-rule (the crossing cancels out), while the shoelace
    /// area formula still happily returns a plausible-looking non-zero number - so a room can look
    /// completely correct in a room list (sane area) while rendering as an invisible/broken outline
    /// on the actual image. Diagnostic only for now: logged, not auto-corrected, since a "fix" that
    /// reorders points (e.g. by angle around the centroid) would also distort a legitimately
    /// concave L-shaped room that just happens not to be star-shaped from its own centroid.
    /// </summary>
    public static bool IsSelfIntersecting(List<double[]> points)
    {
        var n = points.Count;
        if (n < 4) return false; // a triangle can never self-intersect

        for (var i = 0; i < n; i++)
        {
            var a1 = points[i];
            var a2 = points[(i + 1) % n];
            for (var j = i + 1; j < n; j++)
            {
                if (j == i || j == (i + 1) % n || (j + 1) % n == i) continue; // adjacent edges share a vertex
                if (SegmentsProperlyIntersect(a1, a2, points[j], points[(j + 1) % n]))
                    return true;
            }
        }

        return false;
    }

    private static bool SegmentsProperlyIntersect(double[] p1, double[] p2, double[] p3, double[] p4)
    {
        var d1 = Cross(p3, p4, p1);
        var d2 = Cross(p3, p4, p2);
        var d3 = Cross(p1, p2, p3);
        var d4 = Cross(p1, p2, p4);
        return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
    }

    private static double Cross(double[] a, double[] b, double[] c) =>
        (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

    public static List<FloorPlanAnalysisOpening> DedupeOpenings(List<FloorPlanAnalysisOpening> openings)
    {
        var kept = new List<FloorPlanAnalysisOpening>();
        foreach (var opening in openings)
        {
            var matchIndex = kept.FindIndex(k =>
                k.Type == opening.Type &&
                Math.Sqrt(Math.Pow(k.Point[0] - opening.Point[0], 2) + Math.Pow(k.Point[1] - opening.Point[1], 2)) < DedupeDistanceFraction);

            if (matchIndex >= 0)
            {
                var match = kept[matchIndex];
                kept[matchIndex] = match with
                {
                    Point = [(match.Point[0] + opening.Point[0]) / 2, (match.Point[1] + opening.Point[1]) / 2]
                };
            }
            else
            {
                kept.Add(opening);
            }
        }
        return kept;
    }
}
