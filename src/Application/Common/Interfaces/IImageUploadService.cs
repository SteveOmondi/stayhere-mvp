// Replaced by IStorageService — kept as a type alias so existing references still compile
// while callers are migrated to IStorageService.
namespace StayHere.Application.Common.Interfaces;

[Obsolete("Use IStorageService instead.")]
public interface IImageUploadService
{
    Task<UploadUrlResult> GetDirectUploadUrlAsync();
}

[Obsolete("Use StorageUploadResult instead.")]
public record UploadUrlResult(string UploadUrl, string ImageId, string PublicUrl);
