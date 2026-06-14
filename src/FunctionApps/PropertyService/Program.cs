using Microsoft.Azure.Functions.Worker;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using StayHere.Application.Common.Interfaces;
using StayHere.Application.Properties.Services;
using StayHere.Domain.Repositories;
using StayHere.Infrastructure.AiAgent;
using StayHere.Infrastructure.Caching;
using StayHere.Infrastructure.Persistence;
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
    var db = scope.ServiceProvider.GetRequiredService<StayHereDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<StayHereDbContext>>();

    // In production the DB must be reachable — crash fast so the deployment fails visibly.
    // Locally (SKIP_MIGRATIONS=true or SKIP_AUTH=true) allow the host to start without a DB
    // so developers can test non-database endpoints (e.g. R2 uploads) without running Postgres.
    var skipMigrations = string.Equals(
        Environment.GetEnvironmentVariable("SKIP_MIGRATIONS"), "true", StringComparison.OrdinalIgnoreCase)
        || string.Equals(
        Environment.GetEnvironmentVariable("SKIP_AUTH"), "true", StringComparison.OrdinalIgnoreCase);

    try
    {
        var pending = await db.Database.GetPendingMigrationsAsync();
        if (pending.Any())
        {
            logger.LogInformation("Applying {Count} pending migration(s): {Names}",
                pending.Count(), string.Join(", ", pending));
            await db.Database.MigrateAsync();
            logger.LogInformation("Database migrations applied successfully.");
        }
    }
    catch (Exception ex)
    {
        if (skipMigrations)
        {
            logger.LogWarning(ex,
                "Database migration skipped — DB unreachable but SKIP_AUTH/SKIP_MIGRATIONS=true. " +
                "Endpoints that require the database will fail until Postgres is available.");
        }
        else
        {
            logger.LogError(ex, "Database migration failed on startup.");
            throw;
        }
    }
}
