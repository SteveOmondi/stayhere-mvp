using Microsoft.Azure.Functions.Worker;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Npgsql;
using StayHere.Application.Common.Interfaces;
using StayHere.Application.Properties.Services;
using StayHere.Domain.Repositories;
using StayHere.Infrastructure.AiAgent;
using StayHere.Infrastructure.Caching;
using StayHere.Infrastructure.Persistence;
using StayHere.Application.Categories.Services;
using StayHere.Shared.Middleware;

using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Configurations;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Abstractions;
using Microsoft.OpenApi.Models;

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication(worker =>
    {
        worker.UseMiddleware<GlobalExceptionMiddleware>();
        worker.UseMiddleware<AuthenticationMiddleware>();
    })
    .ConfigureServices((context, services) =>
    {
        var config = context.Configuration;

        var connectionString = NpgsqlConnectionStringHelper.ResolveFromConfiguration(config);

        services.AddStayHereDbContext(connectionString);

        services.AddStayHereRedisCache(config);

        services.AddMemoryCache();
        services.AddHttpClient<IEmbeddingService, GoogleEmbeddingService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(25);
        });
        services.AddScoped<IPropertyRepository, EfPropertyRepository>();
        services.AddScoped<IListingRepository, EfListingRepository>();
        services.AddScoped<IPropertyTermsRepository, EfPropertyTermsRepository>();
        services.AddScoped<ICategoryRepository, EfCategoryRepository>();
        services.AddScoped<ISubcategoryRepository, EfSubcategoryRepository>();
        services.AddScoped<IPropertyService, PropertyService>();
        services.AddScoped<IListingService, ListingService>();
        services.AddR2Storage(config);
        services.AddHttpClient(); // IHttpClientFactory for general HTTP calls

        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();

        services.AddSingleton<IOpenApiConfigurationOptions>(_ =>
        {
            var options = new OpenApiConfigurationOptions()
            {
                Info = new OpenApiInfo()
                {
                    Version = "1.0.0",
                    Title = "Property Service API",
                    Description = "API for Properties and Listings",
                }
            };

            return options;
        });
    })
    .Build();

await ApplyMigrationsAsync(host);

await host.RunAsync();

