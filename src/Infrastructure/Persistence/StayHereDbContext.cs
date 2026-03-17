using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using StayHere.Domain.Entities;
using System.Text.Json;

namespace StayHere.Infrastructure.Persistence;

public class StayHereDbContext : DbContext
{
    public StayHereDbContext(DbContextOptions<StayHereDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Property> Properties => Set<Property>();
    public DbSet<Listing> Listings => Set<Listing>();
    public DbSet<PropertyOwner> PropertyOwners => Set<PropertyOwner>();
    public DbSet<Wallet> Wallets => Set<Wallet>();
    public DbSet<Agent> Agents => Set<Agent>();
    public DbSet<Caretaker> Caretakers => Set<Caretaker>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<CustomerProperty> CustomerProperties => Set<CustomerProperty>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<OtpVerification> OtpVerifications => Set<OtpVerification>();
    public DbSet<Category> Categories => Set<Category>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        ConfigureUser(modelBuilder);
        ConfigureProperty(modelBuilder);
        ConfigureListing(modelBuilder);
        ConfigurePropertyOwner(modelBuilder);
        ConfigureWallet(modelBuilder);
        ConfigureAgent(modelBuilder);
        ConfigureCaretaker(modelBuilder);
        ConfigureCustomer(modelBuilder);
        ConfigureCustomerProperty(modelBuilder);
        ConfigureDocument(modelBuilder);
        ConfigureOtpVerification(modelBuilder);
        ConfigureCategory(modelBuilder);
    }

