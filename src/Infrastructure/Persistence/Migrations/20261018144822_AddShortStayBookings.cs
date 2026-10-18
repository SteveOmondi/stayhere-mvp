using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StayHere.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddShortStayBookings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "short_stay_booking_id",
                table: "rental_payments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "application_id",
                table: "application_documents",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "short_stay_booking_id",
                table: "application_documents",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "short_stay_bookings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    listing_id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    check_in_date = table.Column<DateOnly>(type: "date", nullable: false),
                    check_out_date = table.Column<DateOnly>(type: "date", nullable: false),
                    guest_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    guest_phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    guest_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    number_of_guests = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    special_requests = table.Column<string>(type: "text", nullable: true),
                    booking_fee_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false, defaultValue: "KES"),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "PendingPayment"),
                    cancellation_reason = table.Column<string>(type: "text", nullable: true),
                    documents_submitted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    confirmed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_short_stay_bookings", x => x.id);
                    table.ForeignKey(
                        name: "FK_short_stay_bookings_listings_listing_id",
                        column: x => x.listing_id,
                        principalTable: "listings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_rental_payments_short_stay_booking_id",
                table: "rental_payments",
                column: "short_stay_booking_id");

            migrationBuilder.CreateIndex(
                name: "IX_application_documents_short_stay_booking_id",
                table: "application_documents",
                column: "short_stay_booking_id");

            migrationBuilder.CreateIndex(
                name: "IX_short_stay_bookings_customer_id",
                table: "short_stay_bookings",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "IX_short_stay_bookings_listing_id",
                table: "short_stay_bookings",
                column: "listing_id");

            migrationBuilder.CreateIndex(
                name: "IX_short_stay_bookings_listing_id_status",
                table: "short_stay_bookings",
                columns: new[] { "listing_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_short_stay_bookings_status",
                table: "short_stay_bookings",
                column: "status");

            migrationBuilder.AddForeignKey(
                name: "FK_application_documents_short_stay_bookings_short_stay_bookin~",
                table: "application_documents",
                column: "short_stay_booking_id",
                principalTable: "short_stay_bookings",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_rental_payments_short_stay_bookings_short_stay_booking_id",
                table: "rental_payments",
                column: "short_stay_booking_id",
                principalTable: "short_stay_bookings",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_application_documents_short_stay_bookings_short_stay_bookin~",
                table: "application_documents");

            migrationBuilder.DropForeignKey(
                name: "FK_rental_payments_short_stay_bookings_short_stay_booking_id",
                table: "rental_payments");

            migrationBuilder.DropTable(
                name: "short_stay_bookings");

            migrationBuilder.DropIndex(
                name: "IX_rental_payments_short_stay_booking_id",
                table: "rental_payments");

            migrationBuilder.DropIndex(
                name: "IX_application_documents_short_stay_booking_id",
                table: "application_documents");

            migrationBuilder.DropColumn(
                name: "short_stay_booking_id",
                table: "rental_payments");

            migrationBuilder.DropColumn(
                name: "short_stay_booking_id",
                table: "application_documents");

            migrationBuilder.AlterColumn<Guid>(
                name: "application_id",
                table: "application_documents",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }
    }
}
