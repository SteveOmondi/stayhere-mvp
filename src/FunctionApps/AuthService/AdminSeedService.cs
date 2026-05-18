using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.AuthService;

public class AdminSeedService : IHostedService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AdminSeedService> _logger;

    public AdminSeedService(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<AdminSeedService> logger)
    {
        _scopeFactory = scopeFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (!string.Equals(_configuration["SEED_ADMIN_ENABLED"], "true", StringComparison.OrdinalIgnoreCase))
            return;

        var userIdStr = _configuration["SEED_ADMIN_USER_ID"];
        if (!Guid.TryParse(userIdStr, out var userId))
        {
            _logger.LogWarning("AdminSeedService: SEED_ADMIN_USER_ID is missing or not a valid GUID — skipping.");
            return;
        }

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var userRepository = scope.ServiceProvider.GetRequiredService<IUserRepository>();

            var user = await userRepository.GetByIdAsync(userId);

            if (user == null)
            {
                var email = _configuration["SEED_ADMIN_EMAIL"];
                if (string.IsNullOrEmpty(email))
                {
                    _logger.LogWarning("AdminSeedService: User {UserId} not found and SEED_ADMIN_EMAIL is not set — skipping.", userId);
                    return;
                }

                user = new User
                {
                    Id = userId,
                    Email = email,
                    FullName = _configuration["SEED_ADMIN_FULL_NAME"] ?? "Admin",
                    PhoneNumber = _configuration["SEED_ADMIN_PHONE"],
                    Roles = new List<UserRole> { UserRole.Admin },
                    Type = UserType.Individual,
                    CreatedAt = DateTime.UtcNow
                };
                await userRepository.CreateAsync(user);
                _logger.LogInformation("AdminSeedService: Created admin user {UserId} ({Email}).", userId, email);
            }
            else if (!user.Roles.Contains(UserRole.Admin))
            {
                user.Roles.Add(UserRole.Admin);
                await userRepository.UpdateAsync(user);
                _logger.LogInformation("AdminSeedService: Granted Admin role to existing user {UserId}.", userId);
            }
            else
            {
                _logger.LogInformation("AdminSeedService: User {UserId} already has Admin role — nothing to do.", userId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AdminSeedService: Failed to seed admin user — service will continue without it.");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
