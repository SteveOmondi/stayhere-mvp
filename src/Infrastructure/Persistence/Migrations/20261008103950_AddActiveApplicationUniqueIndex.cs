using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StayHere.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddActiveApplicationUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_tenant_applications_listing_id_customer_id",
                table: "tenant_applications");

            migrationBuilder.AlterColumn<string>(
                name: "status",
                table: "tenant_applications",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "PendingApproval",
                oldClrType: typeof(string),
                oldType: "character varying(40)",
                oldMaxLength: 40,
                oldDefaultValue: "DocumentsPending");

            migrationBuilder.CreateIndex(
                name: "ix_tenant_applications_active_listing_customer",
                table: "tenant_applications",
                columns: new[] { "listing_id", "customer_id" },
                unique: true,
                filter: "status NOT IN ('Cancelled', 'Rejected')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_tenant_applications_active_listing_customer",
                table: "tenant_applications");

            migrationBuilder.AlterColumn<string>(
                name: "status",
                table: "tenant_applications",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "DocumentsPending",
                oldClrType: typeof(string),
                oldType: "character varying(40)",
                oldMaxLength: 40,
                oldDefaultValue: "PendingApproval");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_applications_listing_id_customer_id",
                table: "tenant_applications",
                columns: new[] { "listing_id", "customer_id" });
        }
    }
}
