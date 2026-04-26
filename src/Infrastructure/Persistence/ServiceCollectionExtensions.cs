using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Pgvector.EntityFrameworkCore;
using Pgvector.Npgsql;

namespace StayHere.Infrastructure.Persistence;

public static class ServiceCollectionExtensions
{
    /// <summary>Registers <see cref="StayHereDbContext"/> with pgvector-enabled Npgsql data source.</summary>
    public static IServiceCollection AddStayHereDbContext(this IServiceCollection services, string connectionString)
    {
        services.AddSingleton<NpgsqlDataSource>(_ =>
        {
            var builder = new NpgsqlDataSourceBuilder(connectionString);
            builder.UseVector();
            return builder.Build();
        });
        services.AddDbContext<StayHereDbContext>((sp, options) =>
            options.UseNpgsql(sp.GetRequiredService<NpgsqlDataSource>(), npgsql => npgsql.UseVector()));
        return services;
    }
}
