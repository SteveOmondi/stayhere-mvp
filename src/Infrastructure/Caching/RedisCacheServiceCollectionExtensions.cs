using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StackExchange.Redis;
using StayHere.Application.Common.Interfaces;

namespace StayHere.Infrastructure.Caching;

public static class RedisCacheServiceCollectionExtensions
{
    /// <summary>
    /// Registers <see cref="IConnectionMultiplexer"/> (singleton) and <see cref="ICacheService"/> when <paramref name="connectionStringKey"/> is set.
    /// Sets StackExchange.Redis <c>AbortOnConnectFail = false</c> so a cold Redis does not fail host startup.
    /// </summary>
    public static IServiceCollection AddStayHereRedisCache(
        this IServiceCollection services,
        IConfiguration configuration,
        string connectionStringKey = "REDIS_CONNECTION")
    {
        var conn = configuration[connectionStringKey];
        if (string.IsNullOrWhiteSpace(conn))
        {
            services.AddSingleton<ICacheService, NoOpCacheService>();
            return services;
        }

        services.AddSingleton<IConnectionMultiplexer>(_ =>
        {
            var options = ConfigurationOptions.Parse(conn);
            options.AbortOnConnectFail = false;
            return ConnectionMultiplexer.Connect(options);
        });
        services.AddSingleton<ICacheService, RedisCacheService>();
        return services;
    }
}
