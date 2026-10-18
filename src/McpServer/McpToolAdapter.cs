using System.Text.Json;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using StayHere.Application.AiAgent.Tools;
using StayHere.Application.Common.Interfaces;

namespace StayHere.McpServer;

/// <summary>
/// Thin adapter exposing StayHere's own tools over MCP, with ZERO logic duplication - every call
/// dispatches straight into the same <see cref="IAgentToolExecutor"/> already used by Sage's own
/// chat loop (<c>AiAgentService.ChatAsync</c>), resolved per-call from the request's scoped
/// <see cref="IServiceProvider"/> so it correctly gets its own DbContext per MCP tool call rather
/// than one shared instance.
///
/// Phase 1 scope, deliberately: only the tools already safe for an unauthenticated caller today
/// (<see cref="AgentToolCatalog.SearchListings"/>, GetListingDetails, GetNearbyPlaces,
/// CompareListings, GetRecommendations, GetLeaseTerms). The personal tools (get_my_*,
/// suggest_next_step) are NOT exposed here - they need a real OAuth 2.1 flow to safely identify
/// the caller over MCP, which is explicitly out of scope for this phase (see the plan). Every call
/// therefore executes with <see cref="AgentToolContext.Anonymous"/> - never anything caller-supplied.
/// </summary>
public static class McpToolAdapter
{
    private static readonly HashSet<string> AnonymousSafeToolNames =
    [
        AgentToolCatalog.SearchListings,
        AgentToolCatalog.GetListingDetails,
        AgentToolCatalog.GetNearbyPlaces,
        AgentToolCatalog.CompareListings,
        AgentToolCatalog.GetRecommendations,
        AgentToolCatalog.GetLeaseTerms,
    ];

    private static readonly IReadOnlyList<ChatToolDefinition> AnonymousSafeTools =
        AgentToolCatalog.All.Where(t => AnonymousSafeToolNames.Contains(t.Name)).ToList();

    public static IMcpServerBuilder WithStayHereTools(this IMcpServerBuilder builder) => builder
        .WithListToolsHandler((_, _) => ValueTask.FromResult(new ListToolsResult
        {
            Tools = AnonymousSafeTools.Select(ToMcpTool).ToList()
        }))
        .WithCallToolHandler(async (context, cancellationToken) =>
        {
            var toolName = context.Params?.Name;
            if (string.IsNullOrWhiteSpace(toolName) || !AnonymousSafeToolNames.Contains(toolName))
            {
                return new CallToolResult
                {
                    IsError = true,
                    Content = [new TextContentBlock { Text = $"Unknown tool '{toolName}'." }]
                };
            }

            var executor = context.Services!.GetRequiredService<IAgentToolExecutor>();
            var argumentsJson = context.Params?.Arguments is { } args
                ? JsonSerializer.Serialize(args)
                : "{}";

            // AgentToolContext.Anonymous, always - there is no verified caller identity over MCP
            // yet (Phase 1 has no auth story), and these are exactly the tools already safe to
            // call without one. Never resolve identity from anything the MCP client sends.
            var resultJson = await executor.ExecuteAsync(toolName, argumentsJson, AgentToolContext.Anonymous, cancellationToken);

            return new CallToolResult
            {
                Content = [new TextContentBlock { Text = resultJson }]
            };
        });

    private static Tool ToMcpTool(ChatToolDefinition definition) => new()
    {
        Name = definition.Name,
        Description = definition.Description,
        InputSchema = JsonSerializer.Deserialize<JsonElement>(definition.ParametersJsonSchema)
    };
}
