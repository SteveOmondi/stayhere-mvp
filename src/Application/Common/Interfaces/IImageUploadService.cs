namespace StayHere.Application.Common.Interfaces;

public record UploadUrlResult(string UploadUrl, string ImageId, string PublicUrl);

public interface IImageUploadService
{
    Task<UploadUrlResult> GetDirectUploadUrlAsync();
}
