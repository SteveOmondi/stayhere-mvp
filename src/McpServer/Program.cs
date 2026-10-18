using StayHere.Application.AiAgent.Tools;
using StayHere.Application.Common.Interfaces;
using StayHere.Domain.Repositories;
using StayHere.Infrastructure.AiAgent;
using StayHere.Infrastructure.Caching;
using StayHere.Infrastructure.Persistence;
using StayHere.McpServer;

var builder = WebApplication.CreateBuilder(args);

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
    .WithHttpTransport()
    .WithStayHereTools();

var app = builder.Build();

app.MapMcp("/mcp");

app.Run();
