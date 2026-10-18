using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace StayHere.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddListingTenureAndRefreshTaxonomy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "tenure",
                table: "listings",
                type: "text",
                nullable: true);

            // Deactivate (not delete - no FK constraint exists, avoids orphaning any listing that
            // already references these) the original placeholder taxonomy in favor of the fixed
            // classification below. EF's diff doesn't emit this on its own since it only detects
            // row-shape changes it can trace as Insert/Update/Delete against HasData identity, not
            // a scalar flip like this reliably in every case - added by hand.
            migrationBuilder.UpdateData(
                table: "categories",
                keyColumn: "id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "is_active",
                value: false);

            migrationBuilder.UpdateData(
                table: "categories",
                keyColumn: "id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                column: "is_active",
                value: false);

            migrationBuilder.InsertData(
                table: "categories",
                columns: new[] { "id", "created_at", "description", "icon_url", "is_active", "name", "slug", "sort_order", "updated_at" },
                values: new object[,]
                {
                    { new Guid("a1000000-0000-0000-0000-000000000001"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Homes and living spaces", null, true, "Residential", "residential", 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("a1000000-0000-0000-0000-000000000002"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Spaces designed for administrative work, professional services, and desk operations", null, true, "Office", "office", 2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("a1000000-0000-0000-0000-000000000003"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Spaces optimized for customer foot traffic, trading, displays, and sales", null, true, "Commercial & Retail", "commercial-retail", 3, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("a1000000-0000-0000-0000-000000000004"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Facilities dedicated to inventory storage, logistics, cold chains, and distribution", null, true, "Industrial & Storage", "industrial-storage", 4, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("a1000000-0000-0000-0000-000000000005"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Versatile, specialized, or hourly-rented commercial assets", null, true, "Flexible Spaces", "flexible-spaces", 5, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.InsertData(
                table: "subcategories",
                columns: new[] { "id", "category_id", "city", "country", "created_at", "description", "icon_url", "is_active", "name", "slug", "sort_order", "updated_at" },
                values: new object[,]
                {
                    { new Guid("b1000000-0000-0000-0000-000000000101"), new Guid("a1000000-0000-0000-0000-000000000001"), "", "", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Open-plan unit combining living, sleeping, and kitchenette", null, true, "Studio Apartment", "studio-apartment", 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("b1000000-0000-0000-0000-000000000102"), new Guid("a1000000-0000-0000-0000-000000000001"), "", "", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Compact unit with shared or integrated basic facilities", null, true, "Bedsitter / Single Room", "bedsitter-single-room", 2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("b1000000-0000-0000-0000-000000000103"), new Guid("a1000000-0000-0000-0000-000000000001"), "", "", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "1 enclosed bedroom + living area", null, true, "1-Bedroom Apartment", "1-bedroom-apartment", 3, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("b1000000-0000-0000-0000-000000000104"), new Guid("a1000000-0000-0000-0000-000000000001"), "", "", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "2 enclosed bedrooms + living area", null, true, "2-Bedroom Apartment", "2-bedroom-apartment", 4, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("b1000000-0000-0000-0000-000000000105"), new Guid("a1000000-0000-0000-0000-000000000001"), "", "", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "3 or more enclosed bedrooms", null, true, "3+ Bedroom Apartment", "3-plus-bedroom-apartment", 5, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("b1000000-0000-0000-0000-000000000106"), new Guid("a1000000-0000-0000-0000-000000000001"), "", "", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Top-floor luxury unit with custom layout or terrace", null, true, "Penthouse", "penthouse", 6, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("b1000000-0000-0000-0000-000000000107"), new Guid("a1000000-0000-0000-0000-000000000001"), "", "", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Single-story standalone house", null, true, "Bungalow", "bungalow", 7, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("b1000000-0000-0000-0000-000000000108"), new Guid("a1000000-0000-0000-0000-000000000001"), "", "", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Two-story residential unit, often in a compound or town block", null, true, "Maisonette", "maisonette", 8, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("b1000000-0000-0000-0000-000000000109"), new Guid("a1000000-0000-0000-0000-000000000001"), "", "", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Multi-story attached or detached family home", null, true, "Townhouse / Villa", "townhouse-villa", 9, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("b1000000-0000-0000-0000-000000000201"), new Guid("a1000000-0000-0000-0000-000000000002"), "", "", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Enclosed, dedicated workspace for a team or business", null, true, "Private Office Suite", "private-office-suite", 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("b1000000-0000-0000-0000-000000000202"), new Guid("a1000000-0000-0000-0000-000000000002"), "", "", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Full or partial open floor plate for custom fit-out", null, true, "Open-Plan Office Floor", "open-plan-office-floor", 2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("b1000000-0000-0000-0000-000000000203"), new Guid("a1000000-0000-0000-0000-000000000002"), "", "", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Dedicated desk or hot-desk space", null, true, "Shared Workspace / Co-Working Desk", "shared-workspace-co-working-desk", 3, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("b1000000-0000-0000-0000-000000000204"), new Guid("a1000000-0000-0000-0000-000000000002"), "", "", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Bookable collaborative rooms or boardrooms", null, true, "Meeting & Conference Room", "meeting-conference-room", 4, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("b1000000-0000-0000-0000-000000000301"), new Guid("a1000000-0000-0000-0000-000000000003"), "", "", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Street-facing or prime lobby commercial store", null, true, "Ground-Floor Shop", "ground-floor-shop", 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("b1000000-0000-0000-0000-000000000302"), new Guid("a1000000-0000-0000-0000-000000000003"), "", "", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Small-footprint retail pod or market stall", null, true, "Stall / Kiosk", "stall-kiosk", 2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("b1000000-0000-0000-0000-000000000303"), new Guid("a1000000-0000-0000-0000-000000000003"), "", "", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Large open display space for vehicles, furniture, or heavy inventory", null, true, "Showroom", "showroom", 3, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("b1000000-0000-0000-0000-000000000304"), new Guid("a1000000-0000-0000-0000-000000000003"), "", "", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Multi-tenant commercial complex or shopping arcade block", null, true, "Commercial Building / Arcade", "commercial-building-arcade", 4, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("b1000000-0000-0000-0000-000000000401"), new Guid("a1000000-0000-0000-0000-000000000004"), "", "", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Large industrial space for logistics, general storage, or light manufacturing", null, true, "Go-Down / Warehouse", "go-down-warehouse", 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("b1000000-0000-0000-0000-000000000402"), new Guid("a1000000-0000-0000-0000-000000000004"), "", "", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Small-to-medium lock-up unit for general or personal inventory", null, true, "Store Room / Self-Storage", "store-room-self-storage", 2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("b1000000-0000-0000-0000-000000000403"), new Guid("a1000000-0000-0000-0000-000000000004"), "", "", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Temperature-controlled facility for perishables and pharmaceuticals", null, true, "Refrigerated Storage / Cold Room", "refrigerated-storage-cold-room", 3, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("b1000000-0000-0000-0000-000000000404"), new Guid("a1000000-0000-0000-0000-000000000004"), "", "", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Specialized storage compliant with dangerous goods handling", null, true, "Hazardous Materials (HazMat) Unit", "hazmat-unit", 4, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("b1000000-0000-0000-0000-000000000405"), new Guid("a1000000-0000-0000-0000-000000000004"), "", "", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Customs-controlled secure storage", null, true, "Bonded Warehouse", "bonded-warehouse", 5, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("b1000000-0000-0000-0000-000000000501"), new Guid("a1000000-0000-0000-0000-000000000005"), "", "", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Banquet halls, event grounds, and pop-up venues", null, true, "Event & Function Space", "event-function-space", 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("b1000000-0000-0000-0000-000000000502"), new Guid("a1000000-0000-0000-0000-000000000005"), "", "", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Delivery-only commercial cooking facility", null, true, "Cloud Kitchen", "cloud-kitchen", 2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("b1000000-0000-0000-0000-000000000503"), new Guid("a1000000-0000-0000-0000-000000000005"), "", "", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Fulfillment-only mini-hub for rapid e-commerce/grocery delivery", null, true, "Dark Store", "dark-store", 3, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("b1000000-0000-0000-0000-000000000504"), new Guid("a1000000-0000-0000-0000-000000000005"), "", "", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Rented vehicle parking slot or private lock-up garage", null, true, "Parking Bay & Garage", "parking-bay-garage", 4, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.CreateIndex(
                name: "IX_listings_tenure",
                table: "listings",
                column: "tenure");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_listings_tenure",
                table: "listings");

            migrationBuilder.DeleteData(
                table: "categories",
                keyColumn: "id",
                keyValue: new Guid("a1000000-0000-0000-0000-000000000001"));

            migrationBuilder.DeleteData(
                table: "categories",
                keyColumn: "id",
                keyValue: new Guid("a1000000-0000-0000-0000-000000000002"));

            migrationBuilder.DeleteData(
                table: "categories",
                keyColumn: "id",
                keyValue: new Guid("a1000000-0000-0000-0000-000000000003"));

            migrationBuilder.DeleteData(
                table: "categories",
                keyColumn: "id",
                keyValue: new Guid("a1000000-0000-0000-0000-000000000004"));

            migrationBuilder.DeleteData(
                table: "categories",
                keyColumn: "id",
                keyValue: new Guid("a1000000-0000-0000-0000-000000000005"));

            migrationBuilder.DeleteData(
                table: "subcategories",
                keyColumn: "id",
                keyValue: new Guid("b1000000-0000-0000-0000-000000000101"));

            migrationBuilder.DeleteData(
                table: "subcategories",
                keyColumn: "id",
                keyValue: new Guid("b1000000-0000-0000-0000-000000000102"));

            migrationBuilder.DeleteData(
                table: "subcategories",
                keyColumn: "id",
                keyValue: new Guid("b1000000-0000-0000-0000-000000000103"));

            migrationBuilder.DeleteData(
                table: "subcategories",
                keyColumn: "id",
                keyValue: new Guid("b1000000-0000-0000-0000-000000000104"));

            migrationBuilder.DeleteData(
                table: "subcategories",
                keyColumn: "id",
                keyValue: new Guid("b1000000-0000-0000-0000-000000000105"));

            migrationBuilder.DeleteData(
                table: "subcategories",
                keyColumn: "id",
                keyValue: new Guid("b1000000-0000-0000-0000-000000000106"));

            migrationBuilder.DeleteData(
                table: "subcategories",
                keyColumn: "id",
                keyValue: new Guid("b1000000-0000-0000-0000-000000000107"));

            migrationBuilder.DeleteData(
                table: "subcategories",
                keyColumn: "id",
                keyValue: new Guid("b1000000-0000-0000-0000-000000000108"));

            migrationBuilder.DeleteData(
                table: "subcategories",
                keyColumn: "id",
                keyValue: new Guid("b1000000-0000-0000-0000-000000000109"));

            migrationBuilder.DeleteData(
                table: "subcategories",
                keyColumn: "id",
                keyValue: new Guid("b1000000-0000-0000-0000-000000000201"));

            migrationBuilder.DeleteData(
                table: "subcategories",
                keyColumn: "id",
                keyValue: new Guid("b1000000-0000-0000-0000-000000000202"));

            migrationBuilder.DeleteData(
                table: "subcategories",
                keyColumn: "id",
                keyValue: new Guid("b1000000-0000-0000-0000-000000000203"));

            migrationBuilder.DeleteData(
                table: "subcategories",
                keyColumn: "id",
                keyValue: new Guid("b1000000-0000-0000-0000-000000000204"));

            migrationBuilder.DeleteData(
                table: "subcategories",
                keyColumn: "id",
                keyValue: new Guid("b1000000-0000-0000-0000-000000000301"));

            migrationBuilder.DeleteData(
                table: "subcategories",
                keyColumn: "id",
                keyValue: new Guid("b1000000-0000-0000-0000-000000000302"));

            migrationBuilder.DeleteData(
                table: "subcategories",
                keyColumn: "id",
                keyValue: new Guid("b1000000-0000-0000-0000-000000000303"));

            migrationBuilder.DeleteData(
                table: "subcategories",
                keyColumn: "id",
                keyValue: new Guid("b1000000-0000-0000-0000-000000000304"));

            migrationBuilder.DeleteData(
                table: "subcategories",
                keyColumn: "id",
                keyValue: new Guid("b1000000-0000-0000-0000-000000000401"));

            migrationBuilder.DeleteData(
                table: "subcategories",
                keyColumn: "id",
                keyValue: new Guid("b1000000-0000-0000-0000-000000000402"));

            migrationBuilder.DeleteData(
                table: "subcategories",
                keyColumn: "id",
                keyValue: new Guid("b1000000-0000-0000-0000-000000000403"));

            migrationBuilder.DeleteData(
                table: "subcategories",
                keyColumn: "id",
                keyValue: new Guid("b1000000-0000-0000-0000-000000000404"));

            migrationBuilder.DeleteData(
                table: "subcategories",
                keyColumn: "id",
                keyValue: new Guid("b1000000-0000-0000-0000-000000000405"));

            migrationBuilder.DeleteData(
                table: "subcategories",
                keyColumn: "id",
                keyValue: new Guid("b1000000-0000-0000-0000-000000000501"));

            migrationBuilder.DeleteData(
                table: "subcategories",
                keyColumn: "id",
                keyValue: new Guid("b1000000-0000-0000-0000-000000000502"));

            migrationBuilder.DeleteData(
                table: "subcategories",
                keyColumn: "id",
                keyValue: new Guid("b1000000-0000-0000-0000-000000000503"));

            migrationBuilder.DeleteData(
                table: "subcategories",
                keyColumn: "id",
                keyValue: new Guid("b1000000-0000-0000-0000-000000000504"));

            migrationBuilder.UpdateData(
                table: "categories",
                keyColumn: "id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "is_active",
                value: true);

            migrationBuilder.UpdateData(
                table: "categories",
                keyColumn: "id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                column: "is_active",
                value: true);

            migrationBuilder.DropColumn(
                name: "tenure",
                table: "listings");
        }
    }
}
