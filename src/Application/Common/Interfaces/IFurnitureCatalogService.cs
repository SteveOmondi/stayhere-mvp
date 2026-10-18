using StayHere.Application.StaticData.Models;

namespace StayHere.Application.Common.Interfaces;

public interface IFurnitureCatalogService
{
    IReadOnlyList<FurnitureCatalogItemDto> GetCatalog();
}
