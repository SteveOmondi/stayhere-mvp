using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StayHere.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSoftDeleteToPropertiesAndListings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE properties ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;");
            migrationBuilder.Sql("ALTER TABLE listings  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;");

            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS ix_properties_deleted_at ON properties (deleted_at);");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS ix_listings_deleted_at  ON listings  (deleted_at);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP INDEX IF EXISTS ix_properties_deleted_at;");
            migrationBuilder.Sql("DROP INDEX IF EXISTS ix_listings_deleted_at;");
            migrationBuilder.Sql("ALTER TABLE properties DROP COLUMN IF EXISTS deleted_at;");
            migrationBuilder.Sql("ALTER TABLE listings  DROP COLUMN IF EXISTS deleted_at;");
        }
    }
}
