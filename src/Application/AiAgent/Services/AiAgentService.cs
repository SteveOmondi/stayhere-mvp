using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StayHere.Application.AiAgent.Models;
using StayHere.Application.AiAgent.Tools;
using StayHere.Application.Common.Interfaces;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Application.AiAgent.Services;

public class AiAgentService : IAiAgentService
{
    private const int KnowledgeCatalogPageSize = 500;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    /// <summary>Tools whose JSON result becomes a rich frontend attachment, and the attachment
    /// "type" each maps to. Kept as the last call of each type wins (a refined second search
    /// replaces the first in what's shown).</summary>
    private static readonly IReadOnlyDictionary<string, string> AttachableTools = new Dictionary<string, string>
    {
        [AgentToolCatalog.SearchListings] = "listings",
        [AgentToolCatalog.GetRecommendations] = "listings",
        [AgentToolCatalog.CompareListings] = "listings",
        [AgentToolCatalog.GetListingDetails] = "listings",
        [AgentToolCatalog.GetSavedListings] = "listings",
        [AgentToolCatalog.GetNearbyPlaces] = "nearbyPlaces",
        [AgentToolCatalog.SuggestNextStep] = "nextStep",
    };

    private readonly IAgentKnowledgeBaseRepository _knowledgeBase;
    private readonly IChatService _chatService;
    private readonly IEmbeddingService _embeddingService;
    private readonly IAgentConversationRepository _conversations;
    private readonly IAgentToolRegistry _toolRegistry;
    private readonly IListingRepository _listings;
    private readonly ICustomerRepository _customers;
    private readonly ICacheService _cache;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AiAgentService> _logger;

