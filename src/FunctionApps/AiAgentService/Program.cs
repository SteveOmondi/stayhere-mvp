using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
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
        services.AddHttpClient<IEmbeddingService, OpenRouterEmbeddingService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(25);
        });
        services.AddHttpClient<IOpenRouterChatService, OpenRouterChatService>(client =>
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

host.Run();
