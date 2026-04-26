using Microsoft.Extensions.Configuration;

namespace StayHere.Infrastructure.Persistence;

/// <summary>Builds Npgsql connection strings for Azure Functions local.settings / env. Defaults to <c>Ssl Mode=Prefer</c> so local Postgres without TLS works; set <c>DB_SSL_MODE=Require</c> for cloud.</summary>
public static class NpgsqlConnectionStringHelper
{
    /// <summary>
    /// Prefer <c>STAYHERE_DB_CONNECTION</c> or <c>ConnectionStrings:StayHereDb</c> (in local.settings: <c>ConnectionStrings__StayHereDb</c>);
    /// otherwise composes from <c>DB_HOST</c>, <c>DB_PORT</c>, <c>DB_NAME</c>, <c>DB_USER</c>, <c>DB_PASSWORD</c>, <c>DB_SSL_MODE</c>.
    /// When <c>DB_PASSWORD</c> is missing or blank, uses <c>STAYHERE_DB_PASSWORD</c> or <c>PGPASSWORD</c> from the environment (same as <c>dotnet ef</c> design-time).
    /// </summary>
    public static string ResolveFromConfiguration(IConfiguration configuration)
    {
        var full = configuration["STAYHERE_DB_CONNECTION"]
            ?? configuration.GetConnectionString("StayHereDb");
        if (!string.IsNullOrWhiteSpace(full))
            return full.Trim();

        var host = configuration["DB_HOST"] ?? "localhost";
        var port = configuration["DB_PORT"] ?? "5432";
        var database = configuration["DB_NAME"] ?? "stayhere";
        var username = configuration["DB_USER"] ?? "postgres";
        var password = ResolveDbPassword(configuration["DB_PASSWORD"]);
        return Build(host, port, database, username, password, configuration["DB_SSL_MODE"]);
    }

    /// <summary>Uses <paramref name="fromConfiguration"/> when non-empty; otherwise <c>STAYHERE_DB_PASSWORD</c> or <c>PGPASSWORD</c>.</summary>
    public static string ResolveDbPassword(string? fromConfiguration)
    {
        if (!string.IsNullOrWhiteSpace(fromConfiguration))
            return fromConfiguration.Trim();

        return Environment.GetEnvironmentVariable("STAYHERE_DB_PASSWORD")
            ?? Environment.GetEnvironmentVariable("PGPASSWORD")
            ?? "";
    }

    public static string Build(
        string host,
        string port,
        string database,
        string username,
        string password,
        string? sslMode = null)
    {
        var mode = string.IsNullOrWhiteSpace(sslMode) ? "Prefer" : sslMode.Trim();
        var cs = $"Host={host};Port={port};Database={database};Username={username};Password={password};Ssl Mode={mode}";
        if (NeedsTrustServerCertificate(mode))
            cs += ";Trust Server Certificate=true";
        return cs;
    }

    private static bool NeedsTrustServerCertificate(string sslMode) =>
        sslMode.Equals("Require", StringComparison.OrdinalIgnoreCase)
        || sslMode.Equals("VerifyCA", StringComparison.OrdinalIgnoreCase)
        || sslMode.Equals("VerifyFull", StringComparison.OrdinalIgnoreCase);
}
