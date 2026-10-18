using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StayHere.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddListingFloorPlan : Migration
    {
        /// <inheritdoc />
        /// <remarks>
        /// Scoped to ONLY the new nullable `listings.floor_plan` column. `dotnet ef migrations add`
        /// also detected unrelated pre-existing model/snapshot drift (FK drops on
        /// tenant_applications/viewing_bookings; NOT-NULL tightening on properties.shared_amenities,
        /// properties.rules, properties.images_structured, and listings.images_structured) that
        /// predates this change (verified via `git diff` showing zero unrelated edits in this
        /// session) — that drift is intentionally NOT included here since it's out of scope for
        /// this feature, and the NOT-NULL changes could data-loss on existing NULL rows without a
        /// reviewed backfill. It should be captured in its own separate, reviewed migration.
        /// </remarks>
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "floor_plan",
                table: "listings",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "floor_plan",
                table: "listings");
        }
    }
}
