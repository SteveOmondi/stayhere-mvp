using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StayHere.Application.AiAgent.Models;
using StayHere.Application.Common.Interfaces;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Application.AiAgent.Services;

public class AiAgentService : IAiAgentService
{
    private const int KnowledgeCatalogPageSize = 500;

    private readonly IAgentKnowledgeBaseRepository _knowledgeBase;
    private readonly IOpenRouterChatService _openRouter;
    private readonly IEmbeddingService _embeddingService;
    private readonly IAgentConversationRepository _conversations;
    private readonly IListingRepository _listings;
    private readonly ICacheService _cache;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AiAgentService> _logger;

    public AiAgentService(
        IAgentKnowledgeBaseRepository knowledgeBase,
        IOpenRouterChatService openRouter,
        IEmbeddingService embeddingService,
        IAgentConversationRepository conversations,
        IListingRepository listings,
        ICacheService cache,
        IConfiguration configuration,
        ILogger<AiAgentService> logger)
    {
        _knowledgeBase = knowledgeBase;
        _openRouter = openRouter;
        _embeddingService = embeddingService;
        _conversations = conversations;
        _listings = listings;
        _cache = cache;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<AgentChatResponse> ChatAsync(AgentChatRequest request, CancellationToken cancellationToken = default)
    {
        var conversationId = request.ConversationId ?? Guid.NewGuid().ToString();

        var searchResults = await _knowledgeBase.SearchAsync(request.Query, topK: 5, cancellationToken);
        var context = PrepareContext(searchResults);
        var history = await _conversations.GetHistoryAsync(conversationId, cancellationToken);
        var prompt = BuildPrompt(request.Query, context, history);

        var response = await _openRouter.GenerateResponseAsync(
            prompt,
            request.MaxTokens,
            request.Temperature,
            cancellationToken);

        var confidence = CalculateConfidence(searchResults, response);
        await PersistConversationExchangeAsync(conversationId, request.Query, response, cancellationToken);

        return new AgentChatResponse(
            response,
            conversationId,
            searchResults.Select(r => r.Source).Distinct().ToList(),
            confidence,
            DateTime.UtcNow);
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
            FormatListingLocation(x.Listing.Location),
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
            query = query.Where(l => l.Id == id);
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
                FormatListingLocation(l.Location),
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
            Role = "user",
            Content = userMessage,
            Timestamp = DateTime.UtcNow
        });
        conversation.Messages.Add(new AiConversationMessage
        {
            Role = "assistant",
            Content = assistantMessage,
            Timestamp = DateTime.UtcNow
        });
        conversation.UpdatedAt = DateTime.UtcNow;
        await _conversations.UpdateAsync(conversation, cancellationToken);
    }

    /// <summary>
    /// Uses OpenRouter by default. Only <c>Template</c>, <c>Off</c>, or <c>False</c> skips the chat call. Empty config values default to Llm.
    /// The function app must load <c>OpenRouter__ApiKey</c> (same as embeddings); otherwise a contextual fallback message is used.
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

        var modeRaw = _configuration["OpenRouter:RecommendNarrationMode"];
        var mode = string.IsNullOrWhiteSpace(modeRaw) ? "Llm" : modeRaw.Trim();
        var skipLlm = mode.Equals("Template", StringComparison.OrdinalIgnoreCase)
                      || mode.Equals("Off", StringComparison.OrdinalIgnoreCase)
                      || mode.Equals("False", StringComparison.OrdinalIgnoreCase);
        if (skipLlm)
        {
            _logger.LogDebug("Recommend narration using non-LLM mode ({Mode})", mode);
            return BuildRecommendTemplateMessage(query, extracted, top);
        }

        if (string.IsNullOrWhiteSpace(GetOpenRouterApiKey()))
        {
            _logger.LogWarning(
                "Recommend narration: OpenRouter API key missing for this host. Set OpenRouter__ApiKey in src/FunctionApps/AiAgentService/local.settings.json (see local.settings.sample.json). Using contextual fallback.");
            return BuildRecommendTemplateMessage(query, extracted, top);
        }

        var kbSection = await BuildRecommendKnowledgeSectionAsync(query, extracted, cancellationToken);
        var userPrompt = BuildRecommendNarrationUserPrompt(query, extracted, top, kbSection);

        var maxTokens = int.TryParse(_configuration["OpenRouter:RecommendNarrationMaxTokens"], out var mt)
            ? Math.Clamp(mt, 64, 500)
            : 220;
        var timeoutSec = int.TryParse(_configuration["OpenRouter:RecommendLlmTimeoutSeconds"], out var ts)
            ? Math.Clamp(ts, 8, 90)
            : 35;

        try
        {
            using var llmCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            llmCts.CancelAfter(TimeSpan.FromSeconds(timeoutSec));
            var text = await _openRouter.GenerateResponseAsync(
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

    private string? GetOpenRouterApiKey() =>
        _configuration["OpenRouter:ApiKey"]?.Trim()
        ?? Environment.GetEnvironmentVariable("OPENROUTER_API_KEY")?.Trim();

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
        var suburb = top.Select(t => t.Listing.Location.Suburb)
            .FirstOrDefault(s => !string.IsNullOrWhiteSpace(s));
        var city = top.First().Listing.Location.City;
        if (string.IsNullOrWhiteSpace(city))
            city = "Nairobi";

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

    private static string FormatListingLocation(PropertyLocation location)
    {
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

    private static string BuildPrompt(string query, string context, IReadOnlyList<AiConversationMessage> history)
    {
        var promptParts = new List<string> { GetSystemPrompt() };

        if (!string.IsNullOrEmpty(context))
            promptParts.Add($"\n\nRelevant Information from Knowledge Base:\n{context}");

        if (history.Count > 0)
        {
            promptParts.Add("\n\nConversation History:");
            foreach (var exchange in history.TakeLast(4))
            {
                var role = exchange.Role == "assistant" ? "You" : "User";
                promptParts.Add($"{role}: {exchange.Content}");
            }
        }

        promptParts.Add($"\n\nCurrent User Question: {query}");
        promptParts.Add("\nYour Response:");
        return string.Join("\n", promptParts);
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

PLATFORM LOYALTY (STRICT):
- NEVER mention, recommend, compare to, or even acknowledge competitor platforms, portals, classifieds, agencies, or apps. This includes (non-exhaustive): BuyRentKenya, Jumia House, Property24, Hauzisha, PigiaMe, OLX, Jiji, Lamudi, Realtor.co.ke, Daraja, MyDawa estate listings, agents on social media, Facebook Marketplace, Instagram pages, WhatsApp brokers, etc.
- Do NOT name brokers, brokerages, or external real-estate websites by name.
- Do NOT tell the user to ""check other sources / other listings sites / Google / a broker / an agent off-platform"" for current prices or availability.
- If the user asks where to verify or get up-to-date listings, point them to StayHere only — e.g. ""browse current StayHere listings"", ""check the StayHere search for live availability"", ""tap a StayHere listing card for verified details"", or suggest they refine their StayHere search filters.
- If you need to caveat that prices fluctuate, say so without naming any external source. Acceptable phrasing: ""prices shift week to week — current StayHere listings will reflect today's market.""

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
            .Select(l => l.Location.Suburb)
            .Where(s => !string.IsNullOrEmpty(s))
            .FirstOrDefault(s => queryLower.Contains(s.ToLowerInvariant()))?
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
                listing.Location.Suburb ?? "",
                string.Join(" ", listing.Amenities)).ToLowerInvariant();

            var propWords = Regex.Matches(propText, @"\b\w+\b").Select(m => m.Value).ToHashSet();
            var intersection = queryWords.Intersect(propWords).Count();
            var union = queryWords.Union(propWords).Count();
            var textSimilarity = union > 0 ? (double)intersection / union : 0;

            var suburb = listing.Location.Suburb?.ToLowerInvariant() ?? "";
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