    private static void ConfigureUser(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(255);
            entity.Property(e => e.PhoneNumber).HasColumnName("phone_number").HasMaxLength(20);
            entity.Property(e => e.FullName).HasColumnName("full_name").HasMaxLength(255);
            entity.Property(e => e.EntraObjectId).HasColumnName("entra_object_id").HasMaxLength(255);
            entity.Property(e => e.Role).HasColumnName("role").HasConversion<string>();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.LastLogin).HasColumnName("last_login");
            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => e.PhoneNumber);
            entity.HasIndex(e => e.EntraObjectId);
        });
    }

    private static void ConfigureProperty(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Property>(entity =>
        {
            entity.ToTable("properties");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.PropertyCode).HasColumnName("property_code").HasMaxLength(20).IsRequired();
            entity.Property(e => e.BuildingName).HasColumnName("building_name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.TotalUnits).HasColumnName("total_units");
            entity.Property(e => e.TotalFloors).HasColumnName("total_floors");
            entity.Property(e => e.OwnerId).HasColumnName("owner_id");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.OwnsOne(e => e.Location, location =>
            {
                location.Property(l => l.Country).HasColumnName("location_country").HasMaxLength(100).IsRequired();
                location.Property(l => l.County).HasColumnName("location_county").HasMaxLength(100).IsRequired();
                location.Property(l => l.City).HasColumnName("location_city").HasMaxLength(100).IsRequired();
                location.Property(l => l.Suburb).HasColumnName("location_suburb").HasMaxLength(100);
                location.Property(l => l.Street).HasColumnName("location_street").HasMaxLength(255);
                location.Property(l => l.Latitude).HasColumnName("location_latitude");
                location.Property(l => l.Longitude).HasColumnName("location_longitude");
            });

            entity.HasIndex(e => e.PropertyCode).IsUnique();
            entity.HasIndex(e => e.OwnerId);
        });
    }

    private static void ConfigureListing(ModelBuilder modelBuilder)
    {
        var stringListComparer = new ValueComparer<List<string>>(
            (c1, c2) => c1!.SequenceEqual(c2!),
            c => c.Aggregate(0, (a, v) => HashCode.Combine(a, v.GetHashCode())),
            c => c.ToList());

        modelBuilder.Entity<Listing>(entity =>
        {
            entity.ToTable("listings");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ListingCode).HasColumnName("listing_code").HasMaxLength(20).IsRequired();
            entity.Property(e => e.PropertyId).HasColumnName("property_id");
            entity.Property(e => e.UnitNumber).HasColumnName("unit_number").HasMaxLength(20).IsRequired();
            entity.Property(e => e.FloorNumber).HasColumnName("floor_number");
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Price).HasColumnName("price").HasPrecision(18, 2);
            entity.Property(e => e.PriceCurrency).HasColumnName("price_currency").HasMaxLength(3).HasDefaultValue("KES");
            entity.Property(e => e.PropertyType).HasColumnName("property_type").HasConversion<string>();
            entity.Property(e => e.ListingType).HasColumnName("listing_type").HasConversion<string>();
            entity.Property(e => e.Bedrooms).HasColumnName("bedrooms");
            entity.Property(e => e.Bathrooms).HasColumnName("bathrooms");
            entity.Property(e => e.IsFurnished).HasColumnName("is_furnished");
            entity.Property(e => e.Amenities).HasColumnName("amenities")
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>())
                .Metadata.SetValueComparer(stringListComparer);
            entity.Property(e => e.Images).HasColumnName("images")
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>())
                .Metadata.SetValueComparer(stringListComparer);
            entity.Property(e => e.SizeSqft).HasColumnName("size_sqft");
            entity.Property(e => e.YearBuilt).HasColumnName("year_built");
            entity.Property(e => e.Developer).HasColumnName("developer").HasMaxLength(255);
            entity.Property(e => e.AvailabilityStatus).HasColumnName("availability_status").HasConversion<string>();
            entity.Property(e => e.OwnerId).HasColumnName("owner_id");
            entity.Property(e => e.AgentId).HasColumnName("agent_id");
            entity.Property(e => e.CaretakerId).HasColumnName("caretaker_id");
            entity.Property(e => e.ListedDate).HasColumnName("listed_date");
            entity.Property(e => e.Views).HasColumnName("views").HasDefaultValue(0);
            entity.Property(e => e.Rating).HasColumnName("rating").HasPrecision(3, 2).HasDefaultValue(0);
            entity.Property(e => e.RatingCount).HasColumnName("rating_count").HasDefaultValue(0);
            entity.Property(e => e.IsFeatured).HasColumnName("is_featured").HasDefaultValue(false);
            entity.Property(e => e.RecommendedScore).HasColumnName("recommended_score").HasPrecision(3, 2).HasDefaultValue(0);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.OwnsOne(e => e.Location, location =>
            {
                location.Property(l => l.Country).HasColumnName("location_country").HasMaxLength(100).IsRequired();
                location.Property(l => l.County).HasColumnName("location_county").HasMaxLength(100).IsRequired();
                location.Property(l => l.City).HasColumnName("location_city").HasMaxLength(100).IsRequired();
                location.Property(l => l.Suburb).HasColumnName("location_suburb").HasMaxLength(100);
                location.Property(l => l.Street).HasColumnName("location_street").HasMaxLength(255);
                location.Property(l => l.Latitude).HasColumnName("location_latitude");
                location.Property(l => l.Longitude).HasColumnName("location_longitude");
            });
            entity.OwnsOne(e => e.Owner, owner =>
            {
                owner.Property(o => o.Name).HasColumnName("owner_name").HasMaxLength(255).IsRequired();
                owner.Property(o => o.Phone).HasColumnName("owner_phone").HasMaxLength(20).IsRequired();
                owner.Property(o => o.Email).HasColumnName("owner_email").HasMaxLength(255);
            });
            entity.OwnsOne(e => e.Agent, agent =>
            {
                agent.Property(a => a.Name).HasColumnName("agent_name").HasMaxLength(255);
                agent.Property(a => a.Phone).HasColumnName("agent_phone").HasMaxLength(20);
                agent.Property(a => a.Email).HasColumnName("agent_email").HasMaxLength(255);
            });

            entity.HasIndex(e => e.ListingCode).IsUnique();
            entity.HasIndex(e => e.PropertyId);
            entity.HasIndex(e => e.OwnerId);
            entity.HasIndex(e => e.AgentId);
            entity.HasIndex(e => e.CaretakerId);
            entity.HasIndex(e => e.PropertyType);
            entity.HasIndex(e => e.ListingType);
            entity.HasIndex(e => e.AvailabilityStatus);
            entity.HasIndex(e => e.IsFeatured);
        });
    }

    private static void ConfigureCustomer(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Customer>(entity =>
        {
            entity.ToTable("customers");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.FirstName).HasColumnName("first_name").HasMaxLength(100);
            entity.Property(e => e.LastName).HasColumnName("last_name").HasMaxLength(100);
            entity.Property(e => e.DisplayName).HasColumnName("display_name").HasMaxLength(150);
            entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Phone).HasColumnName("phone").HasMaxLength(20);
            entity.Property(e => e.CountryId).HasColumnName("country_id");
            entity.Property(e => e.CityId).HasColumnName("city_id");
            entity.Property(e => e.AddressLine).HasColumnName("address_line").HasMaxLength(255);
            entity.Property(e => e.DateOfBirth).HasColumnName("date_of_birth");
            entity.Property(e => e.IdType).HasColumnName("id_type").HasMaxLength(50);
            entity.Property(e => e.IdNumberEncrypted).HasColumnName("id_number_encrypted");
            entity.Property(e => e.KycStatus).HasColumnName("kyc_status").HasMaxLength(50);
            entity.Property(e => e.PreferredLanguage).HasColumnName("preferred_language").HasMaxLength(10);
            entity.Property(e => e.PreferredCurrency).HasColumnName("preferred_currency").HasMaxLength(3);
            entity.Property(e => e.ProfilePhotoUrl).HasColumnName("profile_photo_url");
            entity.Property(e => e.NotificationPreferencesJson).HasColumnName("notification_preferences").HasColumnType("jsonb");
            entity.Property(e => e.AccountStatus).HasColumnName("account_status").HasMaxLength(20);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.LastLoginAt).HasColumnName("last_login_at");

            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => e.Phone);
            entity.HasIndex(e => e.CountryId);
            entity.HasIndex(e => e.CityId);
        });
    }

    private static void ConfigureCustomerProperty(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CustomerProperty>(entity =>
        {
            entity.ToTable("customer_properties");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CustomerId).HasColumnName("customer_id");
            entity.Property(e => e.ListingId).HasColumnName("listing_id");
            entity.Property(e => e.RelationshipType).HasColumnName("relationship_type").HasMaxLength(20);
            entity.Property(e => e.StartDate).HasColumnName("start_date");
            entity.Property(e => e.EndDate).HasColumnName("end_date");
            entity.Property(e => e.AgreedPrice).HasColumnName("agreed_price").HasPrecision(18, 2);
            entity.Property(e => e.Currency).HasColumnName("currency").HasMaxLength(3);
            entity.Property(e => e.UnitNumber).HasColumnName("unit_number").HasMaxLength(20);
            entity.Property(e => e.FloorNumber).HasColumnName("floor_number").HasMaxLength(20);
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasIndex(e => e.CustomerId);
            entity.HasIndex(e => e.ListingId);

            entity.HasOne(e => e.Customer)
                .WithMany(c => c.Properties)
                .HasForeignKey(e => e.CustomerId);
        });
    }

    private static void ConfigureDocument(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Document>(entity =>
        {
            entity.ToTable("documents");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.EntityType).HasColumnName("entity_type").HasMaxLength(50);
            entity.Property(e => e.EntityId).HasColumnName("entity_id");
            entity.Property(e => e.DocumentType).HasColumnName("document_type").HasMaxLength(50);
            entity.Property(e => e.FileUrl).HasColumnName("file_url");
            entity.Property(e => e.UploadedAt).HasColumnName("uploaded_at");

            entity.HasIndex(e => new { e.EntityType, e.EntityId });
        });
    }

    private static void ConfigurePropertyOwner(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<PropertyOwner>(entity =>
        {
            entity.ToTable("property_owners");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.FullName).HasColumnName("full_name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Phone).HasColumnName("phone").HasMaxLength(20).IsRequired();
            entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(255).IsRequired();
            entity.Property(e => e.WalletId).HasColumnName("wallet_id");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => e.Phone);
            entity.HasIndex(e => e.UserId);
        });
    }

    private static void ConfigureWallet(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Wallet>(entity =>
        {
            entity.ToTable("wallets");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.PropertyOwnerId).HasColumnName("property_owner_id");
            entity.Property(e => e.Balance).HasColumnName("balance").HasPrecision(18, 2).HasDefaultValue(0);
            entity.Property(e => e.Currency).HasColumnName("currency").HasMaxLength(3).HasDefaultValue("KES");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.HasIndex(e => e.PropertyOwnerId).IsUnique();
        });
    }

    private static void ConfigureAgent(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Agent>(entity =>
        {
            entity.ToTable("agents");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.PropertyOwnerId).HasColumnName("property_owner_id");
            entity.Property(e => e.FullName).HasColumnName("full_name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Phone).HasColumnName("phone").HasMaxLength(20).IsRequired();
            entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(255);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.HasIndex(e => e.PropertyOwnerId);
        });
    }

    private static void ConfigureCaretaker(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Caretaker>(entity =>
        {
            entity.ToTable("caretakers");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.PropertyOwnerId).HasColumnName("property_owner_id");
            entity.Property(e => e.FullName).HasColumnName("full_name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Phone).HasColumnName("phone").HasMaxLength(20).IsRequired();
            entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(255);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.HasIndex(e => e.PropertyOwnerId);
        });
    }

    private static void ConfigureOtpVerification(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<OtpVerification>(entity =>
        {
            entity.ToTable("otp_verifications");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Target).HasColumnName("target").HasMaxLength(255);
            entity.Property(e => e.Code).HasColumnName("code").HasMaxLength(10);
            entity.Property(e => e.Expiry).HasColumnName("expiry");
            entity.Property(e => e.IsUsed).HasColumnName("is_used");
            entity.Property(e => e.Attempts).HasColumnName("attempts");
            entity.Property(e => e.Type).HasColumnName("type").HasConversion<string>();
            entity.HasIndex(e => new { e.Target, e.IsUsed });
        });
    }

    private static void ConfigureCategory(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Category>(entity =>
        {
            entity.ToTable("categories");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description").HasMaxLength(500);
            entity.Property(e => e.IconUrl).HasColumnName("icon_url").HasMaxLength(500);
            entity.Property(e => e.Country).HasColumnName("country").HasMaxLength(100).IsRequired();
            entity.Property(e => e.City).HasColumnName("city").HasMaxLength(100).IsRequired();
            entity.Property(e => e.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            entity.Property(e => e.SortOrder).HasColumnName("sort_order").HasDefaultValue(0);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.HasIndex(e => e.Country);
            entity.HasIndex(e => e.City);
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => new { e.Country, e.City });
        });
    }
}
