using StayHere.Application.Common.Interfaces;

namespace StayHere.Application.AiAgent.Tools;

/// <summary>
/// The fixed set of tools Sage may call mid-conversation. This is the "MCP logic" of the
/// feature: a declared, discoverable set of callable functions the model chooses from, executed
/// server-side by <see cref="IAgentToolExecutor"/> against real StayHere data instead of the
/// model inventing an answer.
/// </summary>
public static class AgentToolCatalog
{
    public const string SearchListings = "search_listings";
    public const string GetListingDetails = "get_listing_details";
    public const string GetNearbyPlaces = "get_nearby_places";
    public const string CompareListings = "compare_listings";
    public const string GetRecommendations = "get_recommendations";
    public const string GetMyProfile = "get_my_profile";
    public const string GetMyViewings = "get_my_viewings";
    public const string GetMyApplications = "get_my_applications";
    public const string GetLeaseTerms = "get_lease_terms";
    public const string GetMyPayments = "get_my_payments";
    public const string GetOnboardingInfo = "get_onboarding_info";
    public const string SuggestNextStep = "suggest_next_step";
    public const string BookViewing = "book_viewing";
    public const string CancelViewing = "cancel_viewing";
    public const string SaveListing = "save_listing";
    public const string UnsaveListing = "unsave_listing";
    public const string GetSavedListings = "get_saved_listings";
    public const string SendEnquiry = "send_enquiry";
    public const string GetMyEnquiries = "get_my_enquiries";

