using StayHere.Application.Authentication.Models;
using StayHere.Application.Common.Interfaces;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Application.Authentication.Services;

public class AuthService : IAuthService
{
    private readonly IIdentityService _identityService;
    private readonly IOtpService _otpService;
    private readonly IUserRepository _userRepository;

    public AuthService(
        IIdentityService identityService,
        IOtpService otpService,
        IUserRepository userRepository)
    {
        _identityService = identityService;
        _otpService = otpService;
        _userRepository = userRepository;
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
                Roles = new List<UserRole> { UserRole.Tenant },
                CreatedAt = DateTime.UtcNow
            };
            await _userRepository.CreateAsync(user);
        }

        var token = await _identityService.GenerateJwtAsync(user.Id, user.Email, user.Roles.Select(r => r.ToString()).ToList());
        
        return new AuthResponse(token, MapToDto(user));
    }

    public async Task<bool> RequestOtpAsync(OtpRequest request)
    {
        var otp = await _otpService.GenerateOtpAsync(request.Target, MapOtpType(request.Type));
        await _otpService.SendOtpAsync(request.Target, otp, MapOtpType(request.Type));
        return true;
    }

    public async Task<AuthResponse> VerifyOtpAndLoginAsync(OtpVerificationRequest request)
    {
        var isValid = await _otpService.VerifyOtpAsync(request.Target, request.Code);
        if (!isValid)
        {
            throw new Exception("Invalid or expired OTP.");
        }

        var user = await _userRepository.GetByEmailAsync(request.Target) 
                   ?? await _userRepository.GetByPhoneNumberAsync(request.Target);

        if (user == null)
        {
            throw new Exception("User not found.");
        }

        var token = await _identityService.GenerateJwtAsync(user.Id, user.Email, user.Roles.Select(r => r.ToString()).ToList());
        
        return new AuthResponse(token, MapToDto(user));
    }

    public async Task<UserDto> RegisterAsync(RegisterRequest request)
    {
        var existing = await _userRepository.GetByEmailAsync(request.Email);
        if (existing != null) throw new Exception("User already exists.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = request.Email,
            PhoneNumber = request.PhoneNumber,
            FullName = request.FullName,
            Roles = new List<UserRole> { UserRole.Tenant }, // Default role
            Type = Enum.TryParse<UserType>(request.UserType, true, out var type) ? type : UserType.Individual,
            CreatedAt = DateTime.UtcNow
        };

        await _userRepository.CreateAsync(user);
        return MapToDto(user);
    }

    private UserDto MapToDto(User user) => 
        new UserDto(
            user.Id, 
            user.Email, 
            user.FullName, 
            user.Roles.Select(r => r.ToString()).ToList(),
            user.Type.ToString(),
            user.OrganizationId,
            user.Organization?.Name);

    private OtpType MapOtpType(OtpTypeDto type) => type switch
    {
        OtpTypeDto.Email => OtpType.Email,
        OtpTypeDto.Sms => OtpType.Sms,
        OtpTypeDto.WhatsApp => OtpType.WhatsApp,
        _ => throw new ArgumentOutOfRangeException(nameof(type), type, null)
    };
}
