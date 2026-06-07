using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StayHere.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class FixImagesDefaultValue : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Fix rows that got the empty-string default instead of a valid JSON array
            migrationBuilder.Sql(
                "UPDATE properties SET images = '[]' WHERE images IS NULL OR images = '' OR images = '\"\"';");
            migrationBuilder.Sql(
                "UPDATE listings SET images = '[]' WHERE images IS NULL OR images = '' OR images = '\"\"';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
