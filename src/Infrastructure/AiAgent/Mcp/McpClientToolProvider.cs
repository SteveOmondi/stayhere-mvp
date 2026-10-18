using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ModelContextProtocol.Client;
using StayHere.Application.AiAgent.Tools;
using StayHere.Application.Common.Interfaces;
using StayHereMcpOptions = StayHere.Application.AiAgent.Configuration.McpClientOptions;

namespace StayHere.Infrastructure.AiAgent.Mcp;

/// <summary>
/// Connects to whichever external MCP servers are configured (<c>Mcp:ExternalServers</c>, empty by
/// default) over Streamable HTTP, discovers their tools once, and dispatches calls back out to
/// them. Registered as a singleton deliberately - unlike <see cref="IAgentToolExecutor"/> this
/// holds no scoped/DbContext-backed state, only long-lived outbound MCP client sessions, so
/// reusing one connection across requests (rather than reconnecting every chat turn) is both safe
/// and the right performance trade-off.
///
/// Every discovered tool name is namespaced <c>mcp__&lt;serverName&gt;__&lt;toolName&gt;</c> so it can
/// never collide with, or be mistaken for, a native <see cref="AgentToolCatalog"/> tool - that
/// namespace prefix is also how <see cref="IsExternalTool"/> and the routing dictionary work.
/// </summary>
public sealed class McpClientToolProvider : IMcpClientToolProvider, IAsyncDisposable
{
    private const string NamespaceSeparator = "__";

    private readonly StayHereMcpOptions _options;
    private readonly ILogger<McpClientToolProvider> _logger;
    private readonly SemaphoreSlim _initLock = new(1, 1);

    private bool _initialized;
    private readonly List<IAsyncDisposable> _clients = [];
    private readonly Dictionary<string, (McpClient Client, string RemoteToolName)> _toolRoutes = new(StringComparer.Ordinal);
    private List<ChatToolDefinition> _toolDefinitions = [];

    public McpClientToolProvider(IOptions<StayHereMcpOptions> options, ILogger<McpClientToolProvider> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task<IReadOnlyList<ChatToolDefinition>> GetToolsAsync(CancellationToken cancellationToken = default)
    {
        if (_options.ExternalServers.Count == 0)
            return [];

        await EnsureInitializedAsync(cancellationToken);
        return _toolDefinitions;
    }

    public bool IsExternalTool(string toolName) =>
        _toolRoutes.ContainsKey(toolName);

    public async Task<string> CallToolAsync(string toolName, string argumentsJson, CancellationToken cancellationToken = default)
    {
        if (!_toolRoutes.TryGetValue(toolName, out var route))
            return Serialize(new { error = $"Unknown external MCP tool '{toolName}'." });

        try
        {
            var arguments = string.IsNullOrWhiteSpace(argumentsJson)
                ? new Dictionary<string, object?>()
                : JsonSerializer.Deserialize<Dictionary<string, object?>>(argumentsJson) ?? new Dictionary<string, object?>();

            var result = await route.Client.CallToolAsync(route.RemoteToolName, arguments, cancellationToken: cancellationToken);
            return ExtractText(result);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "External MCP tool call failed for {Tool}", toolName);
            return Serialize(new
            {
                error = "External tool call failed.",
                instruction = "Tell the user this information isn't available right now. Do NOT invent data to fill the gap."
            });
        }
    }

    private async Task EnsureInitializedAsync(CancellationToken cancellationToken)
    {
        if (_initialized) return;

        await _initLock.WaitAsync(cancellationToken);
        try
        {
            if (_initialized) return;

            foreach (var server in _options.ExternalServers)
            {
                try
                {
                    var transport = new HttpClientTransport(new HttpClientTransportOptions { Endpoint = new Uri(server.Url) });
                    var client = await McpClient.CreateAsync(transport, cancellationToken: cancellationToken);
                    _clients.Add(client);

                    var tools = await client.ListToolsAsync(cancellationToken: cancellationToken);
                    foreach (var tool in tools)
                    {
                        var namespacedName = $"mcp{NamespaceSeparator}{server.Name}{NamespaceSeparator}{tool.Name}";
                        _toolRoutes[namespacedName] = (client, tool.Name);
                        _toolDefinitions.Add(new ChatToolDefinition(
                            namespacedName,
                            $"[{server.Name}] {tool.Description}",
                            tool.JsonSchema.GetRawText()));
                    }

                    _logger.LogInformation("Connected to external MCP server {Server} ({Count} tools)", server.Name, tools.Count);
                }
                catch (Exception ex)
                {
                    // One misbehaving/unreachable external server should never take down Sage's
                    // native tools - log and continue with whichever other servers connected fine.
                    _logger.LogWarning(ex, "Failed to connect to external MCP server {Server} at {Url} - its tools will be unavailable this run", server.Name, server.Url);
                }
            }

            _initialized = true;
        }
        finally
        {
            _initLock.Release();
        }
    }

    private static string ExtractText(ModelContextProtocol.Protocol.CallToolResult result)
    {
        var texts = result.Content
            .OfType<ModelContextProtocol.Protocol.TextContentBlock>()
            .Select(c => c.Text)
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .ToList();

        if (texts.Count == 0)
            return Serialize(new { note = "External tool returned no text content." });

        // Most MCP tools already return a JSON string as their text content - pass it through
        // as-is so it lines up with every native tool's JSON-string convention, rather than
        // double-encoding it as a JSON string-of-a-string.
        var combined = string.Join("\n", texts);
        return LooksLikeJson(combined) ? combined : Serialize(new { text = combined });
    }

    private static bool LooksLikeJson(string s)
    {
        var t = s.TrimStart();
        return t.StartsWith('{') || t.StartsWith('[');
    }

    private static string Serialize(object payload) =>
        JsonSerializer.Serialize(payload, new JsonSerializerOptions(JsonSerializerDefaults.Web));

    public async ValueTask DisposeAsync()
    {
        foreach (var client in _clients)
            await client.DisposeAsync();
    }
}
