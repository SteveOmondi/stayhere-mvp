using StayHere.Application.Common.Interfaces;
using StayHere.Application.StaticData.Models;

namespace StayHere.Application.StaticData.Services;

public class FurnitureCatalogService : IFurnitureCatalogService
{
    // Ported one-for-one from the validated prototype (D:\Projects\PropertyModelsSimulation\src\data\furnitureCatalog.ts).
    // Vendor/price/link fields on a few items below are SAMPLE placeholder data demonstrating the
    // walkthrough vendor showcase end-to-end — swap in real vendor partners before shipping this live.
    private static readonly IReadOnlyList<FurnitureCatalogItemDto> Catalog =
    [
        new("bed_double", "Double Bed", "bedroom", [1.6, 2.0], 0.55, "#F5A623", "🛏️",
            VendorName: "Homestead Furnishings", Price: 45000, Currency: "KES", ProductUrl: "https://example.com/products/double-bed", Sku: "HF-BED-DBL"),
        new("wardrobe", "Wardrobe", "bedroom", [1.2, 0.6], 1.9, "#7C6A58", "🚪"),
        new("sofa", "Sofa (3-seat)", "living", [2.0, 0.9], 0.75, "#FF6B4A", "🛋️",
            VendorName: "Nairobi Living Co.", Price: 68000, Currency: "KES", ProductUrl: "https://example.com/products/sofa-3-seat", Sku: "NLC-SOFA3"),
        new("armchair", "Armchair", "living", [0.8, 0.8], 0.75, "#E85A3B", "🪑",
            VendorName: "Nairobi Living Co.", Price: 24500, Currency: "KES", ProductUrl: "https://example.com/products/armchair", Sku: "NLC-ARM1"),
        new("coffee_table", "Coffee Table", "living", [1.0, 0.5], 0.4, "#4B5E6B", "🟫",
            VendorName: "Timber & Co", Price: 15000, Currency: "KES", ProductUrl: "https://example.com/products/coffee-table", Sku: "TCO-CT01"),
        new("tv_unit", "TV Unit", "living", [1.5, 0.4], 0.5, "#1E293B", "📺",
            VendorName: "Timber & Co", Price: 22000, Currency: "KES", ProductUrl: "https://example.com/products/tv-unit", Sku: "TCO-TVU1"),
        new("dining_table", "Dining Table", "dining", [1.6, 0.9], 0.75, "#8A6D4E", "🍽️",
            VendorName: "Timber & Co", Price: 38000, Currency: "KES", ProductUrl: "https://example.com/products/dining-table", Sku: "TCO-DT01"),
        new("dining_table_small", "Small Dining Table", "dining", [0.9, 0.9], 0.75, "#8A6D4E", "🍽️"),
        new("dining_chair", "Dining Chair", "dining", [0.45, 0.45], 0.9, "#5C4A3A", "🪑"),
        new("kitchen_counter", "Kitchen Counter", "kitchen", [2.0, 0.6], 0.9, "#94A3B8", "🧺"),
        new("fridge", "Fridge", "kitchen", [0.7, 0.7], 1.8, "#CBD5E1", "🧊",
            VendorName: "ApplianceHub", Price: 72000, Currency: "KES", ProductUrl: "https://example.com/products/fridge", Sku: "AHB-FRG1"),
        new("stove", "Stove", "kitchen", [0.6, 0.6], 0.9, "#334155", "🔥",
            VendorName: "ApplianceHub", Price: 31000, Currency: "KES", ProductUrl: "https://example.com/products/stove", Sku: "AHB-STV1"),
        new("toilet", "Toilet", "bathroom", [0.4, 0.6], 0.4, "#F8FAFC", "🚽"),
        new("bathroom_sink", "Bathroom Sink", "bathroom", [0.5, 0.4], 0.85, "#F8FAFC", "🚰"),
        new("shower", "Shower", "bathroom", [0.9, 0.9], 2.0, "#B9D6E0", "🚿"),
    ];

    public IReadOnlyList<FurnitureCatalogItemDto> GetCatalog() => Catalog;
}
