using System;
using System.Linq;
using System.Threading.Tasks;
using StayHere.Application.Onboarding.Models;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Application.Onboarding.Services;

public class OnboardingService : IOnboardingService
{
    private readonly IUserRepository _userRepository;
    private readonly IPropertyOwnerRepository _propertyOwnerRepository;
    private readonly ICustomerRepository _customerRepository;
    private readonly IWalletRepository _walletRepository;

    public OnboardingService(
        IUserRepository userRepository,
        IPropertyOwnerRepository propertyOwnerRepository,
        ICustomerRepository customerRepository,
        IWalletRepository walletRepository)
    {
        _userRepository = userRepository;
        _propertyOwnerRepository = propertyOwnerRepository;
        _customerRepository = customerRepository;
        _walletRepository = walletRepository;
    }

    public async Task<OnboardUserResponse> OnboardUserAsync(OnboardUserRequest request)
    {
        var user = await _userRepository.GetByIdAsync(request.UserId);
        if (user == null)
        {
            throw new ArgumentException("User not found", nameof(request.UserId));
        }

        if (!Enum.TryParse<UserRole>(request.Role, true, out var roleEnum))
        {
            throw new ArgumentException($"Invalid role: {request.Role}");
        }

        if (!user.Roles.Contains(roleEnum))
        {
            user.Roles.Add(roleEnum);
            await _userRepository.UpdateAsync(user);
        }

        Guid profileId;

        // Provision specific profile
        if (roleEnum == UserRole.PropertyOwner)
        {
            var existingOwner = await _propertyOwnerRepository.GetByUserIdAsync(user.Id);
            if (existingOwner != null) return new OnboardUserResponse(existingOwner.Id, request.Role, "Profile already exists");

            var ownerId = Guid.NewGuid();
            var wallet = new Wallet
            {
                Id = Guid.NewGuid(),
                PropertyOwnerId = ownerId,
                Balance = 0,
                Currency = "KES",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _walletRepository.CreateAsync(wallet);

            var owner = new PropertyOwner
            {
                Id = ownerId,
                UserId = user.Id,
                FullName = request.FullName,
                Phone = request.Phone,
                Email = request.Email,
                WalletId = wallet.Id,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _propertyOwnerRepository.CreateAsync(owner);
            profileId = ownerId;
        }
        else if (roleEnum == UserRole.Tenant)
        {
            var existingTenant = await _customerRepository.GetByUserIdAsync(user.Id);
            if (existingTenant != null) return new OnboardUserResponse(existingTenant.Id, request.Role, "Profile already exists");

            // Assuming a Customer represents a Tenant profile
            var names = request.FullName?.Split(' ', 2) ?? new[] { "Tenant", "" };
            var customer = new Customer
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                FirstName = names[0],
                LastName = names.Length > 1 ? names[1] : "",
                DisplayName = request.FullName,
                Email = request.Email,
                Phone = request.Phone,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                AccountStatus = "Active"
            };
            await _customerRepository.AddAsync(customer);
            profileId = customer.Id;
        }
        else
        {
            throw new NotSupportedException($"Self-onboarding for role {request.Role} is not fully implemented yet.");
        }

        return new OnboardUserResponse(profileId, request.Role, "Onboarding successful");
    }
}
