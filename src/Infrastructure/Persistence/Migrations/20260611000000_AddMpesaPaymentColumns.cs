using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StayHere.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMpesaPaymentColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── Make application_id nullable ──────────────────────────────────────
            // C2B payments may arrive before a matching application is found.
            // Existing rows all have valid IDs; this is a safe schema-only change.
            migrationBuilder.DropForeignKey(
                name: "FK_rental_payments_tenant_applications_application_id",
                table: "rental_payments");

            migrationBuilder.AlterColumn<Guid>(
                name: "application_id",
                table: "rental_payments",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: false);

            migrationBuilder.AddForeignKey(
                name: "FK_rental_payments_tenant_applications_application_id",
                table: "rental_payments",
                column: "application_id",
                principalTable: "tenant_applications",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            // ── Transaction source discriminator ──────────────────────────────────
            migrationBuilder.AddColumn<string>(
                name: "transaction_source",
                table: "rental_payments",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_rental_payments_transaction_source",
                table: "rental_payments",
                column: "transaction_source");

            // ── STK Push additional field ─────────────────────────────────────────
            migrationBuilder.AddColumn<string>(
                name: "merchant_request_id",
                table: "rental_payments",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            // ── C2B / shared M-Pesa fields ────────────────────────────────────────
            migrationBuilder.AddColumn<string>(
                name: "mpesa_transaction_id",
                table: "rental_payments",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_rental_payments_mpesa_transaction_id",
                table: "rental_payments",
                column: "mpesa_transaction_id",
                unique: true,
                filter: "mpesa_transaction_id IS NOT NULL");

            migrationBuilder.AddColumn<string>(
                name: "business_short_code",
                table: "rental_payments",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "bill_ref_number",
                table: "rental_payments",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_rental_payments_bill_ref_number",
                table: "rental_payments",
                column: "bill_ref_number");

            migrationBuilder.AddColumn<string>(
                name: "invoice_number",
                table: "rental_payments",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "org_account_balance",
                table: "rental_payments",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            // ── Payer identity (from C2B) ─────────────────────────────────────────
            migrationBuilder.AddColumn<string>(
                name: "payer_first_name",
                table: "rental_payments",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "payer_middle_name",
                table: "rental_payments",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "payer_last_name",
                table: "rental_payments",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "mpesa_transaction_date",
                table: "rental_payments",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            // ── Audit / raw payload ───────────────────────────────────────────────
            migrationBuilder.AddColumn<string>(
                name: "raw_callback_payload",
                table: "rental_payments",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_rental_payments_transaction_source",
                table: "rental_payments");

            migrationBuilder.DropIndex(
                name: "IX_rental_payments_mpesa_transaction_id",
                table: "rental_payments");

            migrationBuilder.DropIndex(
                name: "IX_rental_payments_bill_ref_number",
                table: "rental_payments");

            migrationBuilder.DropColumn(name: "transaction_source", table: "rental_payments");
            migrationBuilder.DropColumn(name: "merchant_request_id", table: "rental_payments");
            migrationBuilder.DropColumn(name: "mpesa_transaction_id", table: "rental_payments");
            migrationBuilder.DropColumn(name: "business_short_code", table: "rental_payments");
            migrationBuilder.DropColumn(name: "bill_ref_number", table: "rental_payments");
            migrationBuilder.DropColumn(name: "invoice_number", table: "rental_payments");
            migrationBuilder.DropColumn(name: "org_account_balance", table: "rental_payments");
            migrationBuilder.DropColumn(name: "payer_first_name", table: "rental_payments");
            migrationBuilder.DropColumn(name: "payer_middle_name", table: "rental_payments");
            migrationBuilder.DropColumn(name: "payer_last_name", table: "rental_payments");
            migrationBuilder.DropColumn(name: "mpesa_transaction_date", table: "rental_payments");
            migrationBuilder.DropColumn(name: "raw_callback_payload", table: "rental_payments");

            // Restore non-nullable application_id with cascade delete
            migrationBuilder.DropForeignKey(
                name: "FK_rental_payments_tenant_applications_application_id",
                table: "rental_payments");

            migrationBuilder.AlterColumn<Guid>(
                name: "application_id",
                table: "rental_payments",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_rental_payments_tenant_applications_application_id",
                table: "rental_payments",
                column: "application_id",
                principalTable: "tenant_applications",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
