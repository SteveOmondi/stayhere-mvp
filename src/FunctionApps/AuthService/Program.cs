using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using StayHere.Application.Authentication.Services;
using StayHere.Application.Common.Interfaces;
using StayHere.Application.Onboarding.Services;
using StayHere.Domain.Repositories;
using StayHere.Infrastructure.Identity;
using StayHere.Infrastructure.Notifications;
using StayHere.Infrastructure.Persistence;

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication()
    .ConfigureServices((context, services) =>
    {
        var config = context.Configuration;

        var connectionString = NpgsqlConnectionStringHelper.ResolveFromConfiguration(config);

        services.AddStayHereDbContext(connectionString);

        // Application Services
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IOtpService, OtpService>();
        services.AddScoped<IOnboardingService, OnboardingService>();

        // Infrastructure Services
        services.AddScoped<IIdentityService, IdentityService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IUserRepository, EfUserRepository>();
        services.AddScoped<IOtpRepository, EfOtpRepository>();
        services.AddScoped<IPropertyOwnerRepository, EfPropertyOwnerRepository>();
        services.AddScoped<ICustomerRepository, EfCustomerRepository>();
        services.AddScoped<IWalletRepository, EfWalletRepository>();
        
        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();
    })
    .Build();

await host.RunAsync();
