namespace StayHere.Application.Categories.Models;

// ── Parent Category ──────────────────────────────────────────────────────────

public record CreateCategoryRequest(
    string Name,
    string? Slug,
    string? Description,
    string? IconUrl,
    bool IsActive = true,
    int SortOrder = 0
);

public record UpdateCategoryRequest(
    string? Name,
    string? Slug,
    string? Description,
    string? IconUrl,
    bool? IsActive,
    int? SortOrder
);

public record CategoryDto(
    Guid Id,
    string Name,
    string? Slug,
    string? Description,
    string? IconUrl,
    bool IsActive,
    int SortOrder,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

// ── Subcategory ──────────────────────────────────────────────────────────────

public record CreateSubcategoryRequest(
    Guid? CategoryId,
    string Name,
    string? Slug,
    string? Description,
    string? IconUrl,
    string Country,
    string City,
    bool IsActive = true,
    int SortOrder = 0
);

public record UpdateSubcategoryRequest(
    Guid? CategoryId,
    string? Name,
    string? Slug,
    string? Description,
    string? IconUrl,
    string? Country,
    string? City,
    bool? IsActive,
    int? SortOrder
);

public record SubcategoryDto(
    Guid Id,
    Guid? CategoryId,
    string Name,
    string? Slug,
    string? Description,
    string? IconUrl,
    string Country,
    string City,
    bool IsActive,
    int SortOrder,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
