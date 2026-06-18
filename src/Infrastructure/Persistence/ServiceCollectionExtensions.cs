using Amazon.Runtime;
using Amazon.S3;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;
using Pgvector.EntityFrameworkCore;
using Pgvector.Npgsql;
using StayHere.Application.Common.Interfaces;
using StayHere.Infrastructure.Cloudflare;

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
            options.UseNpgsql(sp.GetRequiredService<NpgsqlDataSource>(), npgsql =>
            {
                npgsql.UseVector();
                npgsql.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(5), errorCodesToAdd: null);
            }));
        return services;
    }

    /// <summary>
    /// Registers Cloudflare R2 as the <see cref="IStorageService"/> implementation.
    ///
    /// Reads config from the "R2" section (R2__AccountId, R2__AccessKeyId, etc.).
    /// If credentials are not set, a warning is logged and uploads will fail at
    /// runtime — this lets the app start without R2 configured (e.g. unit tests).
    ///
    /// The <see cref="IAmazonS3"/> client is registered as a singleton because the
    /// AWS SDK client is thread-safe and expensive to create.
    /// </summary>
    public static IServiceCollection AddR2Storage(this IServiceCollection services, IConfiguration config)
    {
        services.AddOptions<R2Options>()
            .Bind(config.GetSection(R2Options.Section))
            .ValidateDataAnnotations()
            .ValidateOnStart();   // fail fast — surface missing keys at startup, not first upload

        services.AddSingleton<IAmazonS3>(sp =>
        {
            var opts = sp.GetRequiredService<IOptions<R2Options>>().Value;
            var log = sp.GetRequiredService<ILogger<R2StorageService>>();

            if (!opts.IsConfigured)
            {
                log.LogWarning(
                    "Cloudflare R2 credentials are not fully configured (R2__AccountId / " +
                    "R2__AccessKeyId / R2__SecretAccessKey / R2__BucketName). " +
                    "File uploads will fail until these are set in Application Settings.");
            }

            var s3Config = new AmazonS3Config
            {
                ServiceURL = opts.ServiceUrl,
                // R2 requires path-style addressing (bucket in the path, not hostname)
                ForcePathStyle = true,
                // R2 does not use AWS regions; "auto" is the Cloudflare convention
                AuthenticationRegion = "auto"
            };

            var credentials = new BasicAWSCredentials(opts.AccessKeyId, opts.SecretAccessKey);
            return new AmazonS3Client(credentials, s3Config);
        });

        services.AddSingleton<IStorageService, R2StorageService>();

        return services;
    }
}
