using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StayHere.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCaretakerContactToListing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE listings ADD COLUMN IF NOT EXISTS caretaker_name    VARCHAR(255);
                ALTER TABLE listings ADD COLUMN IF NOT EXISTS caretaker_phone   VARCHAR(20);
                ALTER TABLE listings ADD COLUMN IF NOT EXISTS caretaker_email   VARCHAR(255);
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE listings DROP COLUMN IF EXISTS caretaker_name;
                ALTER TABLE listings DROP COLUMN IF EXISTS caretaker_phone;
                ALTER TABLE listings DROP COLUMN IF EXISTS caretaker_email;
            ");
        }
    }
}
