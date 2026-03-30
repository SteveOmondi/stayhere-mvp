using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace StayHere.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CustomerRetreivalInfrastructure : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "categories",
                columns: new[] { "id", "city", "country", "created_at", "description", "icon_url", "is_active", "name", "updated_at" },
                values: new object[,]
                {
                    { new Guid("11111111-1111-1111-1111-111111111111"), "Nairobi", "Kenya", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), "Modern apartments in the city", null, true, "Apartment", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified) },
                    { new Guid("22222222-2222-2222-2222-222222222222"), "Nairobi", "Kenya", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), "Spacious family houses", null, true, "House", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified) }
                });

            migrationBuilder.InsertData(
                table: "properties",
                columns: new[] { "id", "building_name", "created_at", "description", "owner_id", "property_code", "total_floors", "total_units", "updated_at", "location_city", "location_country", "location_county", "location_latitude", "location_longitude", "location_street", "location_suburb" },
                values: new object[] { new Guid("33333333-3333-3333-3333-333333333333"), "StayHere Heights", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), "Luxury living in the heart of the city", new Guid("44444444-4444-4444-4444-444444444444"), "PROP-001", 10, 50, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), "Nairobi", "Kenya", "Nairobi", -1.2633000000000001, 36.804499999999997, "Waiyaki Way", "Westlands" });

            migrationBuilder.InsertData(
                table: "property_owners",
                columns: new[] { "id", "created_at", "email", "full_name", "phone", "updated_at", "user_id", "wallet_id" },
                values: new object[] { new Guid("44444444-4444-4444-4444-444444444444"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), "owner@stayhere.com", "StayHere Master Owner", "+254700000000", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, new Guid("55555555-5555-5555-5555-555555555555") });

            migrationBuilder.InsertData(
                table: "wallets",
                columns: new[] { "id", "created_at", "currency", "property_owner_id", "updated_at" },
                values: new object[] { new Guid("55555555-5555-5555-5555-555555555555"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), "KES", new Guid("44444444-4444-4444-4444-444444444444"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "categories",
                keyColumn: "id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.DeleteData(
                table: "categories",
                keyColumn: "id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"));

            migrationBuilder.DeleteData(
                table: "properties",
                keyColumn: "id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"));

            migrationBuilder.DeleteData(
                table: "property_owners",
                keyColumn: "id",
                keyValue: new Guid("44444444-4444-4444-4444-444444444444"));

            migrationBuilder.DeleteData(
                table: "wallets",
                keyColumn: "id",
                keyValue: new Guid("55555555-5555-5555-5555-555555555555"));
        }
    }
}
