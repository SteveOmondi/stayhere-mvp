using Microsoft.Azure.Functions.Worker;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using StayHere.Application.Categories.Services;
using StayHere.Application.Common.Interfaces;
using StayHere.Domain.Repositories;
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

        var connectionString = $"Host={dbHost};Port={dbPort};Database={dbName};Username={dbUser};Password={dbPassword}";

        services.AddDbContext<StayHereDbContext>(options =>
            options.UseNpgsql(connectionString));

        services.AddScoped<ICategoryRepository, EfCategoryRepository>();

        services.AddScoped<ICategoryService, CategoryService>();

        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();
    })
    .Build();

host.Run();
