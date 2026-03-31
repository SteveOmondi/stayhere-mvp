using StayHere.Domain.Entities;

namespace StayHere.Application.Onboarding.Models;

public record OnboardUserRequest(
    Guid UserId,
    string Role,
    string FullName,
    string Phone,
    string Email
);

public record OnboardUserResponse(
    Guid ProfileId,
    string Role,
    string Message
);
