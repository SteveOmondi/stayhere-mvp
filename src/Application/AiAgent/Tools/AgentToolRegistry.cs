using StayHere.Application.Common.Interfaces;

namespace StayHere.Application.AiAgent.Tools;

/// <summary>
/// Default <see cref="IAgentToolRegistry"/>: native tools always come from <see cref="AgentToolCatalog.All"/>
/// and always execute via the unchanged <see cref="IAgentToolExecutor"/>; external tools (namespaced
/// <c>mcp__&lt;server&gt;__&lt;tool&gt;</c>) come from <see cref="IMcpClientToolProvider"/>, which is a
/// pure no-op when no external MCP servers are configured - so this class is byte-for-byte the same
/// behavior as calling <see cref="AgentToolCatalog.All"/>/<see cref="IAgentToolExecutor"/> directly
/// until an external server is actually added.
/// </summary>
public class AgentToolRegistry : IAgentToolRegistry
{
    private readonly IAgentToolExecutor _nativeExecutor;
    private readonly IMcpClientToolProvider _mcpToolProvider;

    public AgentToolRegistry(IAgentToolExecutor nativeExecutor, IMcpClientToolProvider mcpToolProvider)
    {
        _nativeExecutor = nativeExecutor;
        _mcpToolProvider = mcpToolProvider;
    }

    public async Task<IReadOnlyList<ChatToolDefinition>> GetAvailableToolsAsync(CancellationToken cancellationToken = default)
    {
        var externalTools = await _mcpToolProvider.GetToolsAsync(cancellationToken);
        if (externalTools.Count == 0)
            return AgentToolCatalog.All;

        return AgentToolCatalog.All.Concat(externalTools).ToList();
    }

    public Task<string> ExecuteAsync(string toolName, string argumentsJson, AgentToolContext context, CancellationToken cancellationToken = default)
    {
        // External tools are namespaced (mcp__<server>__<tool>) specifically so this check can
        // never accidentally match a native AgentToolCatalog name - identity/context still only
        // ever comes from the verified JWT via `context`, whichever path handles the call.
        if (_mcpToolProvider.IsExternalTool(toolName))
            return _mcpToolProvider.CallToolAsync(toolName, argumentsJson, cancellationToken);

        return _nativeExecutor.ExecuteAsync(toolName, argumentsJson, context, cancellationToken);
    }
}
