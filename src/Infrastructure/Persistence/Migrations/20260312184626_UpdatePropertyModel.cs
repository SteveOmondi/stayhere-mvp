using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StayHere.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UpdatePropertyModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "currency",
                table: "properties");

            migrationBuilder.RenameColumn(
                name: "street",
                table: "properties",
                newName: "location_street");

            migrationBuilder.RenameColumn(
                name: "longitude",
                table: "properties",
                newName: "location_longitude");

            migrationBuilder.RenameColumn(
                name: "latitude",
                table: "properties",
                newName: "location_latitude");

            migrationBuilder.RenameColumn(
                name: "country",
                table: "properties",
                newName: "location_country");

            migrationBuilder.RenameColumn(
                name: "city",
                table: "properties",
                newName: "location_city");

            migrationBuilder.RenameColumn(
                name: "type",
                table: "properties",
                newName: "property_type");

            migrationBuilder.RenameColumn(
                name: "status",
                table: "properties",
                newName: "listing_type");

            migrationBuilder.RenameColumn(
                name: "state",
                table: "properties",
                newName: "location_county");

            migrationBuilder.RenameColumn(
                name: "postal_code",
                table: "properties",
                newName: "property_code");

            migrationBuilder.RenameColumn(
                name: "monthly_rent",
                table: "properties",
                newName: "price");

            migrationBuilder.RenameIndex(
                name: "IX_properties_status",
                table: "properties",
                newName: "IX_properties_listing_type");

            migrationBuilder.AlterColumn<string>(
                name: "description",
                table: "properties",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "location_street",
                table: "properties",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255);

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

            migrationBuilder.AddColumn<int>(
                name: "bathrooms",
                table: "properties",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "bedrooms",
                table: "properties",
                type: "integer",
                nullable: false,
                defaultValue: 0);

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
                name: "location_suburb",
                table: "properties",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

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

            migrationBuilder.AddColumn<string>(
                name: "price_currency",
                table: "properties",
                type: "character varying(3)",
                maxLength: 3,
                nullable: false,
                defaultValue: "KES");

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
                name: "IX_properties_property_code",
                table: "properties",
                column: "property_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_properties_property_type",
                table: "properties",
                column: "property_type");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
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
                name: "IX_properties_property_code",
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
                name: "bathrooms",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "bedrooms",
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
                name: "location_suburb",
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
                name: "price_currency",
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
                name: "location_street",
                table: "properties",
                newName: "street");

            migrationBuilder.RenameColumn(
                name: "location_longitude",
                table: "properties",
                newName: "longitude");

            migrationBuilder.RenameColumn(
                name: "location_latitude",
                table: "properties",
                newName: "latitude");

            migrationBuilder.RenameColumn(
                name: "location_country",
                table: "properties",
                newName: "country");

            migrationBuilder.RenameColumn(
                name: "location_city",
                table: "properties",
                newName: "city");

            migrationBuilder.RenameColumn(
                name: "property_type",
                table: "properties",
                newName: "type");

            migrationBuilder.RenameColumn(
                name: "property_code",
                table: "properties",
                newName: "postal_code");

            migrationBuilder.RenameColumn(
                name: "price",
                table: "properties",
                newName: "monthly_rent");

            migrationBuilder.RenameColumn(
                name: "location_county",
                table: "properties",
                newName: "state");

            migrationBuilder.RenameColumn(
                name: "listing_type",
                table: "properties",
                newName: "status");

            migrationBuilder.RenameIndex(
                name: "IX_properties_listing_type",
                table: "properties",
                newName: "IX_properties_status");

            migrationBuilder.AlterColumn<string>(
                name: "description",
                table: "properties",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "street",
                table: "properties",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255,
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "currency",
                table: "properties",
                type: "character varying(3)",
                maxLength: 3,
                nullable: false,
                defaultValue: "");
        }
    }
}
