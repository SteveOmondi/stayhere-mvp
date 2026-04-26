using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using StayHere.Application.Common.Interfaces;
using StayHere.Application.PropertyOwners.Services;
using StayHere.Domain.Repositories;
using StayHere.Infrastructure.Persistence;

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication()
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
    })
    .Build();

await host.RunAsync();
