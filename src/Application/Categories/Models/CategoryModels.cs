namespace StayHere.Application.Categories.Models;

public record CreateCategoryRequest(
    string Name,
    string? Description,
    string? IconUrl,
    string Country,
    string City,
    bool IsActive = true,
    int SortOrder = 0
);

public record UpdateCategoryRequest(
    string? Name,
    string? Description,
    string? IconUrl,
    string? Country,
    string? City,
    bool? IsActive,
    int? SortOrder
);

public record CategoryDto(
    Guid Id,
    string Name,
    string? Description,
    string? IconUrl,
    string Country,
    string City,
    bool IsActive,
    int SortOrder,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
