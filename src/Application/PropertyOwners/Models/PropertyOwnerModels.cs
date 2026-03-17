namespace StayHere.Application.PropertyOwners.Models;

public record CreatePropertyOwnerRequest(
    string FullName,
    string Phone,
    string Email,
    Guid? UserId = null
);

public record UpdatePropertyOwnerRequest(
    string? FullName,
    string? Phone,
    string? Email
);

public record PropertyOwnerDto(
    Guid Id,
    Guid? UserId,
    string FullName,
    string Phone,
    string Email,
    Guid WalletId,
    decimal WalletBalance,
    string WalletCurrency,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record WalletDto(
    Guid Id,
    Guid PropertyOwnerId,
    decimal Balance,
    string Currency,
    DateTime UpdatedAt
);

public record CreateAgentRequest(
    string FullName,
    string Phone,
    string? Email
);

public record AgentDto(
    Guid Id,
    Guid PropertyOwnerId,
    string FullName,
    string Phone,
    string? Email,
    DateTime CreatedAt
);

public record CreateCaretakerRequest(
    string FullName,
    string Phone,
    string? Email
);

public record CaretakerDto(
    Guid Id,
    Guid PropertyOwnerId,
    string FullName,
    string Phone,
    string? Email,
    DateTime CreatedAt
);

public record WithdrawRequest(decimal Amount, string? Reference = null);
