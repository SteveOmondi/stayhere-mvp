using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using StayHere.Infrastructure.Persistence;

#nullable disable

namespace StayHere.Infrastructure.Persistence.Migrations
{
    [DbContext(typeof(StayHereDbContext))]
    [Migration("20260712000001_DropApplicationCustomerAndBookingFks")]
    public partial class DropApplicationCustomerAndBookingFks : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // customer_id on tenant_applications: tenants use their auth user ID which has
            // no row in the customers table until the Customer Service creates a profile.
            migrationBuilder.Sql(@"
                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.table_constraints
                               WHERE constraint_name = 'FK_tenant_applications_customers_customer_id'
                                 AND table_name = 'tenant_applications') THEN
                        ALTER TABLE tenant_applications
                            DROP CONSTRAINT ""FK_tenant_applications_customers_customer_id"";
                    END IF;
                END $$;
            ");

            // viewing_booking_id on tenant_applications: bookingId is optional — a tenant
            // may apply without having first booked a viewing.
            migrationBuilder.Sql(@"
                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.table_constraints
                               WHERE constraint_name = 'FK_tenant_applications_viewing_bookings_viewing_booking_id'
                                 AND table_name = 'tenant_applications') THEN
                        ALTER TABLE tenant_applications
                            DROP CONSTRAINT ""FK_tenant_applications_viewing_bookings_viewing_booking_id"";
                    END IF;
                END $$;
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE tenant_applications
                    ADD CONSTRAINT ""FK_tenant_applications_customers_customer_id""
                    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT;
            ");
            migrationBuilder.Sql(@"
                ALTER TABLE tenant_applications
                    ADD CONSTRAINT ""FK_tenant_applications_viewing_bookings_viewing_booking_id""
                    FOREIGN KEY (viewing_booking_id) REFERENCES viewing_bookings(id) ON DELETE RESTRICT;
            ");
        }
    }
}
