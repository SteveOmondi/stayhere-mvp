using Microsoft.Azure.Functions.Worker;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using StayHere.Infrastructure.Persistence;
using StayHere.AuthService;
using StayHere.Application.Authentication.Services;
using StayHere.Application.Common.Interfaces;
using StayHere.Application.Onboarding.Services;
using StayHere.Domain.Repositories;
using StayHere.Infrastructure.Identity;
using StayHere.Infrastructure.Notifications;
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

        services.Configure<OnFonSmsOptions>(config.GetSection(OnFonSmsOptions.SectionName));

        // Application Services
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IOtpService, OtpService>();
        services.AddScoped<IOnboardingService, OnboardingService>();
        services.AddHostedService<AdminSeedService>();

        // Infrastructure Services
        services.AddScoped<IIdentityService, IdentityService>();
        services.AddHttpClient<INotificationService, NotificationService>();
        services.AddScoped<IUserRepository, EfUserRepository>();
        services.AddScoped<IOtpRepository, EfOtpRepository>();
        services.AddScoped<IPropertyOwnerRepository, EfPropertyOwnerRepository>();
        services.AddScoped<ICustomerRepository, EfCustomerRepository>();
        services.AddScoped<IWalletRepository, EfWalletRepository>();
        
        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();

        services.AddSingleton<IOpenApiConfigurationOptions>(_ =>
        {
            var options = new OpenApiConfigurationOptions()
            {
                Info = new OpenApiInfo()
                {
                    Version = "1.0.0",
                    Title = "Auth Service API",
                    Description = "API for Authentication and Onboarding",
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
