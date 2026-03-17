using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace StayHere.Infrastructure.Persistence;

public class StayHereDbContextFactory : IDesignTimeDbContextFactory<StayHereDbContext>
{
    public StayHereDbContext CreateDbContext(string[] args)
    {
        var dbHost = Environment.GetEnvironmentVariable("DB_HOST") ?? "localhost";
        var dbPort = Environment.GetEnvironmentVariable("DB_PORT") ?? "5432";
        var dbName = Environment.GetEnvironmentVariable("DB_NAME") ?? "stayhere";
        var dbUser = Environment.GetEnvironmentVariable("DB_USER") ?? "postgres";
        var dbPassword = Environment.GetEnvironmentVariable("DB_PASSWORD") ?? "kelly985";

        var connectionString = $"Host={dbHost};Port={dbPort};Database={dbName};Username={dbUser};Password={dbPassword}";

        var optionsBuilder = new DbContextOptionsBuilder<StayHereDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        return new StayHereDbContext(optionsBuilder.Options);
    }
}