static async Task ApplyMigrationsAsync(IHost host)
{
    await using var scope = host.Services.CreateAsyncScope();
    var db     = scope.ServiceProvider.GetRequiredService<StayHereDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<StayHereDbContext>>();
    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();

    var connectionString = NpgsqlConnectionStringHelper.ResolveFromConfiguration(config);

    var skipWhenNoDb =
        string.Equals(Environment.GetEnvironmentVariable("SKIP_MIGRATIONS"), "true", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(Environment.GetEnvironmentVariable("SKIP_AUTH"),       "true", StringComparison.OrdinalIgnoreCase);

    // ── Stage 1: connectivity probe via raw Npgsql (no EF overhead) ──────────
    try
    {
        using var probe = new NpgsqlConnection(connectionString);
        await probe.OpenAsync();
        logger.LogWarning("=== DB connectivity confirmed at startup ===");
    }
    catch (Exception ex)
    {
        if (skipWhenNoDb)
        {
            logger.LogWarning(ex,
                "DB unreachable at startup (SKIP_AUTH/SKIP_MIGRATIONS=true). " +
                "DB-dependent endpoints will fail until Postgres is available.");
            return;
        }
        // Without SKIP_AUTH, a missing DB is fatal — let it propagate so the process fails fast.
        throw;
    }

    // ── Stage 2: EF Core migration runner (best-effort, non-fatal) ───────────
    // If MigrateAsync fails for any reason we log the error and continue to
    // Stage 3, which handles missing columns independently.
    try
    {
        var pending = (await db.Database.GetPendingMigrationsAsync()).ToList();
        if (pending.Count > 0)
        {
            logger.LogWarning("Applying {Count} pending EF migration(s): {Names}",
                pending.Count, string.Join(", ", pending));
            await db.Database.MigrateAsync();
            logger.LogWarning("EF migrations applied successfully.");
        }
        else
        {
            logger.LogWarning("No pending EF migrations.");
        }
    }
    catch (Exception ex)
    {
        // Non-fatal: log loudly but continue to Stage 3 so columns are ensured
        // by the direct-Npgsql path regardless of EF Core state.
        logger.LogError(ex,
            "EF MigrateAsync encountered an error — continuing to direct column-ensure.");
    }

    // ── Stage 3: idempotent column-ensure via direct Npgsql connection ────────
    // Uses its own fresh connection so EF Core transaction/model state cannot
    // interfere. Always runs as long as the DB is reachable (Stage 1 passed).
    try
    {
        await EnsureRequiredColumnsAsync(connectionString, logger);
    }
    catch (Exception ex)
    {
        logger.LogError(ex,
            "=== EnsureRequiredColumnsAsync FAILED — DB columns missing, queries will return 500. " +
            "Fix the error above and restart. ===");
    }
}

static async Task EnsureRequiredColumnsAsync(string connectionString, ILogger logger)
{
    logger.LogWarning("=== EnsureRequiredColumnsAsync: opening direct Npgsql connection ===");

    using var conn = new NpgsqlConnection(connectionString);
    await conn.OpenAsync();

    logger.LogWarning("=== EnsureRequiredColumnsAsync: connection open, running DDL ===");

    var statements = new[]
    {
        "ALTER TABLE IF EXISTS properties     ADD COLUMN IF NOT EXISTS year_built          integer",
        "ALTER TABLE IF EXISTS properties     ADD COLUMN IF NOT EXISTS shared_amenities    text",
        "ALTER TABLE IF EXISTS properties     ADD COLUMN IF NOT EXISTS rules               text",
        "ALTER TABLE IF EXISTS properties     ADD COLUMN IF NOT EXISTS images_structured   text",

        "ALTER TABLE IF EXISTS listings       ADD COLUMN IF NOT EXISTS images_structured   text",
        "ALTER TABLE IF EXISTS listings       ADD COLUMN IF NOT EXISTS caretaker_name      character varying(255)",
        "ALTER TABLE IF EXISTS listings       ADD COLUMN IF NOT EXISTS caretaker_phone     character varying(20)",
        "ALTER TABLE IF EXISTS listings       ADD COLUMN IF NOT EXISTS caretaker_email     character varying(255)",

        "ALTER TABLE IF EXISTS property_terms ADD COLUMN IF NOT EXISTS min_lease_period    character varying(50)",
        "ALTER TABLE IF EXISTS property_terms ADD COLUMN IF NOT EXISTS water_deposit       numeric(18,2)",
        "ALTER TABLE IF EXISTS property_terms ADD COLUMN IF NOT EXISTS electricity_deposit numeric(18,2)",
        "ALTER TABLE IF EXISTS property_terms ADD COLUMN IF NOT EXISTS token_deposit       numeric(18,2)",
        "ALTER TABLE IF EXISTS property_terms ADD COLUMN IF NOT EXISTS garbage_deposit     numeric(18,2)",

        // Drop FKs that required customer_id / viewing_booking_id to reference existing rows.
        // Tenants apply and book using their auth user ID, which has no row in customers yet.
        // ViewingBookingId is optional — applications may be created without a prior booking.
        @"DO $$ BEGIN
              IF EXISTS (SELECT 1 FROM information_schema.table_constraints
                         WHERE constraint_name = 'FK_viewing_bookings_customers_customer_id'
                           AND table_name = 'viewing_bookings') THEN
                  ALTER TABLE viewing_bookings DROP CONSTRAINT ""FK_viewing_bookings_customers_customer_id"";
              END IF;
              IF EXISTS (SELECT 1 FROM information_schema.table_constraints
                         WHERE constraint_name = 'FK_tenant_applications_customers_customer_id'
                           AND table_name = 'tenant_applications') THEN
                  ALTER TABLE tenant_applications DROP CONSTRAINT ""FK_tenant_applications_customers_customer_id"";
              END IF;
              IF EXISTS (SELECT 1 FROM information_schema.table_constraints
                         WHERE constraint_name = 'FK_tenant_applications_viewing_bookings_viewing_booking_id'
                           AND table_name = 'tenant_applications') THEN
                  ALTER TABLE tenant_applications DROP CONSTRAINT ""FK_tenant_applications_viewing_bookings_viewing_booking_id"";
              END IF;
          END $$",
    };

    foreach (var sql in statements)
    {
        logger.LogWarning("DDL: {Sql}", sql);
        using var cmd = new NpgsqlCommand(sql, conn);
        await cmd.ExecuteNonQueryAsync();
    }

    logger.LogWarning("DDL complete — running NULL-value seed updates...");

    // Seed NULL JSON columns so EF Core value converters never see a DB NULL.
    // Properties that existed before these columns were added will have NULL;
    // EF throws InvalidCastException before the converter can supply a default.
    var seeds = new[]
    {
        // properties — seed empty JSON arrays/objects for all JSON columns
        "UPDATE properties SET shared_amenities  = '[]'  WHERE shared_amenities  IS NULL",
        "UPDATE properties SET rules             = '[]'  WHERE rules             IS NULL",
        "UPDATE properties SET images_structured = '{}'  WHERE images_structured IS NULL",

        // listings — seed structured images from flat images column
        @"UPDATE listings
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
          WHERE  images_structured IS NULL",
    };

    foreach (var seed in seeds)
    {
        logger.LogWarning("SEED: {Sql}", seed.Split('\n')[0].Trim());
        using var seedCmd = new NpgsqlCommand(seed, conn);
        await seedCmd.ExecuteNonQueryAsync();
    }

    logger.LogWarning("=== EnsureRequiredColumnsAsync: complete ===");
}
