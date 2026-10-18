namespace StayHere.Application.StaticData.Models;

/// <summary>
/// A placeable furniture item for the 3D/3D-Live floor plan renderer. Footprint is [width, depth]
/// in meters on the floor plane; Height is meters. Static reference data (no DB table) — mirrors
/// the validated prototype's furnitureCatalog.ts one-for-one.
///
/// The Vendor* fields below are optional and power the walkthrough's furniture vendor showcase
/// (display/affiliate only — no cart, inventory or payment): when present, the walk-mode 3D viewer
/// shows a brand/price label as the visitor approaches that item, which links out to ProductUrl.
/// Items with no vendor data (VendorName null) show no label — vendor showcase is opt-in per item.
/// </summary>
public record FurnitureCatalogItemDto(
    string Id,
    string Name,
    string Category,
    double[] Footprint,
    double Height,
    string Color,
    string Icon,
    string? VendorName = null,
    string? VendorLogoUrl = null,
    double? Price = null,
    string? Currency = null,
    string? ProductUrl = null,
    string? Sku = null
);
