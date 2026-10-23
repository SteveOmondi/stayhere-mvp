using StayHere.Application.AiAgent.Tools;
using StayHere.Application.Common.Interfaces;
using StayHere.Domain.Repositories;
using StayHere.Infrastructure.AiAgent;
using StayHere.Infrastructure.Caching;
using StayHere.Infrastructure.Persistence;
using StayHere.McpServer;

var builder = WebApplication.CreateBuilder(args);

// Azure Functions' self-hosted-MCP custom handler (host.json's customHandler.port) launches this
// process and expects it to listen on that exact port - FUNCTIONS_CUSTOMHANDLER_PORT is only set
// by the Functions host itself, never set for local dev (Start-StayHereMcpServer.ps1 instead sets
// ASPNETCORE_URLS to the port in stayhere-function-ports.ps1) - only override the bind address when
// that env var is actually present, so local dev's own port config keeps working unmodified.
var functionsCustomHandlerPort = Environment.GetEnvironmentVariable("FUNCTIONS_CUSTOMHANDLER_PORT");
if (!string.IsNullOrEmpty(functionsCustomHandlerPort))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{functionsCustomHandlerPort}");
}

var config = builder.Configuration;
var connectionString = NpgsqlConnectionStringHelper.ResolveFromConfiguration(config);

builder.Services.AddStayHereDbContext(connectionString);
builder.Services.AddStayHereRedisCache(config);
builder.Services.AddMemoryCache();

// Same repositories AgentToolExecutor already depends on in AiAgentService's own Program.cs -
// this project reuses that exact class unchanged (see McpToolAdapter), so it needs the same
// dependency graph even though Phase 1 only ever exercises the anonymous-safe subset of it.
builder.Services.AddScoped<IListingRepository, EfListingRepository>();
builder.Services.AddScoped<ICustomerRepository, EfCustomerRepository>();
builder.Services.AddScoped<IPropertyTermsRepository, EfPropertyTermsRepository>();
builder.Services.AddScoped<IViewingBookingRepository, EfViewingBookingRepository>();
builder.Services.AddScoped<ISavedListingRepository, EfSavedListingRepository>();
builder.Services.AddScoped<IEnquiryRepository, EfEnquiryRepository>();
builder.Services.AddScoped<ITenantApplicationRepository, EfTenantApplicationRepository>();
builder.Services.AddScoped<IAgentToolExecutor, AgentToolExecutor>();

builder.Services.AddHttpClient<IEmbeddingService, GoogleEmbeddingService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(25);
});
builder.Services.AddHttpClient<IPlacesService, GooglePlacesService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(20);
});

builder.Services
    .AddMcpServer()
    // Explicit even though v2 defaults to Stateless=true - this is the one hard requirement of
    // Azure Functions' self-hosted-MCP custom handler preview (stateless + streamable-http only),
    // so pin it rather than relying on a default that could change upstream.
    .WithHttpTransport(options => { options.Stateless = true; })
    .WithStayHereTools();

var app = builder.Build();

app.MapGet("/", () => Results.Ok(new { status = "ready", service = "StayHere.McpServer" }));
app.MapGet("/api/healthz", () => Results.Ok(new { status = "healthy" }));
app.MapMcp("/mcp");

app.Run();
