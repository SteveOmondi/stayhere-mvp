using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using StayHere.Infrastructure.Persistence;

#nullable disable

namespace StayHere.Infrastructure.Persistence.Migrations
{
    // The [Migration] attribute is placed here (not in a separate Designer file) so that
    // EF Core's assembly scanner can discover this migration without a .Designer.cs.
    // The previous migrations (20260708000000, 20260709000000, 20260709000002) were
    // recorded in __EFMigrationsHistory but their DDL never executed; this migration
    // re-applies all of it idempotently so the missing columns are added automatically.
    [DbContext(typeof(StayHereDbContext))]
    [Migration("20260709000003_ForceMissingColumns")]
    public partial class ForceMissingColumns : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── properties ──────────────────────────────────────────────────────
            migrationBuilder.Sql("ALTER TABLE properties ADD COLUMN IF NOT EXISTS year_built          integer;");
            migrationBuilder.Sql("ALTER TABLE properties ADD COLUMN IF NOT EXISTS shared_amenities    text;");
            migrationBuilder.Sql("ALTER TABLE properties ADD COLUMN IF NOT EXISTS rules               text;");
            migrationBuilder.Sql("ALTER TABLE properties ADD COLUMN IF NOT EXISTS images_structured   text;");

            // ── listings ────────────────────────────────────────────────────────
            migrationBuilder.Sql("ALTER TABLE listings   ADD COLUMN IF NOT EXISTS images_structured   text;");
            migrationBuilder.Sql("ALTER TABLE listings   ADD COLUMN IF NOT EXISTS caretaker_name      character varying(255);");
            migrationBuilder.Sql("ALTER TABLE listings   ADD COLUMN IF NOT EXISTS caretaker_phone     character varying(20);");
            migrationBuilder.Sql("ALTER TABLE listings   ADD COLUMN IF NOT EXISTS caretaker_email     character varying(255);");

            // Seed NULL JSON columns so EF value converters never receive a DB NULL.
            // Properties created before these columns were added will have NULL values,
            // and Npgsql throws InvalidCastException before the converter can supply a default.
            migrationBuilder.Sql("UPDATE properties SET shared_amenities  = '[]' WHERE shared_amenities  IS NULL;");
            migrationBuilder.Sql("UPDATE properties SET rules             = '[]' WHERE rules             IS NULL;");
            migrationBuilder.Sql("UPDATE properties SET images_structured = '{}' WHERE images_structured IS NULL;");

            // Seed listing structured images from the flat images column.
            migrationBuilder.Sql(@"
                UPDATE listings
                SET    images_structured = json_build_object(
                           'exterior',   '[]'::json,
                           'livingRoom', '[]'::json,
                           'kitchen',    '[]'::json,
                           'diningArea', '[]'::json,
                           'bedroom',    '[]'::json,
                           'bathroom',   '[]'::json,
                           'balcony',    '[]'::json,
                           'other',      COALESCE(NULLIF(images, '[]'), '[]')::json
                       )
                WHERE  images_structured IS NULL;
            ");

            // ── property_terms ──────────────────────────────────────────────────
            migrationBuilder.Sql("ALTER TABLE property_terms ADD COLUMN IF NOT EXISTS min_lease_period    character varying(50);");
            migrationBuilder.Sql("ALTER TABLE property_terms ADD COLUMN IF NOT EXISTS water_deposit       numeric(18,2);");
            migrationBuilder.Sql("ALTER TABLE property_terms ADD COLUMN IF NOT EXISTS electricity_deposit numeric(18,2);");
            migrationBuilder.Sql("ALTER TABLE property_terms ADD COLUMN IF NOT EXISTS token_deposit       numeric(18,2);");
            migrationBuilder.Sql("ALTER TABLE property_terms ADD COLUMN IF NOT EXISTS garbage_deposit     numeric(18,2);");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE properties   DROP COLUMN IF EXISTS year_built;");
            migrationBuilder.Sql("ALTER TABLE properties   DROP COLUMN IF EXISTS shared_amenities;");
            migrationBuilder.Sql("ALTER TABLE properties   DROP COLUMN IF EXISTS rules;");
            migrationBuilder.Sql("ALTER TABLE properties   DROP COLUMN IF EXISTS images_structured;");

            migrationBuilder.Sql("ALTER TABLE listings     DROP COLUMN IF EXISTS images_structured;");
            migrationBuilder.Sql("ALTER TABLE listings     DROP COLUMN IF EXISTS caretaker_name;");
            migrationBuilder.Sql("ALTER TABLE listings     DROP COLUMN IF EXISTS caretaker_phone;");
            migrationBuilder.Sql("ALTER TABLE listings     DROP COLUMN IF EXISTS caretaker_email;");

            migrationBuilder.Sql("ALTER TABLE property_terms DROP COLUMN IF EXISTS min_lease_period;");
            migrationBuilder.Sql("ALTER TABLE property_terms DROP COLUMN IF EXISTS water_deposit;");
            migrationBuilder.Sql("ALTER TABLE property_terms DROP COLUMN IF EXISTS electricity_deposit;");
            migrationBuilder.Sql("ALTER TABLE property_terms DROP COLUMN IF EXISTS token_deposit;");
            migrationBuilder.Sql("ALTER TABLE property_terms DROP COLUMN IF EXISTS garbage_deposit;");
        }
    }
}
