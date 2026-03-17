using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StayHere.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "categories",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    icon_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    country = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    city = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    sort_order = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_categories", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "otp_verifications",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    target = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    code = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    expiry = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_used = table.Column<bool>(type: "boolean", nullable: false),
                    attempts = table.Column<int>(type: "integer", nullable: false),
                    type = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_otp_verifications", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "properties",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    owner_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    street = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    city = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    state = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    postal_code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    country = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    latitude = table.Column<double>(type: "double precision", nullable: true),
                    longitude = table.Column<double>(type: "double precision", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    type = table.Column<string>(type: "text", nullable: false),
                    monthly_rent = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_properties", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    phone_number = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    full_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    entra_object_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    role = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    last_login = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_categories_city",
                table: "categories",
                column: "city");

            migrationBuilder.CreateIndex(
                name: "IX_categories_country",
                table: "categories",
                column: "country");

            migrationBuilder.CreateIndex(
                name: "IX_categories_country_city",
                table: "categories",
                columns: new[] { "country", "city" });

            migrationBuilder.CreateIndex(
                name: "IX_categories_is_active",
                table: "categories",
                column: "is_active");

            migrationBuilder.CreateIndex(
                name: "IX_otp_verifications_target_is_used",
                table: "otp_verifications",
                columns: new[] { "target", "is_used" });

            migrationBuilder.CreateIndex(
                name: "IX_properties_owner_id",
                table: "properties",
                column: "owner_id");

            migrationBuilder.CreateIndex(
                name: "IX_properties_status",
                table: "properties",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_users_email",
                table: "users",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_entra_object_id",
                table: "users",
                column: "entra_object_id");

            migrationBuilder.CreateIndex(
                name: "IX_users_phone_number",
                table: "users",
                column: "phone_number");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "categories");

            migrationBuilder.DropTable(
                name: "otp_verifications");

            migrationBuilder.DropTable(
                name: "properties");

            migrationBuilder.DropTable(
                name: "users");
        }
    }
}
