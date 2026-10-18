using StayHere.Application.Common.Interfaces;

namespace StayHere.Application.AiAgent.Tools;

/// <summary>
/// Everything Sage's tool-calling loop needs to know about "what tools exist right now and how
/// do I run one" - composes the fixed native tool set (<see cref="AgentToolCatalog"/>, executed by
/// <see cref="IAgentToolExecutor"/>, unchanged) with whatever tools any configured external MCP
/// servers currently expose, so the model can pick whichever - native or external - actually fits
/// the query. With no external servers configured this is exactly equivalent to calling
/// <see cref="AgentToolCatalog.All"/>/<see cref="IAgentToolExecutor"/> directly.
/// </summary>
public interface IAgentToolRegistry
{
    Task<IReadOnlyList<ChatToolDefinition>> GetAvailableToolsAsync(CancellationToken cancellationToken = default);

    Task<string> ExecuteAsync(string toolName, string argumentsJson, AgentToolContext context, CancellationToken cancellationToken = default);
}
