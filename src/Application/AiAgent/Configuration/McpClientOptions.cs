namespace StayHere.Application.AiAgent.Configuration;

/// <summary>
/// Binds the <c>Mcp:ExternalServers</c> config section - external MCP tool servers Sage should
/// connect to as a client, alongside its native <see cref="StayHere.Application.AiAgent.Tools.AgentToolCatalog"/>
/// tools. Empty by default: adding an external server is a deliberate, config-only opt-in, never
/// assumed.
/// </summary>
public class McpClientOptions
{
    public const string SectionName = "Mcp";

    public List<McpExternalServerOptions> ExternalServers { get; set; } = [];
}

/// <summary>One external MCP server, reached over Streamable HTTP (the only transport supported for
/// now - a local stdio-launched server is a different trust/process model, deliberately out of
/// scope until a real need for one shows up).</summary>
public class McpExternalServerOptions
{
    /// <summary>Short identifier used to namespace this server's tools (<c>mcp__&lt;Name&gt;__&lt;tool&gt;</c>)
    /// so they can never collide with or spoof a native tool name.</summary>
    public string Name { get; set; } = "";

    public string Url { get; set; } = "";
}