    public AiAgentService(
        IAgentKnowledgeBaseRepository knowledgeBase,
        IChatService chatService,
        IEmbeddingService embeddingService,
        IAgentConversationRepository conversations,
        IAgentToolRegistry toolRegistry,
        IListingRepository listings,
        ICustomerRepository customers,
        ICacheService cache,
        IConfiguration configuration,
        ILogger<AiAgentService> logger)
    {
        _knowledgeBase = knowledgeBase;
        _chatService = chatService;
        _embeddingService = embeddingService;
        _conversations = conversations;
        _toolRegistry = toolRegistry;
        _listings = listings;
        _customers = customers;
        _cache = cache;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Runs Sage's agent loop: the model may call any tool in <see cref="AgentToolCatalog"/> as many
    /// times as it needs (capped by Groq:ToolCallingMaxIterations) before producing a final answer.
    /// Every message in the turn - including intermediate tool calls/results - is persisted so the
    /// conversation survives process restarts and scale-out (see EfAgentConversationRepository).
    /// </summary>
    public async Task<AgentChatResponse> ChatAsync(AgentChatRequest request, Guid? callerUserId = null, CancellationToken cancellationToken = default)
    {
        var conversationId = request.ConversationId ?? Guid.NewGuid().ToString();

        // Resolved fresh every turn (a single indexed lookup) rather than cached on the conversation,
        // to avoid any staleness if the caller's Customer record changes mid-conversation.
        var toolContext = await ResolveToolContextAsync(callerUserId, cancellationToken);

        var searchResults = await _knowledgeBase.SearchAsync(request.Query, topK: 5, cancellationToken);
        var context = PrepareContext(searchResults);
        var history = await _conversations.GetHistoryAsync(conversationId, cancellationToken);

        var messages = new List<ChatMessage> { new() { Role = "system", Content = BuildAgentSystemPrompt(context, toolContext.IsAuthenticated) } };
        messages.AddRange(history.TakeLast(16).Select(ToChatMessage));
        messages.Add(new ChatMessage { Role = "user", Content = request.Query });

        var newMessages = new List<AiConversationMessage>
        {
            NewMessage(conversationId, "user", request.Query)
        };

        // Authenticated journey questions ("what's my status") can legitimately chain a couple of
        // tool calls (resolve applications -> payments -> next step) - give signed-in callers a
        // little more room than anonymous browsing, which rarely needs more than one or two. Each
        // iteration is a full LLM round-trip (seconds, not milliseconds), so these caps are kept
        // deliberately tight - a chat turn that needs more than ~6-7 round-trips is already well
        // past the point where a user is still happily waiting (see Sage latency investigation).
        var configuredMax = int.TryParse(_configuration["Groq:ToolCallingMaxIterations"], out var mi) ? Math.Clamp(mi, 1, 6) : 3;
        var maxIterations = toolContext.IsAuthenticated ? Math.Max(configuredMax, 4) : configuredMax;

        // Security/proximity questions need get_nearby_places grounding, but "auto" tool choice has
        // been observed in production to skip it and answer from listing amenities alone - even on
        // a follow-up like "how far is each from the police station" where the listings were
        // already resolved in an EARLIER turn, not this one (which is why this checks the whole
        // loaded history, not just tool calls made during this turn). A couple of extra iterations
        // are reserved so a multi-listing question ("how far is each of the 3...") can call
        // get_nearby_places once per listing rather than being cut off after a single forced call.
        var wantsNearbyPlaces = MatchesSecurityOrProximityIntent(request.Query);
        var hasListingContext = messages.Any(m => m.Role == "tool" && m.Name is AgentToolCatalog.SearchListings
            or AgentToolCatalog.GetListingDetails or AgentToolCatalog.CompareListings or AgentToolCatalog.GetRecommendations
            && ToolResultHasListings(m.Content));
        if (wantsNearbyPlaces) maxIterations += 1;

        // "Most secure"/"cheapest"/"closest" etc. questions over several listings have the same
        // failure mode as the nearby-places one above, confirmed in production: search_listings
        // populates the "listings" card attachment first, in plain DB order, and the model's actual
        // conclusion (reached AFTER gathering more data per-listing) never re-orders it - so the
        // text names one listing as the winner while its card renders second. compare_listings
        // fully REPLACES the attachment (unlike the accumulating get_listing_details path), in
        // exactly the id order the model passes - so nudging one final call to it, with the
        // model's own best-to-worst order, is what actually synchronizes text and cards.
        // "Secure"/"safe" questions are a ranking question in disguise even without an explicit
        // superlative ("give me a secure modern one bedroom" still means "pick me the more secure
        // of the candidates you find") - confirmed in production: RankingIntentRegex alone missed
        // this phrasing, so the model silently decided one listing was the better/safer pick in its
        // own text without ever calling compare_listings, leaving the card order unchanged from
        // search_listings' plain DB order while the text praised a DIFFERENT listing than card #1.
        var wantsRankedOrder = MatchesRankingIntent(request.Query) || MatchesSecurityOrProximityIntent(request.Query);
        var seenListingIds = new HashSet<string>(ExtractListingIdsFromHistory(messages));
        if (wantsRankedOrder) maxIterations += 1;

        string? finalText = null;
        var attachments = new Dictionary<string, AgentAttachment>();
        var nearbyPlacesCalled = false;
        var nearbyPlacesNudgeSent = false;
        var rankedOrderCalled = false;
        var rankedOrderNudgeSent = false;

        // Native AgentToolCatalog tools + whatever any configured external MCP servers currently
        // expose (namespaced mcp__<server>__<tool>) - with no external servers configured this is
        // exactly AgentToolCatalog.All, unchanged.
        var availableTools = await _toolRegistry.GetAvailableToolsAsync(cancellationToken);

        for (var iteration = 0; iteration < maxIterations; iteration++)
        {
            // A hard-forced tool_choice was tried here previously and turned out to be unsafe:
            // Groq's tool_choice is an all-or-nothing constraint, so the moment the model's own
            // judgment disagreed (e.g. the search came back with zero listings and it correctly
            // wanted to just say so, or re-search a broader area instead) the API rejected BOTH the
            // plain-text answer and any other tool call with a 400, burning the whole retry budget
            // and failing the request outright. A one-time strong reminder INJECTED into the
            // conversation - tool_choice always stays "auto" - gets the same grounding benefit
            // without ever being able to reject a legitimate answer.
            if (wantsNearbyPlaces && !nearbyPlacesCalled && hasListingContext && !nearbyPlacesNudgeSent)
            {
                messages.Add(new ChatMessage
                {
                    Role = "system",
                    Content = "Reminder: this question needs get_nearby_places grounding for the listing(s) already " +
                              "found before you answer - call it now. Skip this only if none of the listings found " +
                              "so far are actually relevant to answer with."
                });
                nearbyPlacesNudgeSent = true;
            }

            if (wantsRankedOrder && seenListingIds.Count > 1 && !rankedOrderCalled && !rankedOrderNudgeSent)
            {
                messages.Add(new ChatMessage
                {
                    Role = "system",
                    Content = $"Reminder: you're ranking {seenListingIds.Count} listings against each other for this " +
                              "question. Before answering, call compare_listings with their ids/codes in YOUR OWN " +
                              "best-to-worst order - whichever one you list FIRST is what gets shown FIRST to the " +
                              "user, so it must be the one you actually recommend."
                });
                rankedOrderNudgeSent = true;
            }

            var result = await _chatService.GenerateWithToolsAsync(
                messages, availableTools, request.MaxTokens, request.Temperature, cancellationToken);

            if (!result.RequiresToolExecution)
            {
                finalText = result.Content;
                break;
            }

            var toolCallsJson = JsonSerializer.Serialize(result.ToolCalls, JsonOptions);
            messages.Add(new ChatMessage { Role = "assistant", Content = null, ToolCalls = result.ToolCalls });
            newMessages.Add(NewMessage(conversationId, "assistant", "", toolCallsJson: toolCallsJson));

            foreach (var call in result.ToolCalls!)
            {
                _logger.LogInformation("Sage tool call: {Tool} (conversation {ConversationId})", call.Name, conversationId);
                var toolResult = await _toolRegistry.ExecuteAsync(call.Name, call.ArgumentsJson, toolContext, cancellationToken);
                messages.Add(new ChatMessage { Role = "tool", Content = toolResult, ToolCallId = call.Id, Name = call.Name });
                newMessages.Add(NewMessage(conversationId, "tool", toolResult, toolCallId: call.Id, toolName: call.Name));

                if (call.Name == AgentToolCatalog.GetNearbyPlaces) nearbyPlacesCalled = true;
                if (call.Name is AgentToolCatalog.SearchListings or AgentToolCatalog.GetListingDetails
                    or AgentToolCatalog.CompareListings or AgentToolCatalog.GetRecommendations
                    && ToolResultHasListings(toolResult))
                {
                    hasListingContext = true;
                    foreach (var id in ExtractListingIds(toolResult)) seenListingIds.Add(id);
                }
                if (call.Name == AgentToolCatalog.CompareListings) rankedOrderCalled = true;

                if (AttachableTools.TryGetValue(call.Name, out var attachmentType))
                    TryAddAttachment(attachments, attachmentType, toolResult);
            }
        }

        if (string.IsNullOrWhiteSpace(finalText))
        {
            // Iteration cap hit: force a final answer from whatever tool results were already gathered,
            // with no further tools offered, rather than looping indefinitely or leaving the user hanging.
            var forced = await _chatService.GenerateWithToolsAsync(
                messages, Array.Empty<ChatToolDefinition>(), request.MaxTokens, request.Temperature, cancellationToken);
            finalText = string.IsNullOrWhiteSpace(forced.Content)
                ? "I looked into that but couldn't put together a full answer - could you narrow your question a bit?"
                : forced.Content;
        }

        // Deterministic backstop, not just a system-prompt instruction: the model still
        // occasionally defaults to markdown (bold, bullet markers, [link](url) syntax) out of
        // habit despite being told not to - confirmed live even right after adding that rule.
        // Style instructions have proven unreliable to enforce via the prompt alone elsewhere in
        // this codebase (the forced tool_choice saga), so strip it server-side rather than retry
        // the same probabilistic fix. Applied before persisting too, so conversation history stays
        // clean on resume.
        finalText = SanitizeForChat(finalText);

        newMessages.Add(NewMessage(conversationId, "assistant", finalText));
        await PersistTurnAsync(conversationId, newMessages, callerUserId, cancellationToken);

        var confidence = CalculateConfidence(searchResults, finalText);

        return new AgentChatResponse(
            finalText,
            conversationId,
            searchResults.Select(r => r.Source).Distinct().ToList(),
            confidence,
            DateTime.UtcNow,
            attachments.Count > 0 ? attachments.Values.ToList() : null);
    }

    public async Task<IReadOnlyList<AgentConversationSummaryDto>> ListConversationsAsync(Guid callerUserId, CancellationToken cancellationToken = default)
    {
        var conversations = await _conversations.GetByUserIdAsync(callerUserId, cancellationToken);
        return conversations
            .Select(c => new AgentConversationSummaryDto(
                c.Id,
                c.Messages.FirstOrDefault(m => m.Role == "user")?.Content,
                c.CreatedAt,
                c.UpdatedAt))
            .ToList();
    }

    public async Task<AgentConversationDetailDto?> GetConversationAsync(Guid callerUserId, string conversationId, CancellationToken cancellationToken = default)
    {
        var conversation = await _conversations.GetByIdAsync(conversationId, cancellationToken);
        // Ownership check IS the auth boundary here - a non-owned or nonexistent conversation
        // returns the same "not found" either way, so a caller can't distinguish "not yours" from
        // "doesn't exist" and enumerate other people's conversation ids.
        if (conversation == null || conversation.UserId != callerUserId)
            return null;

        var messages = conversation.Messages
            .Where(m => m.Role is "user" or "assistant")
            .Where(m => !string.IsNullOrWhiteSpace(m.Content)) // skip placeholder assistant messages that only carried tool_calls
            .OrderBy(m => m.Timestamp)
            .Select(m => new AgentConversationMessageDto(m.Role, m.Content, m.Timestamp))
            .ToList();

        return new AgentConversationDetailDto(conversation.Id, conversation.CreatedAt, conversation.UpdatedAt, messages);
    }

    private static readonly Regex SecurityOrProximityIntentRegex = new(
        @"\b(secur|safe|safety|crime|police|transport|transit|matatu|bus\s*stop|station|commute|distance|far|close(?:st)?\s+to|near(?:by|est)?|walk(?:ing)?\s*(?:distance|time)?)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static bool MatchesSecurityOrProximityIntent(string query) =>
        !string.IsNullOrWhiteSpace(query) && SecurityOrProximityIntentRegex.IsMatch(query);

    private static readonly Regex RankingIntentRegex = new(
        @"\b(most|best|top|safest|cheapest|closest|nearest|highest|lowest|biggest|largest|smallest)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static bool MatchesRankingIntent(string query) =>
        !string.IsNullOrWhiteSpace(query) && RankingIntentRegex.IsMatch(query);

    /// <summary>Pulls every listing "id" out of a search_listings/get_listing_details/
    /// compare_listings/get_recommendations JSON result, whichever of the three shapes it's in
    /// (flat single object, {listings:[...]}, or {comparisons:[...]}).</summary>
    private static List<string> ExtractListingIds(string? toolResultJson)
    {
        var ids = new List<string>();
        if (string.IsNullOrWhiteSpace(toolResultJson)) return ids;

        try
        {
            using var doc = JsonDocument.Parse(toolResultJson);
            var root = doc.RootElement;

            if (root.TryGetProperty("id", out var idEl) && idEl.ValueKind == JsonValueKind.String)
            {
                ids.Add(idEl.GetString()!);
                return ids;
            }

            foreach (var arrayKey in new[] { "listings", "comparisons" })
            {
                if (root.TryGetProperty(arrayKey, out var arr) && arr.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in arr.EnumerateArray())
                        if (item.TryGetProperty("id", out var iid) && iid.ValueKind == JsonValueKind.String)
                            ids.Add(iid.GetString()!);
                }
            }
        }
        catch (JsonException)
        {
            // malformed tool output - nothing to extract
        }

        return ids;
    }

    /// <summary>Same extraction as <see cref="ExtractListingIds"/>, applied across every listing
    /// tool result already in the loaded conversation history - mirrors how <c>hasListingContext</c>
    /// above checks history, not just this turn, so a ranking follow-up on listings resolved earlier
    /// still knows how many are actually in play.</summary>
    private static IEnumerable<string> ExtractListingIdsFromHistory(IEnumerable<ChatMessage> messages) =>
        messages.Where(m => m.Role == "tool" && m.Name is AgentToolCatalog.SearchListings
            or AgentToolCatalog.GetListingDetails or AgentToolCatalog.CompareListings or AgentToolCatalog.GetRecommendations)
            .SelectMany(m => ExtractListingIds(m.Content));

    private static readonly Regex MarkdownLinkRegex = new(@"\[([^\]]+)\]\([^)]*\)", RegexOptions.Compiled);
    private static readonly Regex MarkdownBoldRegex = new(@"\*\*(.+?)\*\*|__(.+?)__", RegexOptions.Compiled);
    private static readonly Regex MarkdownListMarkerRegex = new(@"(?m)^[ \t]*(?:[-*•]|\d+\.)[ \t]+", RegexOptions.Compiled);

    /// <summary>Deterministic markdown strip, not just a system-prompt instruction - the model
    /// still occasionally bolds a phrase or links a page name out of habit despite being told not
    /// to (confirmed live: "**My Bookings**" slipped through moments after that rule was added).
    /// Drops link URLs entirely (the card/page it refers to speaks for itself), unwraps bold/italic
    /// markers, and strips leading list-item markers.</summary>
    private static string SanitizeForChat(string text)
    {
        if (string.IsNullOrEmpty(text)) return text;

        var result = MarkdownLinkRegex.Replace(text, "$1");
        result = MarkdownBoldRegex.Replace(result, m => m.Groups[1].Success ? m.Groups[1].Value : m.Groups[2].Value);
        result = MarkdownListMarkerRegex.Replace(result, "");
        return result;
    }

    private async Task<AgentToolContext> ResolveToolContextAsync(Guid? callerUserId, CancellationToken cancellationToken)
    {
        if (!callerUserId.HasValue)
            return AgentToolContext.Anonymous;

        var customer = await _customers.GetByUserIdAsync(callerUserId.Value, cancellationToken);
        return new AgentToolContext(callerUserId, customer?.Id);
    }

    /// <summary>
    /// Whether a search_listings/get_listing_details/compare_listings/get_recommendations result
    /// actually found a usable listing - a zero-result search ("no listings on Thika Road") must
    /// NOT count as "listing context" for the get_nearby_places nudge above, since there is then
    /// nothing to check proximity for.
    /// </summary>
    private static bool ToolResultHasListings(string? toolResultJson)
    {
        if (string.IsNullOrWhiteSpace(toolResultJson)) return false;

        try
        {
            using var doc = JsonDocument.Parse(toolResultJson);
            var root = doc.RootElement;

            if (root.TryGetProperty("error", out _)) return false;

            if (root.TryGetProperty("count", out var count))
                return count.ValueKind == JsonValueKind.Number && count.GetInt32() > 0;

            if (root.TryGetProperty("comparisons", out var comparisons) && comparisons.ValueKind == JsonValueKind.Array)
                return comparisons.EnumerateArray().Any(c => !c.TryGetProperty("error", out _));

            // get_listing_details returns the listing object directly (no count/comparisons
            // wrapper) - reaching here with no "error" property means it succeeded.
            return true;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    /// <summary>Parses a tool's JSON result into a rich attachment, keyed by type so a later call of
    /// the same kind (e.g. a refined search) replaces rather than duplicates an earlier one. Never
    /// throws - a malformed/error tool result simply produces no attachment, the plain-text reply
    /// still carries the grounded (or honestly-unavailable) answer.</summary>
    private static void TryAddAttachment(Dictionary<string, AgentAttachment> attachments, string type, string toolResultJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(toolResultJson);
            var root = doc.RootElement;

            if (type == "nextStep")
            {
                if (root.TryGetProperty("nextStep", out var nextStep) && nextStep.ValueKind != JsonValueKind.Null)
                    attachments[type] = new AgentAttachment(type, nextStep.Clone());
                return;
            }

            if (root.TryGetProperty("error", out _)) return; // nothing usable to show

            // get_listing_details returns one flat listing object - no "listings"/"comparisons"
            // wrapper the way search_listings/get_recommendations/compare_listings do - so without
            // this it never rendered as a card at all (confirmed: asking about one specific listing
            // only ever showed plain text). Normalize it into the same { listings: [...] } shape the
            // card renderer already reads, and ACCUMULATE across multiple single-listing lookups in
            // one turn (rather than each call overwriting the last) so asking about several
            // listings one at a time - instead of via compare_listings - still shows a card for
            // every one, not just the last.
            if (type == "listings" && !root.TryGetProperty("listings", out _) && !root.TryGetProperty("comparisons", out _))
            {
                var mergedListings = new JsonArray();
                if (attachments.TryGetValue(type, out var existing)
                    && existing.Data.TryGetProperty("listings", out var existingArray)
                    && existingArray.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in existingArray.EnumerateArray())
                        mergedListings.Add(JsonNode.Parse(item.GetRawText()));
                }

                var newId = root.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;
                var alreadyPresent = newId != null && mergedListings.Any(n => n?["id"]?.GetValue<string>() == newId);
                if (!alreadyPresent)
                    mergedListings.Add(JsonNode.Parse(root.GetRawText()));

                var merged = new JsonObject { ["count"] = mergedListings.Count, ["listings"] = mergedListings };
                attachments[type] = new AgentAttachment(type, JsonSerializer.SerializeToElement(merged));
                return;
            }

            attachments[type] = new AgentAttachment(type, root.Clone());
        }
        catch (JsonException)
        {
            // malformed tool output - skip the attachment, the model still got the raw text
        }
    }

    private static AiConversationMessage NewMessage(
        string conversationId, string role, string content,
        string? toolCallsJson = null, string? toolCallId = null, string? toolName = null) => new()
    {
        ConversationId = conversationId,
        Role = role,
        Content = content,
        ToolCallsJson = toolCallsJson,
        ToolCallId = toolCallId,
        ToolName = toolName,
        Timestamp = DateTime.UtcNow
    };

    private static ChatMessage ToChatMessage(AiConversationMessage m)
    {
        if (m.Role == "assistant" && !string.IsNullOrEmpty(m.ToolCallsJson))
        {
            var calls = JsonSerializer.Deserialize<List<ChatToolCall>>(m.ToolCallsJson, JsonOptions);
            return new ChatMessage { Role = "assistant", Content = null, ToolCalls = calls };
        }

        return new ChatMessage
        {
            Role = m.Role,
            Content = m.Content,
            ToolCallId = m.ToolCallId,
            Name = m.ToolName
        };
    }

    public async Task<AgentRecommendResponse> RecommendAsync(AgentRecommendRequest request, CancellationToken cancellationToken = default)
    {
        var conversationId = request.ConversationId ?? Guid.NewGuid().ToString();
        var extracted = ListingQueryIntentExtractor.Extract(request.Query);
        var embedText = ListingQueryIntentExtractor.ComposeForEmbedding(request.Query, extracted);

        List<(Listing Listing, double Sim)> ranked;
        var usedVector = false;
        var usedFallback = false;

        try
        {
            var vec = await _embeddingService.EmbedAsync(embedText, cancellationToken);
            var topK = Math.Max(request.MaxResults * 12, 32);
            ranked = (await _listings.SearchByEmbeddingSimilarityAsync(vec, topK, cancellationToken)).ToList();
            usedVector = ranked.Count > 0;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Vector search failed (embeddings or DB); falling back to text ranking");
            ranked = new List<(Listing, double)>();
        }

        if (ranked.Count == 0)
        {
            usedFallback = true;
            var criteria = new ListingSearchCriteria
            {
                Page = 1,
                PageSize = KnowledgeCatalogPageSize,
                AvailabilityStatus = AvailabilityStatus.Available
            };
            var all = await _cache.GetOrSetAsync(
                "stayhere:aiagent:listings:catalog:available",
                async () => (await _listings.SearchAsync(criteria)).ToList(),
                expiration: TimeSpan.FromHours(1));
            var filtered = FilterByExtractedIntent(all, extracted);
            ranked = ScoreListings(filtered, request.Query)
                .OrderByDescending(x => x.MatchScore)
                .Take(request.MaxResults * 3)
                .Select(x => (x.Listing, (double)Math.Clamp(x.MatchScore, 0, 1)))
                .ToList();
        }

        ranked = PostFilterRanked(ranked, extracted)
            .Select(x => (x.Listing, Sim: CombineVectorAndIntentAlignment(x.Sim, x.Listing, extracted)))
            .OrderByDescending(x => x.Sim)
            .Take(request.MaxResults)
            .ToList();

        var narrative = await ResolveRecommendNarrativeAsync(
            request.Query,
            extracted,
            ranked,
            request.Temperature,
            cancellationToken);

        await PersistConversationExchangeAsync(conversationId, request.Query, narrative, cancellationToken);

        var confidence = ranked.Count > 0
            ? Math.Clamp(ranked.Average(r => r.Sim), 0, 1)
            : 0.25;

        var baseUrl = (_configuration["ListingPortalBaseUrl"] ?? "http://localhost:7071/api").TrimEnd('/');
        var recommended = ranked.Select(x => new AgentRecommendedListingDto(
            x.Listing.Id,
            x.Listing.ListingCode,
            x.Listing.Title,
            x.Listing.Description,
            x.Listing.PropertyType.ToString(),
            x.Listing.Location != null ? FormatListingLocation(x.Listing.Location) : "Unknown",
            x.Listing.Price,
            x.Listing.PriceCurrency,
            x.Listing.Bedrooms,
            x.Listing.Bathrooms,
            x.Listing.IsFurnished,
            x.Listing.Amenities.Take(8).ToList(),
            $"{baseUrl}/listings/{x.Listing.Id}",
            x.Listing.Images.FirstOrDefault(),
            Math.Round(Math.Clamp(x.Sim, 0, 1), 4))).ToList();

        return new AgentRecommendResponse(
            "000",
            narrative,
            new AgentRecommendData(
                recommended,
                conversationId,
                confidence,
                DateTime.UtcNow,
                extracted,
                usedVector,
                usedFallback));
    }

    public Task<IReadOnlyDictionary<string, object>> GetKnowledgeBaseStatusAsync(CancellationToken cancellationToken = default) =>
        _knowledgeBase.GetStatusAsync(cancellationToken);

    public Task<AgentListingSearchResponse> SearchListingsAsync(
        AgentListingSearchRequest request,
        CancellationToken cancellationToken = default)
    {
        var cacheKey = BuildAgentListingSearchCacheKey(request);
        return _cache.GetOrSetAsync(
            cacheKey,
            async () => await SearchListingsFromDatabaseAsync(request).ConfigureAwait(false));
    }

    private async Task<AgentListingSearchResponse> SearchListingsFromDatabaseAsync(
        AgentListingSearchRequest request)
    {
        var criteria = new ListingSearchCriteria
        {
            Page = 1,
            PageSize = KnowledgeCatalogPageSize
        };

        IEnumerable<Listing> query = await _listings.SearchAsync(criteria);

        if (!string.IsNullOrWhiteSpace(request.ListingId) && Guid.TryParse(request.ListingId, out var id))
            query = query.Where(l => l.Id != id);  // exclude the seed listing; caller wants similar ones
        else if (!string.IsNullOrWhiteSpace(request.ListingCode))
            query = query.Where(l => l.ListingCode.Equals(request.ListingCode, StringComparison.OrdinalIgnoreCase));

        if (!string.IsNullOrWhiteSpace(request.Location))
        {
            var loc = request.Location.ToLowerInvariant();
            query = query.Where(l =>
                l.Location.City.Contains(loc, StringComparison.OrdinalIgnoreCase) ||
                l.Location.County.Contains(loc, StringComparison.OrdinalIgnoreCase) ||
                (l.Location.Suburb?.Contains(loc, StringComparison.OrdinalIgnoreCase) ?? false));
        }

        if (!string.IsNullOrWhiteSpace(request.Amenity))
        {
            var parts = request.Amenity.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            query = query.Where(l => parts.All(a =>
                l.Amenities.Any(pa => pa.Contains(a, StringComparison.OrdinalIgnoreCase))));
        }

        var items = query
            .Select(l => new AgentListingSearchItemDto(
                l.Id,
                l.ListingCode,
                l.Title,
                l.PropertyType.ToString(),
                l.Location != null ? FormatListingLocation(l.Location) : "Unknown",
                l.Price,
                l.Amenities.Take(10).ToList()))
            .ToList();

        return new AgentListingSearchResponse(items);
    }

    private static string BuildAgentListingSearchCacheKey(AgentListingSearchRequest request)
    {
        static string N(string? s) => string.IsNullOrWhiteSpace(s) ? "_" : s.Trim().ToLowerInvariant();
        var id = string.IsNullOrWhiteSpace(request.ListingId) ? "_" : request.ListingId!.Trim().ToLowerInvariant();
        return $"stayhere:aiagent:listingsearch:{id}:{N(request.ListingCode)}:{N(request.Location)}:{N(request.Amenity)}";
    }

    private async Task PersistConversationExchangeAsync(
        string conversationId,
        string userMessage,
        string assistantMessage,
        CancellationToken cancellationToken)
    {
        var conversation = await _conversations.GetByIdAsync(conversationId, cancellationToken);
        if (conversation == null)
        {
            conversation = new AiConversation
            {
                Id = conversationId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _conversations.CreateAsync(conversation, cancellationToken);
        }

        conversation.Messages.Add(new AiConversationMessage
        {
            ConversationId = conversationId,
            Role = "user",
            Content = userMessage,
            Timestamp = DateTime.UtcNow
        });
        conversation.Messages.Add(new AiConversationMessage
        {
            ConversationId = conversationId,
            Role = "assistant",
            Content = assistantMessage,
            Timestamp = DateTime.UtcNow
        });
        conversation.UpdatedAt = DateTime.UtcNow;
        await _conversations.UpdateAsync(conversation, cancellationToken);
    }

    /// <summary>Persists every message produced during one ChatAsync turn (user message, any
    /// assistant tool-call requests, tool results, and the final assistant answer) in order.
    /// <paramref name="callerUserId"/> is only ever stamped on a brand-new conversation - an
    /// existing one keeps whichever caller originally started it.</summary>
    private async Task PersistTurnAsync(
        string conversationId,
        IReadOnlyList<AiConversationMessage> newMessages,
        Guid? callerUserId,
        CancellationToken cancellationToken)
    {
        var conversation = await _conversations.GetByIdAsync(conversationId, cancellationToken);
        if (conversation == null)
        {
            conversation = new AiConversation
            {
                Id = conversationId,
                UserId = callerUserId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _conversations.CreateAsync(conversation, cancellationToken);
        }

        foreach (var message in newMessages)
            conversation.Messages.Add(message);

        conversation.UpdatedAt = DateTime.UtcNow;
        await _conversations.UpdateAsync(conversation, cancellationToken);
    }

    /// <summary>
    /// Uses Groq by default. Only <c>Template</c>, <c>Off</c>, or <c>False</c> skips the chat call. Empty config values default to Llm.
    /// The function app must load <c>Groq__ApiKey</c>; otherwise a contextual fallback message is used.
    /// </summary>
    private async Task<string> ResolveRecommendNarrativeAsync(
        string query,
        AgentExtractedIntent extracted,
        IReadOnlyList<(Listing Listing, double Sim)> top,
        double temperature,
        CancellationToken cancellationToken)
    {
        if (top.Count == 0)
            return BuildRecommendTemplateMessage(query, extracted, top);

        var modeRaw = _configuration["Groq:RecommendNarrationMode"];
        var mode = string.IsNullOrWhiteSpace(modeRaw) ? "Llm" : modeRaw.Trim();
        var skipLlm = mode.Equals("Template", StringComparison.OrdinalIgnoreCase)
                      || mode.Equals("Off", StringComparison.OrdinalIgnoreCase)
                      || mode.Equals("False", StringComparison.OrdinalIgnoreCase);
        if (skipLlm)
        {
            _logger.LogDebug("Recommend narration using non-LLM mode ({Mode})", mode);
            return BuildRecommendTemplateMessage(query, extracted, top);
        }

        if (string.IsNullOrWhiteSpace(GetGroqApiKey()))
        {
            _logger.LogWarning(
                "Recommend narration: Groq API key missing for this host. Set Groq__ApiKey in src/FunctionApps/AiAgentService/local.settings.json (see local.settings.sample.json). Using contextual fallback.");
            return BuildRecommendTemplateMessage(query, extracted, top);
        }

        var kbSection = await BuildRecommendKnowledgeSectionAsync(query, extracted, cancellationToken);
        var userPrompt = BuildRecommendNarrationUserPrompt(query, extracted, top, kbSection);

        var maxTokens = int.TryParse(_configuration["Groq:RecommendNarrationMaxTokens"], out var mt)
            ? Math.Clamp(mt, 64, 500)
            : 220;
        var timeoutSec = int.TryParse(_configuration["Groq:RecommendLlmTimeoutSeconds"], out var ts)
            ? Math.Clamp(ts, 8, 90)
            : 35;

        try
        {
            using var llmCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            llmCts.CancelAfter(TimeSpan.FromSeconds(timeoutSec));
            var text = await _chatService.GenerateResponseAsync(
                userPrompt,
                maxTokens,
                temperature,
                llmCts.Token,
                GetRecommendNarrationSystemPrompt());
            if (string.IsNullOrWhiteSpace(text))
            {
                _logger.LogWarning("Recommend narration LLM returned empty text; using contextual fallback");
                return BuildRecommendTemplateMessage(query, extracted, top);
            }

            _logger.LogInformation("Recommend narration LLM ok ({Length} chars)", text.Length);
            return text.Trim();
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Recommend narration LLM timed out after {TimeoutSec}s; using contextual fallback", timeoutSec);
            return BuildRecommendTemplateMessage(query, extracted, top);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Recommend narration LLM failed; using contextual fallback");
            return BuildRecommendTemplateMessage(query, extracted, top);
        }
    }

    private string? GetGroqApiKey() =>
        _configuration["Groq:ApiKey"]?.Trim()
        ?? Environment.GetEnvironmentVariable("GROQ_API_KEY")?.Trim();

    private async Task<string> BuildRecommendKnowledgeSectionAsync(
        string query,
        AgentExtractedIntent extracted,
        CancellationToken cancellationToken)
    {
        var wantKb = !string.IsNullOrWhiteSpace(extracted.Locations)
                     || !string.IsNullOrWhiteSpace(extracted.AmenityKeywords);
        if (!wantKb)
            return "";

        try
        {
            var kbQuery = string.Join(' ', new[]
            {
                extracted.Locations,
                extracted.AmenityKeywords,
                extracted.PropertyTypeKeywords,
                query
            }.Where(s => !string.IsNullOrWhiteSpace(s)));

            var kb = await _knowledgeBase.SearchAsync(kbQuery.Trim(), topK: 5, cancellationToken);
            if (kb.Count == 0)
                return "";

            var lines = kb
                .Take(4)
                .Select(r => r.Content.Trim())
                .Where(c => c.Length > 0)
                .Select(c => c.Length > 600 ? c[..600] + "…" : c);

            return "\n\nReference snippets about Kenya / Nairobi (use for general area or market context only; listing lines below are the only source of truth for specific units):\n"
                   + string.Join("\n", lines.Select(c => "- " + c));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Knowledge base lookup for recommend narration skipped");
            return "";
        }
    }

    private static string BuildRecommendNarrationUserPrompt(
        string query,
        AgentExtractedIntent extracted,
        IReadOnlyList<(Listing Listing, double Sim)> top,
        string kbSection)
    {
        var budgetLine = extracted.MaxPrice.HasValue || extracted.MinPrice.HasValue
            ? $"Budget: {(extracted.MinPrice.HasValue ? $"from ~{extracted.MinPrice.Value:N0} " : "")}{(extracted.MaxPrice.HasValue ? $"up to ~{extracted.MaxPrice.Value:N0}" : "").Trim()} KES (from user wording)."
            : "Budget: not specified.";

        var listingLines = top.Select((t, i) =>
        {
            var a = t.Listing.Amenities.Count > 0
                ? string.Join(", ", t.Listing.Amenities)
                : "none listed";
            return $"{i + 1}. [{t.Listing.ListingCode}] {t.Listing.Title} | {FormatListingLocation(t.Listing.Location)} | " +
                   $"{t.Listing.Bedrooms} bed | {t.Listing.Price:N0} {t.Listing.PriceCurrency} | Amenities: {a}";
        });

        var amenityGap = !string.IsNullOrWhiteSpace(extracted.AmenityKeywords)
                         && !AnyListingFullyMatchesRequestedAmenities(top, extracted.AmenityKeywords);
        var dataNote = amenityGap
            ? "\nData note: None of these listings explicitly list all of the user’s requested features in the amenity field or title/description. Acknowledge that honestly and suggest confirming with the agent or on a viewing."
            : "";

        return $"""
            Write the short in-app message the renter will see above their search results.

            CRITICAL — voice and length:
            - Do NOT restate or paraphrase what the user already typed (no “you’re looking for…”, no repeating budget/type/amenity shopping list). They already know their ask.
            - Open straight with useful substance: neighborhood character, commute or lifestyle texture—grounded in general Nairobi/Kenya knowledge. If you give an amenity tip, it must match what the user asked for (e.g. pool guidance only if they asked for a pool—not balcony copy because a listing happens to list a balcony). No invented statistics.
            - Then tie briefly to the listings below (codes, beds, rent) without catalogue filler. Forbidden openers: “I found”, “Here are”, “Found X listing(s)”.
            - Keep it tight: about three to five short sentences total, then a one-line nudge to tap a card.

            User query (context only; do not quote back): "{query}"

            Extracted criteria:
            - Areas of interest: {extracted.Locations ?? "not specified"}
            - Bedrooms: {FormatBedroomIntent(extracted)}
            - {budgetLine}
            - Property style(s): {extracted.PropertyTypeKeywords ?? "not specified"}
            - Features / amenities the user asked for: {extracted.AmenityKeywords ?? "not specified"}
            {dataNote}

            Listings (only use these for specific facts: price, beds, location, amenities, codes):
            {string.Join("\n", listingLines)}
            {kbSection}

            Follow the system instructions. Output only the message text (no title, no meta-commentary).
            """;
    }

    private static string GetRecommendNarrationSystemPrompt() =>
        """
        You are StayHere’s in-app assistant: a concise Nairobi-savvy rental guide.

        The user already sees their own search. Do not repeat or summarize their criteria (no “you asked for…”, no restating budget/type/amenities as an opener).

        Rules:
        1) Every concrete fact about a unit (rent, beds, area name, amenities, listing code) must match the listing lines in the user message. Never invent prices, codes, or amenities.
        2) Open with immediate value: neighborhood/suburb vibe and what life along that corridor is like. Optional: one practical sentence only for amenities the user actually requested (pool vs gym vs balcony vs parking, etc.). Do not discuss balconies if they only asked for a pool, or vice versa—ignore unrelated listing amenities for “tips.”
        3) If a data note says a requested feature isn’t clearly in the listing data, say so briefly; stay helpful.
        4) Then one tight bridge to the actual picks (use listing codes). No catalogue tone, no markdown, no bullet lists.
        5) Length: about three to five sentences, plus an optional short closing line to tap a listing. Total stay brief.

        Output only the user-facing text.
        """;

    private static bool AnyListingFullyMatchesRequestedAmenities(
        IReadOnlyList<(Listing Listing, double Sim)> top,
        string amenityKeywords)
    {
        var wanted = amenityKeywords.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Select(s => s.Trim().ToLowerInvariant())
            .Where(s => s.Length > 0)
            .ToList();
        if (wanted.Count == 0)
            return true;

        return top.Any(x =>
        {
            var amenityList = x.Listing.Amenities.ToList();
            var blob = $"{x.Listing.Title} {x.Listing.Description} {string.Join(' ', amenityList)}".ToLowerInvariant();
            return wanted.All(w => ListingTextImpliesAmenity(blob, amenityList, w));
        });
    }

    private static string FormatBedroomIntent(AgentExtractedIntent extracted)
    {
        if (extracted.MinBedrooms.HasValue && extracted.MaxBedrooms.HasValue)
            return $"{extracted.MinBedrooms}-{extracted.MaxBedrooms}";
        if (extracted.MinBedrooms.HasValue)
            return $"{extracted.MinBedrooms}+";
        return "n/a";
    }

    private static string BuildRecommendTemplateMessage(
        string query,
        AgentExtractedIntent extracted,
        IReadOnlyList<(Listing Listing, double Sim)> top)
    {
        if (top.Count == 0)
            return "I couldn't find listings that match closely yet. Try adjusting area or budget, or add more listings with embeddings (create/update listing).";

        var amenityGap = !string.IsNullOrWhiteSpace(extracted.AmenityKeywords)
                         && !AnyListingFullyMatchesRequestedAmenities(top, extracted.AmenityKeywords);
        var caveat = amenityGap
            ? $" We don’t see {FormatAmenityPhraseForMessage(extracted.AmenityKeywords!)} spelled out on these records—confirm with the agent or on a viewing."
            : "";

        var lead = BuildTemplateLocationAndAmenityLead(extracted, top);
        var compactListings = string.Join("; ", top.Select(t =>
            $"{t.Listing.ListingCode} — {t.Listing.Bedrooms}BR @ {t.Listing.Price:N0} {t.Listing.PriceCurrency}"));

        return $"{lead} {compactListings}.{caveat} Tap a card for full details.";
    }

    /// <summary>Short, useful copy—suburb texture plus amenity tips only for features the user asked for.</summary>
    private static string BuildTemplateLocationAndAmenityLead(
        AgentExtractedIntent extracted,
        IReadOnlyList<(Listing Listing, double Sim)> top)
    {
        var suburb = top.Select(t => t.Listing.Location?.Suburb)
            .FirstOrDefault(s => !string.IsNullOrWhiteSpace(s));
        var city = top.First().Listing.Location?.City ?? "Nairobi";

        var place = !string.IsNullOrWhiteSpace(suburb) ? $"{suburb}, {city}" : city;
        var areaNote = ResolveSuburbRenterNote(suburb, city);
        var amenityTips = BuildTipsForUserRequestedAmenitiesOnly(extracted);

        var batch = top.Count == 1 ? "This pick sits" : "These picks sit";
        return $"{areaNote}{amenityTips} {batch} around {place}:";
    }

    /// <summary>Tips keyed strictly to <see cref="AgentExtractedIntent.AmenityKeywords"/>—never driven by unrelated listing amenities.</summary>
    private static string BuildTipsForUserRequestedAmenitiesOnly(AgentExtractedIntent extracted)
    {
        if (string.IsNullOrWhiteSpace(extracted.AmenityKeywords))
            return "";

        var tokens = extracted.AmenityKeywords.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Select(s => s.Trim().ToLowerInvariant())
            .Where(s => s.Length > 0)
            .Distinct()
            .ToList();

        var tips = new List<string>();
        foreach (var t in tokens)
        {
            var sentence = t switch
            {
                "balcony" => BalconyRenterTipSentence(),
                "pool" => PoolRenterTipSentence(),
                "gym" => GymRenterTipSentence(),
                "parking" => ParkingRenterTipSentence(),
                "wifi" => WifiRenterTipSentence(),
                "elevator" => ElevatorRenterTipSentence(),
                "security" => SecurityRenterTipSentence(),
                "generator" => GeneratorRenterTipSentence(),
                "water backup" => WaterBackupRenterTipSentence(),
                "pet friendly" => PetRenterTipSentence(),
                _ => null
            };
            if (sentence != null && !tips.Contains(sentence))
                tips.Add(sentence);
        }

        return tips.Count == 0 ? "" : " " + string.Join(" ", tips);
    }

    private static string BalconyRenterTipSentence() =>
        "Road-facing balconies often get more sky and traffic hum; courtyard-facing ones are calmer with a tighter outlook—check floor, orientation, and glazing when you visit.";

    private static string PoolRenterTipSentence() =>
        "Shared pools are usually compound- or tower-level in Nairobi—confirm access, hours, maintenance, and whether your block or phase is included before you commit.";

    private static string GymRenterTipSentence() =>
        "Gyms vary from a small in-building room to a separate membership—ask what’s included in rent and peak crowding times.";

    private static string ParkingRenterTipSentence() =>
        "Clarify if parking is assigned, shared, visitor-only, or street—and whether it’s bundled in the rent.";

    private static string WifiRenterTipSentence() =>
        "Check if internet is included, building fibre is shared, or you’ll supply your own line and router.";

    private static string ElevatorRenterTipSentence() =>
        "If lifts matter, confirm service in the block and backup for upper floors.";

    private static string SecurityRenterTipSentence() =>
        "Ask how access control works (gates, guards, CCTV) and who responds after hours.";

    private static string GeneratorRenterTipSentence() =>
        "Backup power may cover common areas only—confirm what stays live in the unit during outages.";

    private static string WaterBackupRenterTipSentence() =>
        "Water storage and pump schedules differ by building—ask typical pressure and downtime patterns.";

    private static string PetRenterTipSentence() =>
        "Pet rules vary by landlord and building—get written confirmation on size, deposits, and common-area access.";

    private static string ResolveSuburbRenterNote(string? suburb, string city)
    {
        if (!string.IsNullOrWhiteSpace(suburb)
            && SuburbRenterNotes.TryGetValue(suburb.Trim(), out var note))
            return note;

        if (!string.IsNullOrWhiteSpace(suburb))
            return $"{suburb} sits within {city}; streets differ block by block, so lean on the map pin and a walk-through for noise, security, and commute feel.";

        return $"{city} rentals vary sharply by block—use the listing location and a viewing to judge traffic, light, and building access.";
    }

    private static readonly Dictionary<string, string> SuburbRenterNotes =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["Westlands"] =
                "Westlands mixes offices, malls, and dense housing; arterials like Waiyaki Way stay busy at peak, while side streets can feel quieter.",
            ["Kilimani"] =
                "Kilimani is walkable and social with lots of cafés and flats—good mid-town access, but side roads can get tight parking and evening noise.",
            ["Karen"] =
                "Karen is leafier and more spread out—expect longer hops to the CBD but calmer blocks and larger compounds.",
            ["Lavington"] =
                "Lavington tends toward residential calm with strong schools nearby; main connectors still clog at rush hour.",
            ["Parklands"] =
                "Parklands sits close to hospitals and the CBD fringe—convenient, with pockets that feel busier than others.",
            ["South B"] =
                "South B offers relatively accessible rent near the south corridor—traffic on Mombasa Road can dominate commute time.",
            ["South C"] =
                "South C is largely residential with a neighborhood feel; check proximity to main roads for noise.",
            ["Runda"] =
                "Runda is gated and quiet—more driving for daily errands, less street bustle.",
            ["Muthaiga"] =
                "Muthaiga is low-density and green; expect a calmer setting and a bit more distance to central hubs.",
            ["Eastleigh"] =
                "Eastleigh is dense and commercial—great for on-foot shopping, with busy streets and varied building stock.",
            ["Ngong"] =
                "Ngong is farther out with a cooler, hill-town feel; budget extra commute if you work central.",
        };

    private static string FormatAmenityPhraseForMessage(string amenityKeywordsCommaSeparated)
    {
        var parts = amenityKeywordsCommaSeparated.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Select(s => s.Trim())
            .Where(s => s.Length > 0)
            .ToList();
        if (parts.Count == 0)
            return amenityKeywordsCommaSeparated.Trim();
        if (parts.Count == 1)
            return parts[0];
        return string.Join(", ", parts.Take(parts.Count - 1)) + " and " + parts[^1];
    }

    /// <summary>
    /// Cosine similarity from pgvector is typically a modest number (often ~0.25–0.55) for short queries vs templated listing text.
    /// Blend with structured intent fit so listings that satisfy extracted type/amenities surface with a higher <see cref="AgentRecommendedListingDto.MatchScore"/> for thresholding.
    /// </summary>
    private static double CombineVectorAndIntentAlignment(double cosineSimilarity, Listing listing, AgentExtractedIntent intent)
    {
        const double vectorWeight = 0.35;
        var alignment = ComputeIntentAlignmentScore(listing, intent);
        return Math.Clamp(vectorWeight * cosineSimilarity + (1 - vectorWeight) * alignment, 0, 1);
    }

    /// <summary>1.0 when no structured signals; otherwise average of applicable property-type and amenity match scores.</summary>
    private static double ComputeIntentAlignmentScore(Listing listing, AgentExtractedIntent intent)
    {
        var scores = new List<double>();
        if (!string.IsNullOrWhiteSpace(intent.PropertyTypeKeywords))
        {
            var types = intent.PropertyTypeKeywords.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                .Select(s => s.ToLowerInvariant())
                .ToList();
            var prop = listing.PropertyType.ToString().ToLowerInvariant();
            var titleDesc = $"{listing.Title} {listing.Description}".ToLowerInvariant();
            var typeOk = types.Any(t =>
                prop.Contains(t, StringComparison.OrdinalIgnoreCase) ||
                titleDesc.Contains(t, StringComparison.OrdinalIgnoreCase));
            scores.Add(typeOk ? 1 : 0);
        }

        if (!string.IsNullOrWhiteSpace(intent.AmenityKeywords))
        {
            var wanted = intent.AmenityKeywords.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                .Select(s => s.Trim().ToLowerInvariant())
                .Where(s => s.Length > 0)
                .ToList();
            if (wanted.Count > 0)
            {
                var amenityList = listing.Amenities.ToList();
                var blob = $"{listing.Title} {listing.Description} {string.Join(' ', amenityList)}".ToLowerInvariant();
                var matched = wanted.Count(w => ListingTextImpliesAmenity(blob, amenityList, w));
                scores.Add((double)matched / wanted.Count);
            }
        }

        return scores.Count == 0 ? 1 : scores.Average();
    }

    private static bool ListingTextImpliesAmenity(string blobLower, IReadOnlyList<string> amenities, string canonicalToken)
    {
        bool AmenityFieldContains(string sub) =>
            amenities.Any(a => a.Contains(sub, StringComparison.OrdinalIgnoreCase));

        return canonicalToken switch
        {
            "elevator" => blobLower.Contains("elevator", StringComparison.OrdinalIgnoreCase) || blobLower.Contains("lift", StringComparison.OrdinalIgnoreCase),
            "wifi" => blobLower.Contains("wifi", StringComparison.OrdinalIgnoreCase) || blobLower.Contains("wi-fi", StringComparison.OrdinalIgnoreCase),
            "parking" => blobLower.Contains("parking", StringComparison.OrdinalIgnoreCase) || blobLower.Contains("garage", StringComparison.OrdinalIgnoreCase) || AmenityFieldContains("parking"),
            "pool" => blobLower.Contains("pool", StringComparison.OrdinalIgnoreCase) || blobLower.Contains("swimming", StringComparison.OrdinalIgnoreCase),
            _ => blobLower.Contains(canonicalToken, StringComparison.OrdinalIgnoreCase) || AmenityFieldContains(canonicalToken)
        };
    }

    private static List<(Listing Listing, double Sim)> PostFilterRanked(
        List<(Listing Listing, double Sim)> ranked,
        AgentExtractedIntent extracted)
    {
        IEnumerable<(Listing L, double S)> q = ranked;
        if (extracted.MinBedrooms.HasValue)
            q = q.Where(x => x.L.Bedrooms >= extracted.MinBedrooms.Value);
        if (extracted.MaxBedrooms.HasValue)
            q = q.Where(x => x.L.Bedrooms <= extracted.MaxBedrooms.Value);
        if (extracted.MaxPrice.HasValue)
            q = q.Where(x => x.L.Price <= extracted.MaxPrice.Value);
        if (extracted.MinPrice.HasValue)
            q = q.Where(x => x.L.Price >= extracted.MinPrice.Value);
        if (!string.IsNullOrEmpty(extracted.Locations))
        {
            var parts = extracted.Locations.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
            q = q.Where(x => parts.Any(p =>
                x.L.Location.City.Contains(p, StringComparison.OrdinalIgnoreCase) ||
                x.L.Location.County.Contains(p, StringComparison.OrdinalIgnoreCase) ||
                (x.L.Location.Suburb?.Contains(p, StringComparison.OrdinalIgnoreCase) ?? false)));
        }

        return q.ToList();
    }

    private static List<Listing> FilterByExtractedIntent(List<Listing> listings, AgentExtractedIntent extracted)
    {
        IEnumerable<Listing> q = listings;
        if (extracted.MinBedrooms.HasValue)
            q = q.Where(l => l.Bedrooms >= extracted.MinBedrooms.Value);
        if (extracted.MaxBedrooms.HasValue)
            q = q.Where(l => l.Bedrooms <= extracted.MaxBedrooms.Value);
        if (extracted.MaxPrice.HasValue)
            q = q.Where(l => l.Price <= extracted.MaxPrice.Value);
        if (extracted.MinPrice.HasValue)
            q = q.Where(l => l.Price >= extracted.MinPrice.Value);
        if (!string.IsNullOrEmpty(extracted.Locations))
        {
            var parts = extracted.Locations.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
            q = q.Where(l => parts.Any(p =>
                l.Location.City.Contains(p, StringComparison.OrdinalIgnoreCase) ||
                l.Location.County.Contains(p, StringComparison.OrdinalIgnoreCase) ||
                (l.Location.Suburb?.Contains(p, StringComparison.OrdinalIgnoreCase) ?? false)));
        }

        return q.ToList();
    }

    private static string FormatListingLocation(PropertyLocation? location)
    {
        if (location == null) return "Unknown";
        var suburb = string.IsNullOrWhiteSpace(location.Suburb) ? null : location.Suburb;
        return suburb is null ? location.City : $"{suburb}, {location.City}";
    }

    private static string PrepareContext(IReadOnlyList<AgentKnowledgeSearchResult> searchResults)
    {
        if (searchResults.Count == 0)
            return "No specific information found in knowledge base.";

        var contextParts = searchResults.Select(r => $"Source: {r.Source}\n{r.Content}\n");
        return string.Join("\n---\n", contextParts);
    }

    /// <summary>
    /// System prompt for the tool-calling agent loop: base persona/loyalty rules, grounding rules that
    /// force Sage to use tools rather than invent listing/market facts, and any static knowledge-base
    /// context relevant to the query (company policies, general Nairobi market notes, etc).
    /// </summary>
    private static string BuildAgentSystemPrompt(string context, bool isAuthenticated)
    {
        var parts = new List<string>
        {
            GetSystemPrompt(),
            """

            TOOLS & GROUNDING (STRICT):
            - You have tools to search live StayHere listings, fetch full listing details, compare listings, get semantic recommendations, and look up real nearby places (schools, hospitals, malls, transit, restaurants, police/local-government-office infrastructure).
            - Never state a specific price, address, amenity, or availability for a listing without first calling a tool to confirm it. General market context (not tied to a specific listing) may be answered directly.
            - get_nearby_places results carry BOTH a straight-line distanceMeters AND, for the nearest few, a real walkingDistanceMeters/walkingDurationMinutes from an actual walking route - prefer the walking figures when present (e.g. "about 650m / 8 min walk") since they reflect real roads/paths, not a straight line through buildings; fall back to the straight-line distance only when walking figures are null for that place.
            - MATCH THE PLACE CATEGORY TO WHAT THE USER ACTUALLY ASKED, don't default to one category out of habit. Read the query for what kind of "closeness" matters and query get_nearby_places for that: schools for families/commute-to-school questions, hospitals for health/medical proximity, transit for commute questions, mall/restaurant for lifestyle/convenience questions. You can pass several categories in one call, comma-separated, when a question spans more than one kind of place.
            - SECURITY/SAFETY QUESTIONS ("is this a secure area", "the most secure listing", "how safe is it") specifically require BOTH signals, not just one: (1) call get_nearby_places with category "police,local_government_office" (the real-world proxy for police posts, chief's camps, and administration security offices - StayHere has no crime-data source, so this is proximity to security infrastructure only, never a crime/safety rating - say so if you state it explicitly), AND (2) check the listing's own security-related features (guarded entry, CCTV, estate/perimeter security, etc.) via get_listing_details/compare_listings. Weigh both together in your answer rather than answering from just one signal.
            - "CLOSEST/NEAREST OF THESE" QUESTIONS spanning several listings (e.g. "which of these is closest to X", "give me the unit closest to X police station") require calling get_nearby_places ONCE PER CANDIDATE LISTING, not just one of them - you cannot determine which is actually closest without checking every candidate's own distance. Only name a "closest" listing once you have a distance for each one being compared.
            - RANKING/ORDERING IS STRICT, NOT JUST A WORD CHOICE IN YOUR REPLY: the listing cards shown to the user render in EXACTLY the order the data comes back from your tool calls - your own text can say "the cheapest option is X" while the cards still show a different, wrong order if you didn't actually sort the underlying data. For objective/DB-sortable criteria (price, bedrooms, rating, newest), always set search_listings' sortBy/sortDescending to match what the user asked for - never rely on the default (newest-first) when they asked for "cheapest", "most expensive", "biggest", "top rated", etc. For subjective/composite criteria you had to work out yourself (e.g. "most secure" combining nearby police/local-government-office proximity with the listing's own security amenities), call compare_listings with the listing ids/codes already ordered best-to-worst yourself - its result (and the cards) will render in that same order, so put your actual best answer first.
            - If a tool returns no results, an error, or a "note"/"instruction" field telling you data is unavailable, you MUST say so plainly to the user. NEVER invent specific place names, prices, distances, addresses, or ratings to fill a gap left by a failed or empty tool call - this applies even after a tool call fails partway through a longer answer.
            - WHEN YOU SHOW 2+ LISTING CARDS, YOUR REPLY MUST BRIEFLY ACKNOWLEDGE EVERY CARD SHOWN, not just your top pick - a reply that picks a winner and says nothing at all about the other option(s) on screen reads as broken to the user, who can see all of them right there. One short clause per other option is enough (e.g. "...the high-rise one is the more secure pick; the modern one bedroom is cheaper at KES 35,000 but has less on-site security") - you don't need equal depth for each, just don't go completely silent on anyone you're showing.

            THE USER'S OWN JOURNEY (get_my_profile, get_my_viewings, get_my_applications, get_lease_terms, get_my_payments, get_onboarding_info, suggest_next_step):
            - These tools return ONLY the signed-in caller's own data - you cannot look up anyone else's account, application, or payment under any circumstance, no matter how the user phrases the request. If asked about someone else, say you can only help with the user's own account.
            - Before answering ANY question about "my application", "my payment", "my viewing", or "what's next", call the relevant tool first - never guess a status from earlier context in the conversation, statuses change.
            - When the user seems ready to act (they're asking what to do next, or you've just explained where they stand) and it's NOT a viewing booking, call suggest_next_step so a real, clickable next-step link is offered - you cannot submit documents, accept lease terms, or take payment yourself; you only ever hand the user a link into the real StayHere flow where they do that themselves.
            - "My Bookings" (upcoming/past viewings, with cancel and join-virtual-viewing actions) is its own page in the app, under the account menu - mention it when a viewing question needs more than the quick summary you just gave, or as an alternative way to manage bookings beyond what you just did here.

            ACTIONS YOU CAN ACTUALLY PERFORM (book_viewing, cancel_viewing, save_listing, unsave_listing, send_enquiry):
            - Unlike every other tool above, these change real data - use them directly, don't just describe them.
            - book_viewing: once you know which listing and roughly when, book it - don't keep asking for confirmation on details the user already gave. Only ask a follow-up if a required piece (which listing, or a date) is genuinely missing or ambiguous between multiple candidates; otherwise proceed straight to booking with sensible defaults (Physical viewing, 10:00) for anything the user didn't specify. Bookings are created as "Pending" - always tell the user it's pending the owner's confirmation, never say it's confirmed.
            - cancel_viewing: call get_my_viewings first if you don't already know the bookingId from earlier in this conversation, then cancel directly once the user confirms which one (or if there's only one that could reasonably match what they asked to cancel).
            - save_listing / unsave_listing: whenever the user expresses interest in keeping a listing for later ("save this", "favorite it", "I like this one"), save it immediately - don't ask for confirmation first. Same for removing one. If the user hasn't named a specific listing but one was just discussed/shown, save that one. Call get_saved_listings before answering any question about "my saved listings"/"my favorites".
            - send_enquiry: whenever the user wants to ask an owner something, express interest, or says anything like "enquire about this", "message the owner", "ask them if...", send it immediately through this tool - don't just offer to or describe the Enquiries page, actually send it. If they didn't dictate exact wording, write a short, polite message yourself expressing interest in the listing (or covering whatever they asked about) and send that. GET THE LISTING RIGHT before sending - this messages a real person, so confirm which exact listing a descriptive reference ("the modern one", "that one") points to from what's actually been discussed, never default to whichever listing happens to be first in a recent search's results; ask the user to confirm if it's genuinely ambiguous. After it returns, describe the enquiry using the EXACT listing title the tool gives back - never a different name than what was actually sent. This is the ONLY way to reach an owner - call get_my_enquiries before answering any question about "my enquiries" or whether an owner has replied, never guess from earlier context.
            - Everything else in the rental journey - submitting documents, accepting lease terms, and making payments - is deliberately NOT something you can do; those involve money or binding agreements, so keep directing the user to suggest_next_step's link for those instead.
            """
        };

        if (!isAuthenticated)
        {
            parts.Add(
                "\n\nThe current user is not signed in. If they ask about their own applications, payments, viewings, " +
                "or account, tell them they need to sign in to StayHere first - do not call the personal tools above, " +
                "they will simply return nothing useful.");
        }

        if (!string.IsNullOrEmpty(context) && context != "No specific information found in knowledge base.")
            parts.Add($"\n\nRelevant background information:\n{context}");

        return string.Join("\n", parts);
    }

    private static string GetSystemPrompt() =>
        @"You are StayHere's in-app real estate assistant for the Kenyan market. You only operate inside the StayHere platform and only ever refer renters and buyers back to StayHere — never to any other site, app, brand, or service.

CONVERSATION RULES:
- Keep responses conversational and concise (2-4 sentences max)
- Only use greetings like ""Hey"" or ""Hi"" for the FIRST message in a conversation
- For follow-up messages, jump straight to the answer
- Remember what you've discussed and build on it naturally
- Stay on topic and reference previous questions when relevant
- Don't repeat information you've already provided
- When you've gathered data from multiple tools (e.g. a listing's own features plus nearby places), synthesize it into one tight answer - name the 1-2 most relevant supporting details, not every place/amenity a tool returned. Enough to back up the claim, not a data dump.
- WRITE LIKE YOU'RE TALKING, NOT FORMATTING A DOCUMENT: plain prose, no markdown at all - no **bold**, no bullet/numbered lists, no literal [link](url) syntax. Whenever a listing is involved, its card already renders below your message with its photo, price, and a tap-through to full details and booking - your job is the conversational part, not re-describing or re-linking what the card already shows.
- NEVER mention a listing's internal code (e.g. ""L1003"") or its database ID (a long id like ""d57c6a39-..."") in your reply - a renter has no use for either, and the card underneath already identifies the listing visually. Refer to listings by name/description instead (""the modern one-bedroom"", ""the high-rise unit""). The ONLY time a listing code may appear is inside a tool call's own arguments, never in the text you show the user.
- Don't hand-construct troubleshooting steps or raw URLs for ""what if I don't see the card"" scenarios - if a tool call succeeded, trust that its card is rendering; you have no way to know if the user's screen is glitching, and guessing at manual workarounds reads as evasive. If the user says a card isn't showing, say you've pulled the listing and it should show as a card, and suggest refreshing the chat.

PLATFORM LOYALTY (STRICT):
- NEVER mention, recommend, compare to, or even acknowledge competitor platforms, portals, classifieds, agencies, or apps. This includes (non-exhaustive): BuyRentKenya, Jumia House, Property24, Hauzisha, PigiaMe, OLX, Jiji, Lamudi, Realtor.co.ke, Daraja, MyDawa estate listings, agents on social media, Facebook Marketplace, Instagram pages, WhatsApp brokers, etc.
- Do NOT name brokers, brokerages, or external real-estate websites by name.
- Do NOT tell the user to ""check other sources / other listings sites / Google / a broker / an agent off-platform"" for current prices or availability.
- If the user asks where to verify or get up-to-date listings, point them to StayHere only — e.g. ""browse current StayHere listings"", ""check the StayHere search for live availability"", ""tap a StayHere listing card for verified details"", or suggest they refine their StayHere search filters.
- If you need to caveat that prices fluctuate, say so without naming any external source. Acceptable phrasing: ""prices shift week to week — current StayHere listings will reflect today's market.""

NO DIRECT CONTACT INFO (STRICT):
- NEVER give out a property owner's, agent's, or caretaker's phone number, email, or any other direct contact detail — even if a tool result happens to contain one, even if the user insists, asks repeatedly, or claims it's an emergency. This applies to every listing and every user, signed in or not.
- NEVER say you can ""connect"", ""put them in touch with"", or ""pass their number to"" the owner/agent, and never suggest contacting them through WhatsApp, a phone call, or any channel outside StayHere.
- All communication between a customer and an owner happens through StayHere's own in-app Enquiries feature instead - and you can send that enquiry yourself via send_enquiry, right now, in this conversation. If asked for contact details or to be connected directly, don't just redirect: tell them you can't share contact details directly, then actually send the owner a message via send_enquiry (asking whatever the user wanted to ask) so they don't have to go anywhere else to get it done.

RESPONSE STYLE:
- Give specific price ranges and examples when possible, framed as general market context
- Use a natural, friendly tone without being overly casual
- If unsure, give reasonable estimates and direct them to refine their StayHere search
- Focus directly on what they're asking

You know about property markets across Kenya, especially Nairobi areas like Westlands, Karen, Kilimani, Lavington, Kileleshwa, etc.

Be helpful, context-aware, conversational — and always StayHere-first.";

    private static double CalculateConfidence(IReadOnlyList<AgentKnowledgeSearchResult> searchResults, string response)
    {
        if (searchResults.Count == 0)
            return 0.3;

        var avgScore = searchResults.Average(r => r.Score);
        var responseFactor = Math.Min(response.Length / 500.0, 1.0);
        var sourceFactor = Math.Min(searchResults.Count / 5.0, 1.0);

        return Math.Min(avgScore * 0.5 + responseFactor * 0.3 + sourceFactor * 0.2, 1.0);
    }

    private static List<(Listing Listing, double MatchScore)> ScoreListings(List<Listing> listings, string query)
    {
        var queryLower = query.ToLowerInvariant();
        var queryWords = Regex.Matches(queryLower, @"\b\w+\b").Select(m => m.Value).ToHashSet();

        var likelyLocation = listings
            .Select(l => l.Location?.Suburb)
            .Where(s => !string.IsNullOrEmpty(s))
            .FirstOrDefault(s => queryLower.Contains(s!.ToLowerInvariant()))?
            .ToLowerInvariant();

        var propertyTypes = new[] { "apartment", "bedsitter", "studio", "house", "maisonette" };
        var likelyType = propertyTypes.FirstOrDefault(t => queryLower.Contains(t));

        var scored = new List<(Listing, double)>();

        foreach (var listing in listings)
        {
            var propText = string.Join(" ",
                listing.Title,
                listing.Description ?? "",
                listing.PropertyType,
                listing.ListingType,
                listing.Location?.Suburb ?? "",
                string.Join(" ", listing.Amenities)).ToLowerInvariant();

            var propWords = Regex.Matches(propText, @"\b\w+\b").Select(m => m.Value).ToHashSet();
            var intersection = queryWords.Intersect(propWords).Count();
            var union = queryWords.Union(propWords).Count();
            var textSimilarity = union > 0 ? (double)intersection / union : 0;

            var suburb = listing.Location?.Suburb?.ToLowerInvariant() ?? "";
            var locationBonus = likelyLocation != null && suburb == likelyLocation ? 0.4 : 0;
            var typeBonus = likelyType != null && listing.PropertyType.ToString().ToLowerInvariant().Contains(likelyType) ? 0.3 : 0;
            var locationPenalty = likelyLocation != null && suburb != likelyLocation ? -0.3 : 0;
            var typePenalty = likelyType != null && !listing.PropertyType.ToString().ToLowerInvariant().Contains(likelyType) ? -0.25 : 0;

            var score = textSimilarity + locationBonus + typeBonus + locationPenalty + typePenalty;
            scored.Add((listing, Math.Round(score, 3)));
        }

        return scored;
    }
}
