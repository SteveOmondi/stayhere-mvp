using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using StayHere.Application.AiAgent.Services;
using StayHere.Application.Common.Interfaces;
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
    })
    .Build();

host.Run();
