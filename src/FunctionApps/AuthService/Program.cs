using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using StayHere.Application.Authentication.Services;
using StayHere.Application.Common.Interfaces;
using StayHere.Domain.Repositories;
using StayHere.Infrastructure.Identity;
using StayHere.Infrastructure.Notifications;
using StayHere.Infrastructure.Persistence;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureServices(services =>
    {
        // Application Services
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IOtpService, OtpService>();

        // Infrastructure Services
        services.AddScoped<IIdentityService, IdentityService>();
        services.AddScoped<INotificationService, NotificationService>();
        
        // Repositories (InMemory for now)
        services.AddSingleton<IUserRepository, InMemoryUserRepository>();
        services.AddSingleton<IOtpRepository, InMemoryOtpRepository>();
    })
    .Build();

host.Run();
