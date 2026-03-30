using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace StayHere.Infrastructure.Persistence;

public class StayHereDbContextFactory : IDesignTimeDbContextFactory<StayHereDbContext>
{
    public StayHereDbContext CreateDbContext(string[] args)
    {
        var dbHost = Environment.GetEnvironmentVariable("DB_HOST");
        if (string.IsNullOrWhiteSpace(dbHost) || dbHost == "$(DB_HOST)") dbHost = "localhost";

        var dbPort = Environment.GetEnvironmentVariable("DB_PORT");
        if (string.IsNullOrWhiteSpace(dbPort) || dbPort == "$(DB_PORT)") dbPort = "5432";

        var dbName = Environment.GetEnvironmentVariable("DB_NAME");
        if (string.IsNullOrWhiteSpace(dbName) || dbName == "$(DB_NAME)") dbName = "stayhere";

        var dbUser = Environment.GetEnvironmentVariable("DB_USER");
        if (string.IsNullOrWhiteSpace(dbUser) || dbUser == "$(DB_USER)") dbUser = "postgres";

        var dbPassword = Environment.GetEnvironmentVariable("DB_PASSWORD");
        if (string.IsNullOrWhiteSpace(dbPassword) || dbPassword == "$(DB_PASSWORD)") dbPassword = "";

        var connectionString = $"Host={dbHost};Port={dbPort};Database={dbName};Username={dbUser};Password={dbPassword}";

        var optionsBuilder = new DbContextOptionsBuilder<StayHereDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        return new StayHereDbContext(optionsBuilder.Options);
    }
}
