using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StayHere.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSubcategoriesAndListingCategoryFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── categories table: drop geo columns, add slug ─────────────────
            migrationBuilder.Sql("DROP INDEX IF EXISTS ix_categories_country;");
            migrationBuilder.Sql("DROP INDEX IF EXISTS ix_categories_city;");
            migrationBuilder.Sql("DROP INDEX IF EXISTS ix_categories_country_city;");
            migrationBuilder.Sql("ALTER TABLE categories DROP COLUMN IF EXISTS country;");
            migrationBuilder.Sql("ALTER TABLE categories DROP COLUMN IF EXISTS city;");

            migrationBuilder.Sql("ALTER TABLE categories ADD COLUMN IF NOT EXISTS slug character varying(100);");

            migrationBuilder.Sql(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_categories_slug ON categories (slug) WHERE slug IS NOT NULL;");

            // ── subcategories table ──────────────────────────────────────────
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS subcategories (
                    id uuid NOT NULL,
                    category_id uuid,
                    name character varying(100) NOT NULL,
                    slug character varying(100),
                    description character varying(500),
                    icon_url character varying(500),
                    country character varying(100) NOT NULL,
                    city character varying(100) NOT NULL,
                    is_active boolean NOT NULL DEFAULT true,
                    sort_order integer NOT NULL DEFAULT 0,
                    created_at timestamp with time zone NOT NULL,
                    updated_at timestamp with time zone NOT NULL,
                    CONSTRAINT pk_subcategories PRIMARY KEY (id)
                );");

            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS ix_subcategories_category_id ON subcategories (category_id);");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS ix_subcategories_country ON subcategories (country);");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS ix_subcategories_city ON subcategories (city);");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS ix_subcategories_is_active ON subcategories (is_active);");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS ix_subcategories_country_city ON subcategories (country, city);");

            // ── listings: add category_id + subcategory_id ───────────────────
            migrationBuilder.Sql("ALTER TABLE listings ADD COLUMN IF NOT EXISTS category_id uuid;");
            migrationBuilder.Sql("ALTER TABLE listings ADD COLUMN IF NOT EXISTS subcategory_id uuid;");

            // ── update seed data: remove Country/City, add Slug ──────────────
            migrationBuilder.UpdateData(
                table: "categories",
                keyColumn: "id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                columns: new[] { "slug", "sort_order", "description" },
                values: new object[] { "apartment", 1, "Apartment units for rent or sale" });

            migrationBuilder.UpdateData(
                table: "categories",
                keyColumn: "id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                columns: new[] { "slug", "sort_order", "description" },
                values: new object[] { "house", 2, "Stand-alone houses for rent or sale" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "category_id", table: "listings");
            migrationBuilder.DropColumn(name: "subcategory_id", table: "listings");

            migrationBuilder.DropTable(name: "subcategories");

            migrationBuilder.DropIndex(name: "ix_categories_slug", table: "categories");
            migrationBuilder.DropColumn(name: "slug", table: "categories");

            migrationBuilder.AddColumn<string>(
                name: "country",
                table: "categories",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "city",
                table: "categories",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(name: "ix_categories_country", table: "categories", column: "country");
            migrationBuilder.CreateIndex(name: "ix_categories_city", table: "categories", column: "city");
            migrationBuilder.CreateIndex(name: "ix_categories_country_city", table: "categories", columns: new[] { "country", "city" });
        }
    }
}
