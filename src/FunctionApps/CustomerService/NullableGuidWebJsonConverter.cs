using System.Text.Json;
using System.Text.Json.Serialization;

namespace StayHere.FunctionApps.CustomerService;

/// <summary>
/// Web clients often send <c>""</c> for optional UUIDs; System.Text.Json rejects that for <see cref="Guid"/>?.
/// Treats <c>null</c> and whitespace strings as <c>null</c>; otherwise parses a UUID string.
/// </summary>
internal sealed class NullableGuidWebJsonConverter : JsonConverter<Guid?>
{
    public override Guid? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        switch (reader.TokenType)
        {
            case JsonTokenType.Null:
                return null;
            case JsonTokenType.String:
                var s = reader.GetString();
                if (string.IsNullOrWhiteSpace(s))
                    return null;
                return Guid.TryParse(s, out var g)
                    ? g
                    : throw new JsonException(
                        "Expected a UUID (Guid) or null/empty for this field. " +
                        "Use a country/city id from StaticDataService, or omit the property / send null.");
            default:
                try
                {
                    return reader.GetGuid();
                }
                catch (FormatException ex)
                {
                    throw new JsonException(
                        "Expected a UUID (Guid) for this field. Use ids from StaticDataService, or null.", ex);
                }
        }
    }

    public override void Write(Utf8JsonWriter writer, Guid? value, JsonSerializerOptions options)
    {
        if (value is null)
            writer.WriteNullValue();
        else
            writer.WriteStringValue(value.Value);
    }
}
