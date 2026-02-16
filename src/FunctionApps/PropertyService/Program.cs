using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using StayHere.Application.Common.Interfaces;
using StayHere.Application.Properties.Services;
using StayHere.Domain.Repositories;
using StayHere.Infrastructure.Persistence;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureServices(services =>
    {
        // Application Services
        services.AddScoped<IPropertyService, PropertyService>();
        services.AddScoped<ICacheService, RedisCacheService>();

        // Infrastructure / Persistence
        services.AddSingleton<IPropertyRepository>(sp => 
            new PropertyRepository("Host=localhost;Database=stayhere;Username=postgres;Password=password"));
            
        services.AddSingleton<IPropertyAttributeRepository>(sp => 
            new PropertyAttributeRepository("mongodb://localhost:27017", "stayhere"));

        // Redis
        services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = "localhost:6379"; // Environment variable in production
            options.InstanceName = "stayhere_";
        });
    })
    .Build();

host.Run();
