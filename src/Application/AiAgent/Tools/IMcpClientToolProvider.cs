using StayHere.Application.Common.Interfaces;

namespace StayHere.Application.AiAgent.Tools;

/// <summary>
/// The MCP-client half of Sage: discovers and calls tools exposed by external, third-party MCP
/// servers (config-driven, <c>Mcp:ExternalServers</c>) - a generic, pluggable extension point, not
/// tied to any specific provider. With no servers configured, every method is a no-op / returns
/// empty, so <see cref="AgentToolRegistry"/> behaves exactly as it did before this existed.
///
/// Lives as an interface in Application (not Infrastructure) so <see cref="AgentToolRegistry"/>
/// stays testable/dependency-light - the real implementation (<c>McpClientToolProvider</c> in
/// Infrastructure) owns the actual <c>ModelContextProtocol.Client</c> sessions.
/// </summary>
public interface IMcpClientToolProvider
{
    Task<IReadOnlyList<ChatToolDefinition>> GetToolsAsync(CancellationToken cancellationToken = default);

    /// <summary>True for a namespaced external tool name (<c>mcp__&lt;server&gt;__&lt;tool&gt;</c>)
    /// this provider currently knows how to call - never true for a native <see cref="AgentToolCatalog"/> name.</summary>
    bool IsExternalTool(string toolName);

    Task<string> CallToolAsync(string toolName, string argumentsJson, CancellationToken cancellationToken = default);
}