    public static IReadOnlyList<ChatToolDefinition> All { get; } = new List<ChatToolDefinition>
    {
        new(SearchListings,
            "Search live StayHere listings by location, price, bedrooms, listing type, tenure, and amenities. " +
            "Use this whenever the user asks to find or browse properties. IMPORTANT: when the user's wording implies " +
            "an objective ranking (\"cheapest\"/\"cheap\"/\"budget\" -> sortBy price ascending; \"most expensive\"/" +
            "\"premium\"/\"luxury\" -> price descending; \"biggest\"/\"most bedrooms\" -> bedrooms descending; " +
            "\"newest\"/\"just listed\" -> listedDate descending; \"top rated\"/\"best reviewed\" -> rating " +
            "descending), always set sortBy/sortDescending accordingly - the results (and the cards shown to the " +
            "user) are returned in exactly this order, first result first, so getting this right IS what makes " +
            "the best match appear first rather than an arbitrary one.",
            """
            {
              "type": "object",
              "properties": {
                "location": { "type": "string", "description": "City, county, or suburb/neighbourhood, e.g. 'Kilimani' or 'Nairobi'." },
                "listingType": { "type": "string", "enum": ["Rent", "Sale", "ShortStay", "Lease"] },
                "tenure": { "type": "string", "enum": ["CompleteTurnkey", "OffPlanUnderConstruction", "LongTermLease", "ShortTermServicedVacation"], "description": "Only meaningful when listingType is Sale (Complete/OffPlan) or Rent (LongTerm/ShortTerm)." },
                "minPrice": { "type": "number" },
                "maxPrice": { "type": "number" },
                "minBedrooms": { "type": "integer" },
                "maxBedrooms": { "type": "integer" },
                "amenity": { "type": "string", "description": "Comma-separated amenity keywords that must all be present, e.g. 'pool,parking'." },
                "sortBy": { "type": "string", "enum": ["price", "rating", "views", "bedrooms", "listedDate", "newest"], "description": "What to rank results by. Omit only when the user expressed no preference at all - default is newest-first, which is rarely what a ranking question like 'cheapest' or 'most bedrooms' actually wants." },
                "sortDescending": { "type": "boolean", "description": "true = highest/most first (most expensive, most bedrooms, newest, top rated). false = lowest/least first (cheapest, oldest). Required whenever sortBy is set." },
                "maxResults": { "type": "integer", "description": "Defaults to 5, max 10." }
              }
            }
            """),

        new(GetListingDetails,
            "Get full details for one specific StayHere listing by its id or listing code. " +
            "Always call this before stating specific facts (price, amenities, exact address) about a listing.",
            """
            {
              "type": "object",
              "properties": {
                "listingIdOrCode": { "type": "string", "description": "The listing's GUID id or its listing code, e.g. 'STH-1023'." }
              },
              "required": ["listingIdOrCode"]
            }
            """),

        new(GetNearbyPlaces,
            "Find real points of interest near a listing: schools, hospitals, malls, transit, restaurants, or " +
            "security-related infrastructure (police stations, local government/administration offices - the closest " +
            "real proxy for a chief's camp or security post). This is a rough infrastructure-proximity signal only - " +
            "StayHere has no verified crime-data source, so never present it as an actual crime/safety rating. " +
            "Pass multiple comma-separated categories in one call when a query spans more than one kind of place - " +
            "e.g. for 'is this a secure area' or 'most secure listing' questions, query \"police,local_government_office\" " +
            "together, and also check the listing's own security-related amenities (guarded entry, CCTV, estate security, " +
            "etc. via get_listing_details) rather than relying on nearby infrastructure alone.",
            """
            {
              "type": "object",
              "properties": {
                "listingIdOrCode": { "type": "string", "description": "Look up this listing's coordinates automatically. Provide this OR latitude+longitude." },
                "latitude": { "type": "number" },
                "longitude": { "type": "number" },
                "category": {
                  "type": "string",
                  "description": "One of: school, hospital, mall, transit, restaurant, police, local_government_office - or several comma-separated (e.g. \"police,local_government_office\")."
                }
              },
              "required": ["category"]
            }
            """),

        new(CompareListings,
            "Compare 2-4 specific StayHere listings side by side by id or listing code.",
            """
            {
              "type": "object",
              "properties": {
                "listingIdsOrCodes": {
                  "type": "array",
                  "items": { "type": "string" },
                  "description": "2 to 4 listing ids or listing codes to compare."
                }
              },
              "required": ["listingIdsOrCodes"]
            }
            """),

        new(GetRecommendations,
            "Get StayHere listings ranked by semantic similarity to a free-text description of what the user wants. " +
            "Prefer search_listings when the user gives concrete filters (price/bedrooms/location); use this for " +
            "vaguer, preference-style requests (e.g. 'somewhere quiet for a young family near good schools').",
            """
            {
              "type": "object",
              "properties": {
                "preferences": { "type": "string", "description": "Free-text description of what the user wants." },
                "maxResults": { "type": "integer", "description": "Defaults to 5." }
              },
              "required": ["preferences"]
            }
            """),

        new(GetMyProfile,
            "Get the signed-in user's own StayHere account profile (name, contact info, KYC/account status). " +
            "Only ever returns the caller's own data - there is no way to look up another user.",
            """{ "type": "object", "properties": {} }"""),

        new(GetMyViewings,
            "Get the signed-in user's own viewing bookings and their status (Pending/Confirmed/Cancelled/Completed/NoShow), " +
            "including which listing each one is for. Always call this before answering any question about 'my booking(s)'/" +
            "'my viewing(s)' - never guess from earlier context, statuses and meeting links change. The full list with " +
            "cancel/join-viewing actions lives on the user's 'My Bookings' page in the app - point them there for anything " +
            "beyond a quick check here.",
            """{ "type": "object", "properties": {} }"""),

        new(GetMyApplications,
            "Get the signed-in user's own rental applications, including status (DocumentsPending/UnderReview/" +
            "Approved/Rejected/TermsAccepted/PaymentPending/Active/Cancelled), which documents are uploaded, and " +
            "payment summaries. Always call this before answering any question about 'my application'.",
            """{ "type": "object", "properties": {} }"""),

        new(GetLeaseTerms,
            "Get the published lease terms for a specific listing: house rules, deposits, payment instructions, " +
            "notice period, pet policy. Not personal data - works for any listing, signed in or not.",
            """
            {
              "type": "object",
              "properties": {
                "listingIdOrCode": { "type": "string", "description": "The listing's GUID id or its listing code." }
              },
              "required": ["listingIdOrCode"]
            }
            """),

        new(GetMyPayments,
            "Get the signed-in user's own payment history and status across all their applications (deposits, " +
            "admin fees, monthly rent). Always call this before answering any question about 'my payment'.",
            """{ "type": "object", "properties": {} }"""),

        new(GetOnboardingInfo,
            "Get move-in details for the signed-in user's active tenancy: access instructions, items to carry, " +
            "and whether the deposit payment is confirmed. Only returns data once an application is Active.",
            """{ "type": "object", "properties": {} }"""),

        new(SuggestNextStep,
            "Figure out and suggest the signed-in user's next concrete step in their rental journey (book a " +
            "viewing, upload documents, accept terms, pay, or view move-in info), as a clickable link into the " +
            "real StayHere flow - never a step you perform yourself. Call get_my_applications first if you haven't " +
            "already this turn, so the suggestion matches their actual status.",
            """
            {
              "type": "object",
              "properties": {
                "listingIdOrCode": { "type": "string", "description": "Optional: which listing this is about. Omit to use the user's most recently updated application." }
              }
            }
            """),

        new(BookViewing,
            "Book a viewing for a specific listing on behalf of the signed-in user. Use this directly once you " +
            "have a listing and at least a rough preferred date in hand - do not over-clarify; ask only for " +
            "whatever is genuinely missing (which listing, and roughly when), then proceed with the booking " +
            "rather than re-confirming details the user already gave. Defaults: viewingType 'Physical' if not " +
            "stated, preferredTime '10:00' if not stated.",
            """
            {
              "type": "object",
              "properties": {
                "listingIdOrCode": { "type": "string", "description": "The listing's GUID id or its listing code." },
                "preferredDate": { "type": "string", "description": "ISO date (YYYY-MM-DD) the user wants to view the property." },
                "preferredTime": { "type": "string", "description": "Time of day, e.g. '14:00'. Defaults to '10:00' if omitted." },
                "viewingType": { "type": "string", "enum": ["Physical", "Virtual"], "description": "Defaults to 'Physical'." },
                "notes": { "type": "string", "description": "Any extra notes from the user for the owner/agent." },
                "contactPhone": { "type": "string", "description": "A phone number to reach the user about this viewing, if they gave one." }
              },
              "required": ["listingIdOrCode", "preferredDate"]
            }
            """),

        new(CancelViewing,
            "Cancel one of the signed-in user's own existing viewing bookings. Call get_my_viewings first if you " +
            "don't already know the bookingId from this conversation. Only ever cancels the caller's own booking.",
            """
            {
              "type": "object",
              "properties": {
                "bookingId": { "type": "string", "description": "The viewing booking's GUID id, from get_my_viewings." }
              },
              "required": ["bookingId"]
            }
            """),

        new(SaveListing,
            "Save (bookmark/favorite) a listing to the signed-in user's own 'Saved' list for later, so they can " +
            "find it again without searching. Use this directly whenever the user says things like 'save this', " +
            "'favorite it', 'add it to my saved list', or 'I like this one, keep it for later' - don't ask for " +
            "confirmation first, just save it. Saving an already-saved listing is harmless (it stays saved).",
            """
            {
              "type": "object",
              "properties": {
                "listingIdOrCode": { "type": "string", "description": "The listing's GUID id or its listing code." }
              },
              "required": ["listingIdOrCode"]
            }
            """),

        new(UnsaveListing,
            "Remove a listing from the signed-in user's own 'Saved' list. Use this directly when the user asks to " +
            "unsave/unfavorite/remove a listing from their saved list.",
            """
            {
              "type": "object",
              "properties": {
                "listingIdOrCode": { "type": "string", "description": "The listing's GUID id or its listing code." }
              },
              "required": ["listingIdOrCode"]
            }
            """),

        new(GetSavedListings,
            "Get the signed-in user's own saved/favorited listings. Always call this before answering any question " +
            "about 'my saved listings' or 'my favorites' - never guess from earlier context.",
            """{ "type": "object", "properties": {} }"""),

        new(SendEnquiry,
            "Send an enquiry message about a listing straight to its property owner, through StayHere's in-app " +
            "Enquiries chat - the ONLY way a customer and an owner ever communicate. Use this directly whenever " +
            "the user wants to ask the owner something, express interest, or say they want to enquire/message/" +
            "contact the owner about a listing - don't just describe the feature, actually send it. If the user " +
            "gave no specific message, send a short, polite default expressing interest in the listing on their " +
            "behalf. Reusing this on a listing the user already has an open enquiry for adds to that SAME thread " +
            "rather than starting a new one. This never reveals or requests either side's phone/email. " +
            "CRITICAL - GET THE LISTING RIGHT: this sends a real message to a real person, so a wrong listing " +
            "means messaging the WRONG owner about the WRONG property. When the user names a listing descriptively " +
            "(\"the modern one\", \"that one with the gym\") rather than by its exact title or code, you must " +
            "already be certain which specific listing that is from this conversation's own context (e.g. a " +
            "listing you just searched for or discussed) - match it by its exact title, not by picking whichever " +
            "one happens to be first in a list of several candidates. If more than one candidate could reasonably " +
            "fit, ask the user to confirm which listing before sending - better to ask once than to message the " +
            "wrong owner.",
            """
            {
              "type": "object",
              "properties": {
                "listingIdOrCode": { "type": "string", "description": "The listing's GUID id or its listing code - resolve this precisely, never guess from a loosely-matching search result." },
                "message": { "type": "string", "description": "What to say to the owner. Omit to send a short default expressing interest." }
              },
              "required": ["listingIdOrCode"]
            }
            """),

        new(GetMyEnquiries,
            "Get the signed-in user's own enquiry threads with property owners, including each thread's latest " +
            "message and whether the owner has replied. Always call this before answering any question about " +
            "'my enquiries' or whether an owner has responded - never guess from earlier context.",
            """{ "type": "object", "properties": {} }"""),
    };
}
