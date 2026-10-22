using Microsoft.Azure.Functions.Worker;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using StayHere.Infrastructure.Persistence;
using StayHere.Application.AiAgent.Configuration;
using StayHere.Application.AiAgent.Services;
using StayHere.Application.AiAgent.Tools;
using StayHere.Application.Common.Interfaces;
using StayHere.Domain.Repositories;
using StayHere.Infrastructure.AiAgent;
using StayHere.Infrastructure.AiAgent.Mcp;
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
        services.AddScoped<ICustomerRepository, EfCustomerRepository>();
        services.AddScoped<IPropertyTermsRepository, EfPropertyTermsRepository>();
        services.AddScoped<IViewingBookingRepository, EfViewingBookingRepository>();
        services.AddScoped<ISavedListingRepository, EfSavedListingRepository>();
        services.AddScoped<IEnquiryRepository, EfEnquiryRepository>();
        services.AddScoped<ITenantApplicationRepository, EfTenantApplicationRepository>();

        services.AddSingleton<IAgentKnowledgeBaseRepository, AgentKnowledgeBaseRepository>();
        services.AddScoped<IAgentConversationRepository, EfAgentConversationRepository>();
        services.AddScoped<IAgentToolExecutor, AgentToolExecutor>();
        // IAgentToolRegistry composes the native AgentToolExecutor above (unchanged, scoped to
        // match its own DbContext-backed lifetime) with whatever tools any configured external
        // MCP servers expose - see Mcp:ExternalServers, empty by default. McpClientToolProvider is
        // a singleton deliberately: it holds only long-lived outbound MCP client sessions, no
        // DbContext/scoped state, so reusing connections across requests is safe and correct.
        services.Configure<McpClientOptions>(config.GetSection(McpClientOptions.SectionName));
        services.AddSingleton<IMcpClientToolProvider, McpClientToolProvider>();
        services.AddScoped<IAgentToolRegistry, AgentToolRegistry>();
        services.AddMemoryCache();
        services.AddHttpClient<IEmbeddingService, GoogleEmbeddingService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(25);
        });
        // ChatServiceFallbackService is the actual IChatService - it tries Groq first (typed
        // HttpClient below, paced by GroqRateLimiter) and only falls through to Claude if Groq fails
        // outright (confirmed live: Groq's free-tier rate limit exhausted mid-chat-turn, used to
        // surface as a raw 500 - see GroqChatService/ChatServiceFallbackService doc comments).
        services.AddHttpClient<GroqChatService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(120);
        });
        services.AddHttpClient<ClaudeChatService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(120);
        });
        services.AddScoped<IChatService, ChatServiceFallbackService>();
        // All three concrete providers are registered as typed HttpClients (not directly bound to
        // IFloorPlanAnalysisService) - FloorPlanAnalysisFallbackService is the actual
        // IFloorPlanAnalysisService and composes them in config-driven order (Claude primary by
        // default - fastest and most accurate - then Gemini, then Qwen/Groq as further fallbacks
        // across entirely different vendors).
        services.AddHttpClient<ClaudeFloorPlanService>(client =>
        {
            // Collapses what Gemini/Qwen do in N+1 sequential calls into ~2 (see the class doc
            // comment), so this should rarely approach Gemini/Qwen's own timeout - kept lower to
            // fail fast into the next fallback provider instead of hanging the request.
            client.Timeout = TimeSpan.FromSeconds(90);
        });
        services.AddHttpClient<GeminiFloorPlanService>(client =>
        {
            // Vision + function-calling calls with an unlimited thinking budget (see
            // GeminiFloorPlanService's generationConfig) can comfortably exceed 30s.
            client.Timeout = TimeSpan.FromSeconds(120);
        });
        services.AddHttpClient<QwenFloorPlanService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(120);
        });
        services.AddScoped<IFloorPlanAnalysisService, FloorPlanAnalysisFallbackService>();
        services.AddHttpClient<IPlacesService, GooglePlacesService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(20);
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
