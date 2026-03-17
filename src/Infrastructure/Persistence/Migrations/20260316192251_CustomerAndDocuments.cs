using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StayHere.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CustomerAndDocuments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "customers",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    first_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    last_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    display_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    country_id = table.Column<Guid>(type: "uuid", nullable: true),
                    city_id = table.Column<Guid>(type: "uuid", nullable: true),
                    address_line = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    date_of_birth = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    id_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    id_number_encrypted = table.Column<string>(type: "text", nullable: true),
                    kyc_status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    preferred_language = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    preferred_currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: true),
                    profile_photo_url = table.Column<string>(type: "text", nullable: true),
                    notification_preferences = table.Column<string>(type: "jsonb", nullable: true),
                    account_status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    last_login_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_customers", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "customer_properties",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    listing_id = table.Column<Guid>(type: "uuid", nullable: false),
                    relationship_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    start_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    end_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    agreed_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: true),
                    unit_number = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    floor_number = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_customer_properties", x => x.id);
                    table.ForeignKey(
                        name: "FK_customer_properties_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "documents",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    entity_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    entity_id = table.Column<Guid>(type: "uuid", nullable: false),
                    document_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    file_url = table.Column<string>(type: "text", nullable: false),
                    uploaded_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_documents", x => x.id);
                    table.ForeignKey(
                        name: "FK_documents_customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "customers",
                        principalColumn: "id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_customer_properties_customer_id",
                table: "customer_properties",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "IX_customer_properties_listing_id",
                table: "customer_properties",
                column: "listing_id");

            migrationBuilder.CreateIndex(
                name: "IX_customers_city_id",
                table: "customers",
                column: "city_id");

            migrationBuilder.CreateIndex(
                name: "IX_customers_country_id",
                table: "customers",
                column: "country_id");

            migrationBuilder.CreateIndex(
                name: "IX_customers_email",
                table: "customers",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_customers_phone",
                table: "customers",
                column: "phone");

            migrationBuilder.CreateIndex(
                name: "IX_documents_CustomerId",
                table: "documents",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_documents_entity_type_entity_id",
                table: "documents",
                columns: new[] { "entity_type", "entity_id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "customer_properties");

            migrationBuilder.DropTable(
                name: "documents");

            migrationBuilder.DropTable(
                name: "customers");
        }
    }
}
