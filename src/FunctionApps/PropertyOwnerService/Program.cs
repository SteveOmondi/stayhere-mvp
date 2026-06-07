using Microsoft.Azure.Functions.Worker;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using StayHere.Infrastructure.Persistence;
using StayHere.Application.Common.Interfaces;
using StayHere.Application.PropertyOwners.Services;
using StayHere.Domain.Repositories;
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

        services.AddScoped<IPropertyOwnerRepository, EfPropertyOwnerRepository>();
        services.AddScoped<IWalletRepository, EfWalletRepository>();
        services.AddScoped<IAgentRepository, EfAgentRepository>();
        services.AddScoped<ICaretakerRepository, EfCaretakerRepository>();
        services.AddScoped<IPropertyRepository, EfPropertyRepository>();
        services.AddScoped<IListingRepository, EfListingRepository>();

        services.AddScoped<IPropertyOwnerService, PropertyOwnerService>();

        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();

        services.AddSingleton<IOpenApiConfigurationOptions>(_ =>
        {
            var options = new OpenApiConfigurationOptions()
            {
                Info = new OpenApiInfo()
                {
                    Version = "1.0.0",
                    Title = "Property Owner Service API",
                    Description = "API for Property Owners, Agents and Caretakers",
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
        logger.LogError(ex, "Database migration failed on startup.");
        throw;
    }
}
