namespace StayHere.Application.AiAgent.Tools;

public interface IAgentToolExecutor
{
    /// <summary>Executes a named tool with its raw JSON arguments and returns a JSON result string
    /// (fed back to the model as a "tool" role message). Never throws for expected failure modes
    /// (not found, bad args) - it returns a small JSON error object instead so the model can react.
    /// <paramref name="context"/> carries the verified caller identity for personal ("my ...") tools -
    /// see <see cref="AgentToolContext"/> for why this must never come from tool arguments.</summary>
    Task<string> ExecuteAsync(string toolName, string argumentsJson, AgentToolContext context, CancellationToken cancellationToken = default);
}
