using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using StayHere.Application.Common.Interfaces;
using StayHere.Application.Properties.Services;
using StayHere.Domain.Repositories;
using StayHere.Infrastructure.AiAgent;
using StayHere.Infrastructure.Caching;
using StayHere.Infrastructure.Persistence;

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication()
    .ConfigureServices((context, services) =>
    {
        var config = context.Configuration;

        var connectionString = NpgsqlConnectionStringHelper.ResolveFromConfiguration(config);

        services.AddStayHereDbContext(connectionString);

        services.AddStayHereRedisCache(config);

        services.AddMemoryCache();
        services.AddHttpClient<IEmbeddingService, OpenRouterEmbeddingService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(25);
        });
        services.AddScoped<IPropertyRepository, EfPropertyRepository>();
        services.AddScoped<IListingRepository, EfListingRepository>();
        services.AddScoped<IPropertyService, PropertyService>();
        services.AddScoped<IListingService, ListingService>();

        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();
    })
    .Build();

await host.RunAsync();
