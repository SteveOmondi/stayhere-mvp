using Microsoft.Azure.Functions.Worker;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StayHere.Infrastructure.Persistence;
using StayHere.PaymentsService.Mpesa;
using StayHere.Shared.Middleware;

using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Abstractions;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Configurations;
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

        // ── Database ──────────────────────────────────────────────────────────
        var connectionString = NpgsqlConnectionStringHelper.ResolveFromConfiguration(config);
        services.AddStayHereDbContext(connectionString);

        // ── Memory cache (used by MpesaService for OAuth token) ───────────────
        services.AddMemoryCache();

        // ── M-Pesa options ────────────────────────────────────────────────────
        // Azure Function App Settings use double-underscore as a section delimiter,
        // e.g. "Mpesa__ConsumerKey" binds to MpesaOptions.ConsumerKey.
        services.AddOptions<MpesaOptions>()
            .Bind(config.GetSection(MpesaOptions.Section))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        // ── M-Pesa HTTP client ────────────────────────────────────────────────
        // Named client "mpesa" with a 30-second timeout. Safaricom's sandbox can
        // be slow; production responses typically arrive within 5 seconds.
        services.AddHttpClient("mpesa", client =>
        {
            client.Timeout = TimeSpan.FromSeconds(30);
            client.DefaultRequestHeaders.Accept.Add(
                new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
        });

        services.AddScoped<MpesaService>();

        // ── Observability ─────────────────────────────────────────────────────
        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();

        // ── OpenAPI ───────────────────────────────────────────────────────────
        services.AddSingleton<IOpenApiConfigurationOptions>(_ =>
            new OpenApiConfigurationOptions
            {
                Info = new OpenApiInfo
                {
                    Version = "1.0.0",
                    Title = "Payments Service API",
                    Description = "M-Pesa STK Push and C2B payment processing for StayHere"
                }
            });
    })
    .Build();

await ValidateMpesaConfigAsync(host);
await ApplyMigrationsAsync(host);
await host.RunAsync();

// ── Startup helpers ───────────────────────────────────────────────────────────

static Task ValidateMpesaConfigAsync(IHost host)
{
    var opts = host.Services.GetRequiredService<IOptions<MpesaOptions>>().Value;
    var log = host.Services.GetRequiredService<ILogger<MpesaOptions>>();

    if (!opts.IsConfigured)
        log.LogWarning(
            "M-Pesa credentials (Mpesa__ConsumerKey / Mpesa__ConsumerSecret) are not set. " +
            "STK Push calls will use sandbox simulation mode. Set them in Application Settings before going live.");
    else
        log.LogInformation(
            "M-Pesa configured — environment: {Env}, ShortCode: {ShortCode}.",
            opts.Environment, opts.ShortCode);

    return Task.CompletedTask;
}

static async Task ApplyMigrationsAsync(IHost host)
{
    await using var scope = host.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<StayHereDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<StayHereDbContext>>();
    try
    {
        var pending = (await db.Database.GetPendingMigrationsAsync()).ToList();
        if (pending.Count > 0)
        {
            logger.LogInformation(
                "Applying {Count} pending migration(s): {Names}",
                pending.Count, string.Join(", ", pending));
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
