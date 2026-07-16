using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StayHere.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ExtendPropertyAndListingModels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── properties table ─────────────────────────────────────────────
            migrationBuilder.Sql("ALTER TABLE properties ADD COLUMN IF NOT EXISTS year_built integer;");
            migrationBuilder.Sql("ALTER TABLE properties ADD COLUMN IF NOT EXISTS shared_amenities text;");
            migrationBuilder.Sql("ALTER TABLE properties ADD COLUMN IF NOT EXISTS rules text;");
            migrationBuilder.Sql("ALTER TABLE properties ADD COLUMN IF NOT EXISTS images_structured text;");

            // ── listings table ───────────────────────────────────────────────
            migrationBuilder.Sql("ALTER TABLE listings ADD COLUMN IF NOT EXISTS images_structured text;");

            // Seed structured images from existing flat images (put them in Other)
            migrationBuilder.Sql(@"
                UPDATE listings
                SET images_structured = json_build_object(
                    'Exterior', '[]'::json,
                    'LivingRoom', '[]'::json,
                    'Kitchen', '[]'::json,
                    'DiningArea', '[]'::json,
                    'Bedroom', '[]'::json,
                    'Bathroom', '[]'::json,
                    'Balcony', '[]'::json,
                    'Other', COALESCE(NULLIF(images, '[]'), '[]')::json
                )
                WHERE images_structured IS NULL;
            ");

            // ── property_terms table ─────────────────────────────────────────
            migrationBuilder.Sql("ALTER TABLE property_terms ADD COLUMN IF NOT EXISTS min_lease_period character varying(50);");
            migrationBuilder.Sql("ALTER TABLE property_terms ADD COLUMN IF NOT EXISTS water_deposit numeric(18,2);");
            migrationBuilder.Sql("ALTER TABLE property_terms ADD COLUMN IF NOT EXISTS electricity_deposit numeric(18,2);");
            migrationBuilder.Sql("ALTER TABLE property_terms ADD COLUMN IF NOT EXISTS token_deposit numeric(18,2);");
            migrationBuilder.Sql("ALTER TABLE property_terms ADD COLUMN IF NOT EXISTS garbage_deposit numeric(18,2);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE properties DROP COLUMN IF EXISTS year_built;");
            migrationBuilder.Sql("ALTER TABLE properties DROP COLUMN IF EXISTS shared_amenities;");
            migrationBuilder.Sql("ALTER TABLE properties DROP COLUMN IF EXISTS rules;");
            migrationBuilder.Sql("ALTER TABLE properties DROP COLUMN IF EXISTS images_structured;");

            migrationBuilder.Sql("ALTER TABLE listings DROP COLUMN IF EXISTS images_structured;");

            migrationBuilder.Sql("ALTER TABLE property_terms DROP COLUMN IF EXISTS min_lease_period;");
            migrationBuilder.Sql("ALTER TABLE property_terms DROP COLUMN IF EXISTS water_deposit;");
            migrationBuilder.Sql("ALTER TABLE property_terms DROP COLUMN IF EXISTS electricity_deposit;");
            migrationBuilder.Sql("ALTER TABLE property_terms DROP COLUMN IF EXISTS token_deposit;");
            migrationBuilder.Sql("ALTER TABLE property_terms DROP COLUMN IF EXISTS garbage_deposit;");
        }
    }
}
