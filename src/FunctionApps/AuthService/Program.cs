using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using StayHere.AuthService;
using StayHere.Application.Authentication.Services;
using StayHere.Application.Common.Interfaces;
using StayHere.Application.Onboarding.Services;
using StayHere.Domain.Repositories;
using StayHere.Infrastructure.Identity;
using StayHere.Infrastructure.Notifications;
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

await host.RunAsync();
