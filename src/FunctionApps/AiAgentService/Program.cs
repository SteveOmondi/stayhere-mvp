using Microsoft.Azure.Functions.Worker;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using StayHere.Infrastructure.Persistence;
using StayHere.Application.AiAgent.Services;
using StayHere.Application.Common.Interfaces;
using StayHere.Domain.Repositories;
using StayHere.Infrastructure.AiAgent;
using StayHere.Infrastructure.Caching;
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

        services.AddStayHereRedisCache(config);

        services.AddScoped<IListingRepository, EfListingRepository>();

        services.AddSingleton<IAgentKnowledgeBaseRepository, AgentKnowledgeBaseRepository>();
        services.AddSingleton<IAgentConversationRepository, AgentConversationRepository>();
        services.AddMemoryCache();
        services.AddHttpClient<IEmbeddingService, GoogleEmbeddingService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(25);
        });
        services.AddHttpClient<IChatService, GroqChatService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(120);
        });
        services.AddScoped<IAiAgentService, AiAgentService>();

        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();

        services.AddSingleton<IOpenApiConfigurationOptions>(_ =>
        {
            var options = new OpenApiConfigurationOptions()
            {
                Info = new OpenApiInfo()
                {
                    Version = "1.0.0",
                    Title = "AI Agent Service API",
                    Description = "API for AI-powered property assistance",
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
