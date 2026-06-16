using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Npgsql;
using Pgvector.EntityFrameworkCore;
using Pgvector.Npgsql;

namespace StayHere.Infrastructure.Persistence;

/// <summary>Design-time factory so <c>dotnet ef</c> can build the model with pgvector-enabled Npgsql (same as runtime).</summary>
public sealed class StayHereDbContextFactory : IDesignTimeDbContextFactory<StayHereDbContext>
{
    public StayHereDbContext CreateDbContext(string[] args)
    {
        var connectionString = ResolveConnectionString();

        // Reconcile migration history table if old migrations were squashed/consolidated
        try
        {
            using var conn = new NpgsqlConnection(connectionString);
            conn.Open();

            var tableExists = false;
            using (var cmd = new NpgsqlCommand("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '__EFMigrationsHistory')", conn))
            {
                tableExists = (bool)(cmd.ExecuteScalar() ?? false);
            }

            if (tableExists)
            {
                var hasOld = false;
                using (var cmd = new NpgsqlCommand("SELECT COUNT(*) FROM \"__EFMigrationsHistory\" WHERE \"MigrationId\" IN ('20260610000000_AddRentalFlow', '20260611000000_AddMpesaPaymentColumns')", conn))
                {
                    hasOld = Convert.ToInt32(cmd.ExecuteScalar() ?? 0) > 0;
                }

                if (hasOld)
                {
                    Console.WriteLine("StayHereDbContextFactory: Old migrations detected in DB. Aligning migration history table to consolidated migration...");
                    using (var tx = conn.BeginTransaction())
                    {
                        using (var cmd = new NpgsqlCommand("DELETE FROM \"__EFMigrationsHistory\" WHERE \"MigrationId\" IN ('20260610000000_AddRentalFlow', '20260611000000_AddMpesaPaymentColumns')", conn, tx))
                        {
                            cmd.ExecuteNonQuery();
                        }
                        using (var cmd = new NpgsqlCommand("INSERT INTO \"__EFMigrationsHistory\" (\"MigrationId\", \"ProductVersion\") VALUES ('20260616105508_AddRentalFlowAndMpesaPayments', '9.0.0') ON CONFLICT DO NOTHING", conn, tx))
                        {
                            cmd.ExecuteNonQuery();
                        }
                        tx.Commit();
                    }
                    Console.WriteLine("StayHereDbContextFactory: Migration history table aligned successfully.");
                }
            }
        }
        catch (Exception ex)
        {
            // Logging but not crashing so that offline builds or migrations against a not-yet-created DB still function
            Console.WriteLine($"StayHereDbContextFactory: Warning: Migration alignment check skipped due to exception: {ex.Message}");
        }

        var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
        dataSourceBuilder.UseVector();
        var dataSource = dataSourceBuilder.Build();

        var optionsBuilder = new DbContextOptionsBuilder<StayHereDbContext>();
        optionsBuilder.UseNpgsql(dataSource, npgsql => npgsql.UseVector());
        return new StayHereDbContext(optionsBuilder.Options);
    }

    private static string ResolveConnectionString()
    {
        var fromEnv = Environment.GetEnvironmentVariable("STAYHERE_DB_CONNECTION");
        if (!string.IsNullOrWhiteSpace(fromEnv))
            return fromEnv;

        // Check for individual environment variables (common in CI/CD)
        var host = Environment.GetEnvironmentVariable("DB_HOST");
        if (!string.IsNullOrWhiteSpace(host))
        {
            var port = Environment.GetEnvironmentVariable("DB_PORT") ?? "5432";
            var name = Environment.GetEnvironmentVariable("DB_NAME") ?? "stayhere";
            var user = Environment.GetEnvironmentVariable("DB_USER") ?? "postgres";
            var password = NpgsqlConnectionStringHelper.ResolveDbPassword(Environment.GetEnvironmentVariable("DB_PASSWORD"));
            var sslMode = Environment.GetEnvironmentVariable("DB_SSL_MODE");
            return NpgsqlConnectionStringHelper.Build(host, port, name, user, password, sslMode);
        }

        var path = FindLocalSettingsPath();
        if (path != null)
        {
            using var doc = JsonDocument.Parse(File.ReadAllText(path));
            if (doc.RootElement.TryGetProperty("Values", out var values))
            {
                static string? ReadOptional(JsonElement v, string key) =>
                    v.TryGetProperty(key, out var p) && p.ValueKind == JsonValueKind.String
                        ? p.GetString()
                        : null;

                static string Read(JsonElement v, string key, string fallback) =>
                    v.TryGetProperty(key, out var p) && p.ValueKind == JsonValueKind.String
                        ? p.GetString() ?? fallback
                        : fallback;

                var fullCs = ReadOptional(values, "STAYHERE_DB_CONNECTION")
                    ?? ReadOptional(values, "ConnectionStrings__StayHereDb");
                if (!string.IsNullOrWhiteSpace(fullCs))
                    return fullCs.Trim();

                var h = Read(values, "DB_HOST", "localhost");
                var p = Read(values, "DB_PORT", "5432");
                var n = Read(values, "DB_NAME", "stayhere");
                var u = Read(values, "DB_USER", "postgres");
                var pwd = NpgsqlConnectionStringHelper.ResolveDbPassword(ReadOptional(values, "DB_PASSWORD"));
                var ssl = Read(values, "DB_SSL_MODE", "");
                return NpgsqlConnectionStringHelper.Build(h, p, n, u, pwd,
                    string.IsNullOrEmpty(ssl) ? null : ssl);
            }
        }

        return NpgsqlConnectionStringHelper.Build("localhost", "5432", "stayhere", "postgres", "", null);
    }

    private static string? FindLocalSettingsPath()
    {
        var dir = new DirectoryInfo(Directory.GetCurrentDirectory());
        for (var i = 0; i < 10 && dir != null; i++)
        {
            var candidate = Path.Combine(dir.FullName, "src", "FunctionApps", "PropertyService", "local.settings.json");
            if (File.Exists(candidate))
                return candidate;

            if (dir.Name == "PropertyService")
            {
                var local = Path.Combine(dir.FullName, "local.settings.json");
                if (File.Exists(local))
                    return local;
            }

            dir = dir.Parent;
        }

        return null;
    }
}
