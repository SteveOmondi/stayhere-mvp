using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StayHere.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SyncModelChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "property_terms",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    listing_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    terms_content = table.Column<string>(type: "text", nullable: true),
                    house_rules = table.Column<string>(type: "text", nullable: true),
                    payment_terms = table.Column<string>(type: "text", nullable: true),
                    notice_period = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    pet_policy = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    maintenance_policy = table.Column<string>(type: "text", nullable: true),
                    security_deposit_terms = table.Column<string>(type: "text", nullable: true),
                    security_deposit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    admin_fee = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: true, defaultValue: "KES"),
                    mpesa_paybill = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    mpesa_till = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    mpesa_account_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    bank_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    bank_account_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    bank_account_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    bank_branch = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    payment_instructions = table.Column<string>(type: "text", nullable: true),
                    onboarding_instructions = table.Column<string>(type: "text", nullable: true),
                    access_instructions = table.Column<string>(type: "text", nullable: true),
                    items_to_carry = table.Column<string>(type: "text", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_property_terms", x => x.id);
                    table.ForeignKey(
                        name: "FK_property_terms_listings_listing_id",
                        column: x => x.listing_id,
                        principalTable: "listings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "viewing_bookings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    listing_id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    preferred_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    preferred_time = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    viewing_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Physical"),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "Pending"),
                    notes = table.Column<string>(type: "text", nullable: true),
                    owner_notes = table.Column<string>(type: "text", nullable: true),
                    meeting_link = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    contact_phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_viewing_bookings", x => x.id);
                    table.ForeignKey(
                        name: "FK_viewing_bookings_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_viewing_bookings_listings_listing_id",
                        column: x => x.listing_id,
                        principalTable: "listings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tenant_applications",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    listing_id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    viewing_booking_id = table.Column<Guid>(type: "uuid", nullable: true),
                    status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false, defaultValue: "DocumentsPending"),
                    rejection_reason = table.Column<string>(type: "text", nullable: true),
                    reviewed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    reviewed_by = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    terms_accepted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    digital_signature_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tenant_applications", x => x.id);
                    table.ForeignKey(
                        name: "FK_tenant_applications_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tenant_applications_listings_listing_id",
                        column: x => x.listing_id,
                        principalTable: "listings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tenant_applications_viewing_bookings_viewing_booking_id",
                        column: x => x.viewing_booking_id,
                        principalTable: "viewing_bookings",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "application_documents",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    application_id = table.Column<Guid>(type: "uuid", nullable: false),
                    document_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    file_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    uploaded_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_application_documents", x => x.id);
                    table.ForeignKey(
                        name: "FK_application_documents_tenant_applications_application_id",
                        column: x => x.application_id,
                        principalTable: "tenant_applications",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "rental_payments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    application_id = table.Column<Guid>(type: "uuid", nullable: true),
                    payment_type = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false, defaultValue: "KES"),
                    method = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "Initiated"),
                    transaction_source = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    phone_number = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    merchant_request_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    mpesa_checkout_request_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    mpesa_receipt_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    mpesa_transaction_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    business_short_code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    bill_ref_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    invoice_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    org_account_balance = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    payer_first_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    payer_middle_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    payer_last_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    mpesa_transaction_date = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    reference = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    raw_callback_payload = table.Column<string>(type: "text", nullable: true),
                    initiated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    confirmed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rental_payments", x => x.id);
                    table.ForeignKey(
                        name: "FK_rental_payments_tenant_applications_application_id",
                        column: x => x.application_id,
                        principalTable: "tenant_applications",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_application_documents_application_id",
                table: "application_documents",
                column: "application_id");

            migrationBuilder.CreateIndex(
                name: "IX_application_documents_document_type",
                table: "application_documents",
                column: "document_type");

            migrationBuilder.CreateIndex(
                name: "IX_property_terms_listing_id",
                table: "property_terms",
                column: "listing_id");

            migrationBuilder.CreateIndex(
                name: "IX_property_terms_listing_id_is_active",
                table: "property_terms",
                columns: new[] { "listing_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "IX_rental_payments_application_id",
                table: "rental_payments",
                column: "application_id");

            migrationBuilder.CreateIndex(
                name: "IX_rental_payments_bill_ref_number",
                table: "rental_payments",
                column: "bill_ref_number");

            migrationBuilder.CreateIndex(
                name: "IX_rental_payments_mpesa_checkout_request_id",
                table: "rental_payments",
                column: "mpesa_checkout_request_id");

            migrationBuilder.CreateIndex(
                name: "IX_rental_payments_mpesa_transaction_id",
                table: "rental_payments",
                column: "mpesa_transaction_id",
                unique: true,
                filter: "mpesa_transaction_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_rental_payments_status",
                table: "rental_payments",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_rental_payments_transaction_source",
                table: "rental_payments",
                column: "transaction_source");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_applications_customer_id",
                table: "tenant_applications",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_applications_listing_id",
                table: "tenant_applications",
                column: "listing_id");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_applications_listing_id_customer_id",
                table: "tenant_applications",
                columns: new[] { "listing_id", "customer_id" });

            migrationBuilder.CreateIndex(
                name: "IX_tenant_applications_status",
                table: "tenant_applications",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_applications_viewing_booking_id",
                table: "tenant_applications",
                column: "viewing_booking_id");

            migrationBuilder.CreateIndex(
                name: "IX_viewing_bookings_customer_id",
                table: "viewing_bookings",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "IX_viewing_bookings_listing_id",
                table: "viewing_bookings",
                column: "listing_id");

            migrationBuilder.CreateIndex(
                name: "IX_viewing_bookings_status",
                table: "viewing_bookings",
                column: "status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "application_documents");

            migrationBuilder.DropTable(
                name: "property_terms");

            migrationBuilder.DropTable(
                name: "rental_payments");

            migrationBuilder.DropTable(
                name: "tenant_applications");

            migrationBuilder.DropTable(
                name: "viewing_bookings");
        }
    }
}
