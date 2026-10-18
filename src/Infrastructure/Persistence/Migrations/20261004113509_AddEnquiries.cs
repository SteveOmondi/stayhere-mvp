using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StayHere.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddEnquiries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "enquiries",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    listing_id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    owner_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Open"),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    last_message_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    last_message_preview = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    customer_last_read_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    owner_last_read_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_enquiries", x => x.id);
                    table.ForeignKey(
                        name: "FK_enquiries_listings_listing_id",
                        column: x => x.listing_id,
                        principalTable: "listings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "enquiry_messages",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    enquiry_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sender_role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    sender_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    body = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_enquiry_messages", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_enquiries_customer_id",
                table: "enquiries",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "IX_enquiries_listing_id_customer_id",
                table: "enquiries",
                columns: new[] { "listing_id", "customer_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_enquiries_owner_id",
                table: "enquiries",
                column: "owner_id");

            migrationBuilder.CreateIndex(
                name: "IX_enquiry_messages_enquiry_id",
                table: "enquiry_messages",
                column: "enquiry_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "enquiries");

            migrationBuilder.DropTable(
                name: "enquiry_messages");
        }
    }
}
