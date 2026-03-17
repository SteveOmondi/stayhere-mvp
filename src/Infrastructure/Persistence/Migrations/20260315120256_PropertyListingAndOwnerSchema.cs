using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StayHere.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PropertyListingAndOwnerSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_properties_agent_id",
                table: "properties");

            migrationBuilder.DropIndex(
                name: "IX_properties_availability_status",
                table: "properties");

            migrationBuilder.DropIndex(
                name: "IX_properties_is_featured",
                table: "properties");

            migrationBuilder.DropIndex(
                name: "IX_properties_listing_type",
                table: "properties");

            migrationBuilder.DropIndex(
                name: "IX_properties_property_type",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "agent_email",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "agent_id",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "agent_name",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "agent_phone",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "amenities",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "availability_status",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "developer",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "images",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "is_featured",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "is_furnished",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "listed_date",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "listing_type",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "owner_email",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "owner_name",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "owner_phone",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "price",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "price_currency",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "property_type",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "rating",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "rating_count",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "recommended_score",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "size_sqft",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "views",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "year_built",
                table: "properties");

            migrationBuilder.RenameColumn(
                name: "title",
                table: "properties",
                newName: "building_name");

            migrationBuilder.RenameColumn(
                name: "bedrooms",
                table: "properties",
                newName: "total_units");

            migrationBuilder.RenameColumn(
                name: "bathrooms",
                table: "properties",
                newName: "total_floors");

            migrationBuilder.CreateTable(
                name: "agents",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    property_owner_id = table.Column<Guid>(type: "uuid", nullable: false),
                    full_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_agents", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "caretakers",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    full_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    property_owner_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_caretakers", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "listings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    listing_code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    property_id = table.Column<Guid>(type: "uuid", nullable: false),
                    unit_number = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    floor_number = table.Column<int>(type: "integer", nullable: false),
                    title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    price_currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false, defaultValue: "KES"),
                    property_type = table.Column<string>(type: "text", nullable: false),
                    listing_type = table.Column<string>(type: "text", nullable: false),
                    bedrooms = table.Column<int>(type: "integer", nullable: false),
                    bathrooms = table.Column<int>(type: "integer", nullable: false),
                    is_furnished = table.Column<bool>(type: "boolean", nullable: false),
                    location_country = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    location_county = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    location_city = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    location_suburb = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    location_street = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    location_latitude = table.Column<double>(type: "double precision", nullable: true),
                    location_longitude = table.Column<double>(type: "double precision", nullable: true),
                    amenities = table.Column<string>(type: "text", nullable: false),
                    images = table.Column<string>(type: "text", nullable: false),
                    size_sqft = table.Column<int>(type: "integer", nullable: true),
                    year_built = table.Column<int>(type: "integer", nullable: true),
                    developer = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    availability_status = table.Column<string>(type: "text", nullable: false),
                    owner_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    owner_phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    owner_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    agent_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    agent_phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    agent_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    owner_id = table.Column<Guid>(type: "uuid", nullable: false),
                    agent_id = table.Column<Guid>(type: "uuid", nullable: true),
                    caretaker_id = table.Column<Guid>(type: "uuid", nullable: true),
                    listed_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    views = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    rating = table.Column<decimal>(type: "numeric(3,2)", precision: 3, scale: 2, nullable: false, defaultValue: 0m),
                    rating_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    is_featured = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    recommended_score = table.Column<decimal>(type: "numeric(3,2)", precision: 3, scale: 2, nullable: false, defaultValue: 0m),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_listings", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "property_owners",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    full_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    wallet_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_property_owners", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "wallets",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    property_owner_id = table.Column<Guid>(type: "uuid", nullable: false),
                    balance = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false, defaultValue: "KES"),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_wallets", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_agents_property_owner_id",
                table: "agents",
                column: "property_owner_id");

            migrationBuilder.CreateIndex(
                name: "IX_caretakers_property_owner_id",
                table: "caretakers",
                column: "property_owner_id");

            migrationBuilder.CreateIndex(
                name: "IX_listings_agent_id",
                table: "listings",
                column: "agent_id");

            migrationBuilder.CreateIndex(
                name: "IX_listings_availability_status",
                table: "listings",
                column: "availability_status");

            migrationBuilder.CreateIndex(
                name: "IX_listings_caretaker_id",
                table: "listings",
                column: "caretaker_id");

            migrationBuilder.CreateIndex(
                name: "IX_listings_is_featured",
                table: "listings",
                column: "is_featured");

            migrationBuilder.CreateIndex(
                name: "IX_listings_listing_code",
                table: "listings",
                column: "listing_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_listings_listing_type",
                table: "listings",
                column: "listing_type");

            migrationBuilder.CreateIndex(
                name: "IX_listings_owner_id",
                table: "listings",
                column: "owner_id");

            migrationBuilder.CreateIndex(
                name: "IX_listings_property_id",
                table: "listings",
                column: "property_id");

            migrationBuilder.CreateIndex(
                name: "IX_listings_property_type",
                table: "listings",
                column: "property_type");

            migrationBuilder.CreateIndex(
                name: "IX_property_owners_email",
                table: "property_owners",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_property_owners_phone",
                table: "property_owners",
                column: "phone");

            migrationBuilder.CreateIndex(
                name: "IX_property_owners_user_id",
                table: "property_owners",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_wallets_property_owner_id",
                table: "wallets",
                column: "property_owner_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "agents");

            migrationBuilder.DropTable(
                name: "caretakers");

            migrationBuilder.DropTable(
                name: "listings");

            migrationBuilder.DropTable(
                name: "property_owners");

            migrationBuilder.DropTable(
                name: "wallets");

            migrationBuilder.RenameColumn(
                name: "total_units",
                table: "properties",
                newName: "bedrooms");

            migrationBuilder.RenameColumn(
                name: "total_floors",
                table: "properties",
                newName: "bathrooms");

            migrationBuilder.RenameColumn(
                name: "building_name",
                table: "properties",
                newName: "title");

            migrationBuilder.AddColumn<string>(
                name: "agent_email",
                table: "properties",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "agent_id",
                table: "properties",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "agent_name",
                table: "properties",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "agent_phone",
                table: "properties",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "amenities",
                table: "properties",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "availability_status",
                table: "properties",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "developer",
                table: "properties",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "images",
                table: "properties",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "is_featured",
                table: "properties",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "is_furnished",
                table: "properties",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "listed_date",
                table: "properties",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "listing_type",
                table: "properties",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "owner_email",
                table: "properties",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "owner_name",
                table: "properties",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "owner_phone",
                table: "properties",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "price",
                table: "properties",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "price_currency",
                table: "properties",
                type: "character varying(3)",
                maxLength: 3,
                nullable: false,
                defaultValue: "KES");

            migrationBuilder.AddColumn<string>(
                name: "property_type",
                table: "properties",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "rating",
                table: "properties",
                type: "numeric(3,2)",
                precision: 3,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "rating_count",
                table: "properties",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "recommended_score",
                table: "properties",
                type: "numeric(3,2)",
                precision: 3,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "size_sqft",
                table: "properties",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "views",
                table: "properties",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "year_built",
                table: "properties",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_properties_agent_id",
                table: "properties",
                column: "agent_id");

            migrationBuilder.CreateIndex(
                name: "IX_properties_availability_status",
                table: "properties",
                column: "availability_status");

            migrationBuilder.CreateIndex(
                name: "IX_properties_is_featured",
                table: "properties",
                column: "is_featured");

            migrationBuilder.CreateIndex(
                name: "IX_properties_listing_type",
                table: "properties",
                column: "listing_type");

            migrationBuilder.CreateIndex(
                name: "IX_properties_property_type",
                table: "properties",
                column: "property_type");
        }
    }
}
