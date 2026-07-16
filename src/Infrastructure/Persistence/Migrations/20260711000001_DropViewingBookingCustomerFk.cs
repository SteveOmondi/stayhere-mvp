using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using StayHere.Infrastructure.Persistence;

#nullable disable

namespace StayHere.Infrastructure.Persistence.Migrations
{
    [DbContext(typeof(StayHereDbContext))]
    [Migration("20260711000001_DropViewingBookingCustomerFk")]
    public partial class DropViewingBookingCustomerFk : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop the FK that required customer_id to reference the customers table.
            // Bookings are created by auth users who may not have a row in customers yet
            // (customers are created lazily via the Customer Service, not at auth time).
            // customer_id remains as an indexed plain UUID column.
            migrationBuilder.Sql(@"
                DO $$ BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.table_constraints
                        WHERE constraint_name = 'FK_viewing_bookings_customers_customer_id'
                          AND table_name = 'viewing_bookings'
                    ) THEN
                        ALTER TABLE viewing_bookings
                            DROP CONSTRAINT ""FK_viewing_bookings_customers_customer_id"";
                    END IF;
                END $$;
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE viewing_bookings
                    ADD CONSTRAINT ""FK_viewing_bookings_customers_customer_id""
                    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT;
            ");
        }
    }
}
