using StayHere.Application.Authentication.Models;
using StayHere.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Application.Authentication.Services;

public class AuthService : IAuthService
{
    private readonly IIdentityService _identityService;
    private readonly IOtpService _otpService;
    private readonly IUserRepository _userRepository;
    private readonly IPropertyOwnerRepository _propertyOwnerRepository;
    private readonly ICustomerRepository _customerRepository;
    private readonly IWalletRepository _walletRepository;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IIdentityService identityService,
        IOtpService otpService,
        IUserRepository userRepository,
        IPropertyOwnerRepository propertyOwnerRepository,
        ICustomerRepository customerRepository,
        IWalletRepository walletRepository,
        ILogger<AuthService> logger)
    {
        _identityService = identityService;
        _otpService = otpService;
        _userRepository = userRepository;
        _propertyOwnerRepository = propertyOwnerRepository;
        _customerRepository = customerRepository;
        _walletRepository = walletRepository;
        _logger = logger;
    }

    public async Task<AuthResponse> LoginWithEntraAsync(string entraToken)
    {
        var (succeeded, entraObjectId, email, name) = await _identityService.AuthenticateWithEntraAsync(entraToken);
        
        if (!succeeded || string.IsNullOrEmpty(entraObjectId))
        {
            throw new Exception("Entra ID authentication failed.");
        }

        var user = await _userRepository.GetByEntraObjectIdAsync(entraObjectId);
        if (user == null)
        {
            // Auto-registration for Social Sign-on
            user = new User
            {
                Id = Guid.NewGuid(),
                EntraObjectId = entraObjectId,
                Email = email ?? "guest@stayhere.com",
                FullName = name,
                Roles = new List<UserRole>(), // No initial role until onboarded
                CreatedAt = DateTime.UtcNow
            };
            await _userRepository.CreateAsync(user);
        }

        var token = await _identityService.GenerateJwtAsync(user);
        
        return new AuthResponse
        {
            Succeeded = true,
            Message = "Login successful",
            Token = token,
            User = MapToDto(user)
        };
    }

    public async Task<OtpResponse> RequestOtpAsync(OtpRequest request)
    {
        var appMode = Environment.GetEnvironmentVariable("APP_MODE") ?? "live";
        var target = request.Target.Trim().ToLower();
        if (!target.Contains("@")) target = target.Replace("+", "");
        
        _logger.LogInformation("Requesting OTP for {Target} (Mode: {Mode})", target, appMode);

        // Generate the OTP
        var otp = await _otpService.GenerateOtpAsync(target, MapOtpType(request.Type));
        
        // Send the OTP (Skip if in Test Mode)
        var success = true;
        if (!appMode.Equals("test", StringComparison.OrdinalIgnoreCase))
        {
            success = await _otpService.SendOtpAsync(request.Target, otp, MapOtpType(request.Type));
        }
        else
        {
            _logger.LogInformation("Test Mode active: Skipping SMS delivery for {Target}", request.Target);
        }

        return new OtpResponse
        {
            Succeeded = success,
            Message = success ? "Verification code ready." : "Failed to deliver verification code.",
            Otp = appMode.Equals("test", StringComparison.OrdinalIgnoreCase) ? otp : null
        };
    }

    public async Task<AuthResponse> VerifyOtpAndLoginAsync(OtpVerificationRequest request)
    {
        if (string.IsNullOrEmpty(request.Target)) throw new Exception("Target (Email/Phone) is required.");
        if (string.IsNullOrEmpty(request.Code)) throw new Exception("OTP code is required.");

        var target = request.Target.Trim().ToLower();
        if (!target.Contains("@")) target = target.Replace("+", "");

        _logger.LogInformation("Verifying OTP for {Target} with code {Code}", target, request.Code);

        var isValid = await _otpService.VerifyOtpAsync(target, request.Code);
        if (!isValid)
        {
            _logger.LogWarning("OTP verification failed for {Target}", target);
            throw new Exception("Invalid or expired OTP.");
        }

        var user = await _userRepository.GetByEmailAsync(target) 
                   ?? await _userRepository.GetByPhoneNumberAsync(target);

        if (user == null)
        {
            _logger.LogInformation("Auto-registering new user for verified target {Target}", target);
            
            var isEmail = target.Contains("@");
            user = new User
            {
                Id = Guid.NewGuid(),
                Email = isEmail ? target : $"{target}@stayhere.com", // Placeholder email for phone users
                PhoneNumber = isEmail ? null : target,
                Roles = new List<UserRole>(), // No initial role until onboarded
                Type = UserType.Individual,
                CreatedAt = DateTime.UtcNow
            };
            await _userRepository.CreateAsync(user);
        }

        var token = await _identityService.GenerateJwtAsync(user);
        
        return new AuthResponse
        {
            Succeeded = true,
            Message = "Login successful",
            Token = token,
            User = MapToDto(user)
        };
    }

    public async Task<UserDto> RegisterAsync(RegisterRequest request)
    {
        var existing = await _userRepository.GetByEmailAsync(request.Email);
        if (existing != null) throw new Exception("User already exists.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = request.Email,
            PhoneNumber = request.PhoneNumber?.Replace("+", ""),
            FullName = request.FullName,
            Roles = new List<UserRole>(), // No default role
            Type = Enum.TryParse<UserType>(request.UserType, true, out var type) ? type : UserType.Individual,
            CreatedAt = DateTime.UtcNow
        };

        await _userRepository.CreateAsync(user);
        return MapToDto(user);
    }

    public async Task<List<UserProfileDto>> GetProfilesAsync(Guid userId)
    {
        var profiles = new List<UserProfileDto>();
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null || user.Roles == null) return profiles;

        if (user.Roles.Contains(UserRole.PropertyOwner))
        {
            var owner = await _propertyOwnerRepository.GetByUserIdAsync(userId);
            if (owner != null)
            {
                profiles.Add(new UserProfileDto(owner.Id, UserRole.PropertyOwner.ToString(), owner.FullName ?? user.Email));
            }
        }

        if (user.Roles.Contains(UserRole.Tenant))
        {
            var tenant = await _customerRepository.GetByUserIdAsync(userId);
            if (tenant != null)
            {
                profiles.Add(new UserProfileDto(tenant.Id, UserRole.Tenant.ToString(), tenant.DisplayName ?? user.Email));
            }
        }
        return profiles;
    }

    public async Task<bool> UpdateProfileAsync(UpdateProfileRequest request)
    {
        var user = await _userRepository.GetByIdAsync(request.UserId);
        if (user == null) return false;

        if (!string.IsNullOrEmpty(request.PhoneNumber))
        {
            var sanitizedPhone = request.PhoneNumber.Replace("+", "");
            // Check if phone number is already taken by another user
            var existing = await _userRepository.GetByPhoneNumberAsync(sanitizedPhone);
            
            if (existing != null && existing.Id != user.Id)
            {
                // ACCOUNT MERGE LOGIC: 
                // If the existing user is just a 'stray' OTP account (no Entra ID and no Roles), we can merge/transfer.
                if (string.IsNullOrEmpty(existing.EntraObjectId) && (existing.Roles == null || existing.Roles.Count == 0))
                {
                    _logger.LogInformation("Merging stray OTP account {StrayId} into primary account {PrimaryId}", existing.Id, user.Id);
                    
                    // 1. Remove phone from stray account to avoid unique constraint issues
                    existing.PhoneNumber = null;
                    await _userRepository.UpdateAsync(existing);
                    
                    // 2. We could potentially transfer other data here (e.g. Bookings) if they existed.
                    // For now, we'll just allow the primary user to take the phone number.
                }
                else
                {
                    throw new Exception("This phone number is already linked to another verified account. Please contact support for merging.");
                }
            }
            user.PhoneNumber = sanitizedPhone;
        }

        if (!string.IsNullOrEmpty(request.FullName))
        {
            user.FullName = request.FullName;
        }

        // Handle Role Assignment
        if (!string.IsNullOrEmpty(request.Role))
        {
            if (Enum.TryParse<UserRole>(request.Role, true, out var selectedRole))
            {
                if (!user.Roles.Contains(selectedRole))
                {
                    if (user.Roles.Count == 0)
                    {
                        // INITIAL ROLE: Allow direct assignment and profile creation
                        _logger.LogInformation("Assigning initial role {Role} to user {UserId}", selectedRole, user.Id);
                        user.Roles.Add(selectedRole);

                        if (selectedRole == UserRole.Tenant)
                        {
                            var customer = await _customerRepository.GetByUserIdAsync(user.Id);
                            if (customer == null)
                            {
                                await _customerRepository.AddAsync(new Customer
                                {
                                    Id = Guid.NewGuid(),
                                    UserId = user.Id,
                                    Email = user.Email,
                                    DisplayName = user.FullName,
                                    Phone = user.PhoneNumber,
                                    CreatedAt = DateTime.UtcNow
                                });
                            }
                        }
                        else if (selectedRole == UserRole.PropertyOwner)
                        {
                            var owner = await _propertyOwnerRepository.GetByUserIdAsync(user.Id);
                            if (owner == null)
                            {
                                var ownerId = Guid.NewGuid();
                                var walletId = Guid.NewGuid();
                                
                                // Create Wallet First
                                await _walletRepository.CreateAsync(new Wallet
                                {
                                    Id = walletId,
                                    PropertyOwnerId = ownerId,
                                    Balance = 0,
                                    Currency = "KES",
                                    CreatedAt = DateTime.UtcNow
                                });

                                // Create Owner
                                await _propertyOwnerRepository.CreateAsync(new PropertyOwner
                                {
                                    Id = ownerId,
                                    UserId = user.Id,
                                    Email = user.Email,
                                    FullName = user.FullName ?? string.Empty,
                                    Phone = user.PhoneNumber ?? string.Empty,
                                    WalletId = walletId,
                                    CreatedAt = DateTime.UtcNow
                                });
                            }
                        }
                    }
                    else
                    {
                        // UPGRADE REQUEST: User already has roles, log for admin review
                        _logger.LogWarning("UPGRADE REQUEST: User {UserId} (Existing: {Roles}) wants to add {NewRole}", 
                            user.Id, string.Join(",", user.Roles), selectedRole);
                        // In a full implementation, we would create a record in an UpgradeRequests table here.
                    }
                }
            }
        }

        await _userRepository.UpdateAsync(user);
        
        // Also update existing profiles
        var existingCustomer = await _customerRepository.GetByUserIdAsync(user.Id);
        if (existingCustomer != null)
        {
            existingCustomer.DisplayName = user.FullName;
            existingCustomer.Phone = user.PhoneNumber;
            await _customerRepository.UpdateAsync(existingCustomer);
        }

        var existingOwner = await _propertyOwnerRepository.GetByUserIdAsync(user.Id);
        if (existingOwner != null)
        {
            existingOwner.FullName = user.FullName ?? string.Empty;
            existingOwner.Phone = user.PhoneNumber ?? string.Empty;
            await _propertyOwnerRepository.UpdateAsync(existingOwner);
        }

        return true;
    }

    public async Task<(List<UserDto> Users, int Total)> GetAllUsersAsync(int page, int pageSize)
    {
        var (users, total) = await _userRepository.GetAllAsync(page, pageSize);
        return (users.Select(MapToDto).ToList(), total);
    }

    public async Task<UserDto?> GetUserByIdAsync(Guid id)
    {
        var user = await _userRepository.GetByIdAsync(id);
        return user == null ? null : MapToDto(user);
    }

    private UserDto MapToDto(User user) =>
        new UserDto(
            user.Id, 
            user.Email, 
            user.FullName, 
            (user.Roles ?? new List<UserRole>()).Select(r => r.ToString()).ToList(),
            user.Type.ToString(),
            user.OrganizationId,
            user.Organization?.Name,
            user.Roles?.Any() ?? false);

    private OtpType MapOtpType(OtpTypeDto type) => type switch
    {
        OtpTypeDto.Email => OtpType.Email,
        OtpTypeDto.Sms => OtpType.Sms,
        OtpTypeDto.WhatsApp => OtpType.WhatsApp,
        _ => throw new ArgumentOutOfRangeException(nameof(type), type, null)
    };
}
