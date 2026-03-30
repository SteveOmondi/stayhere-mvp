using Microsoft.Azure.Functions.Worker;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using StayHere.Application.Authentication.Services;
using StayHere.Application.Common.Interfaces;
using StayHere.Domain.Repositories;
using StayHere.Infrastructure.Identity;
using StayHere.Infrastructure.Notifications;
using StayHere.Infrastructure.Persistence;

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication()
    .ConfigureServices((context, services) =>
    {
        var config = context.Configuration;

        var dbHost = config["DB_HOST"] ?? "localhost";
        var dbPort = config["DB_PORT"] ?? "5432";
        var dbName = config["DB_NAME"] ?? "stayhere";
        var dbUser = config["DB_USER"] ?? "postgres";
        var dbPassword = config["DB_PASSWORD"] ?? "";

        var connectionString = $"Host={dbHost};Port={dbPort};Database={dbName};Username={dbUser};Password={dbPassword};Ssl Mode=Require;Trust Server Certificate=true";

        services.AddDbContext<StayHereDbContext>(options =>
            options.UseNpgsql(connectionString));

        // Application Services
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IOtpService, OtpService>();

        // Infrastructure Services
        services.AddScoped<IIdentityService, IdentityService>();
        services.AddScoped<INotificationService, NotificationService>();
        
        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();
    })
    .Build();

await host.RunAsync();
