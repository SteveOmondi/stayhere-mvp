using MongoDB.Driver;
using Npgsql;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Infrastructure.Persistence;

public class PropertyRepository : IPropertyRepository
{
    private readonly string _connectionString;

    public PropertyRepository(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task<Property?> GetByIdAsync(Guid id)
    {
        using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();
        // SQL implementation...
        return null; // Placeholder for logic
    }

    public async Task<IEnumerable<Property>> GetByOwnerIdAsync(Guid ownerId)
    {
        using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();
        // SQL implementation...
        return Enumerable.Empty<Property>(); // Placeholder
    }

    public async Task CreateAsync(Property property)
    {
        using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();
        // SQL implementation...
    }

    public async Task UpdateAsync(Property property)
    {
        using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();
        // SQL implementation...
    }

    public async Task DeleteAsync(Guid id)
    {
        using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();
        // SQL implementation...
    }
}

public class PropertyAttributeRepository : IPropertyAttributeRepository
{
    private readonly IMongoCollection<PropertyAttribute> _collection;

    public PropertyAttributeRepository(string connectionString, string databaseName)
    {
        var client = new MongoClient(connectionString);
        var database = client.GetDatabase(databaseName);
        _collection = database.GetCollection<PropertyAttribute>("PropertyAttributes");
    }

    public async Task<PropertyAttribute?> GetByPropertyIdAsync(Guid propertyId)
    {
        var id = propertyId.ToString();
        return await _collection.Find(a => a.PropertyId == id).FirstOrDefaultAsync();
    }

    public async Task UpsertAsync(PropertyAttribute attributes)
    {
        var filter = Builders<PropertyAttribute>.Filter.Eq(a => a.PropertyId, attributes.PropertyId);
        await _collection.ReplaceOneAsync(filter, attributes, new ReplaceOptions { IsUpsert = true });
    }
}
