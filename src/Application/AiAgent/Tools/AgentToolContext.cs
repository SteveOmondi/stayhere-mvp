namespace StayHere.Application.AiAgent.Tools;

/// <summary>
/// Per-request caller context for tool execution. Built once per chat turn in
/// <see cref="StayHere.Application.AiAgent.Services.AiAgentService"/> from the caller's verified
/// JWT - never from tool arguments the model supplies, which is what makes "my applications"/"my
/// payments"-style tools actually safe: a tool cannot be tricked into returning another user's data
/// by an argument in the model's tool call, because it never reads identity from there.
/// </summary>
public sealed record AgentToolContext(Guid? UserId, Guid? CustomerId)
{
    public static readonly AgentToolContext Anonymous = new(null, null);

    public bool IsAuthenticated => UserId.HasValue;
}
