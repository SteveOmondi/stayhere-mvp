using System.Text.Json;
using Microsoft.Extensions.Logging;
using StayHere.Application.Common.Interfaces;
using StayHere.Domain.Entities;
using StayHere.Domain.Repositories;

namespace StayHere.Application.AiAgent.Tools;

public class AgentToolExecutor : IAgentToolExecutor
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly TimeSpan NearbyPlacesCacheTtl = TimeSpan.FromDays(30);

    /// <summary>Embedded directly in tool-failure JSON so the instruction travels with the data the
    /// model is reasoning over, rather than relying solely on the system prompt (which models can
    /// deprioritize once a tool call fails mid-conversation).</summary>
    private const string ToolFailureInstruction =
        "Tell the user this information isn't available right now. Do NOT invent specific facts (names, prices, distances, addresses) to fill the gap.";

    /// <summary>Shown to the model whenever a personal tool is called without a signed-in caller.</summary>
    private const string NotSignedInInstruction =
        "The user isn't signed in (or has no StayHere account yet), so this personal information isn't available. Tell them they need to sign in to check this.";

    private readonly IListingRepository _listings;
    private readonly IPlacesService _places;
    private readonly IEmbeddingService _embeddingService;
    private readonly ICacheService _cache;
    private readonly ICustomerRepository _customers;
    private readonly IViewingBookingRepository _viewingBookings;
    private readonly ISavedListingRepository _savedListings;
    private readonly IEnquiryRepository _enquiries;
    private readonly ITenantApplicationRepository _applications;
    private readonly IPropertyTermsRepository _terms;
    private readonly ILogger<AgentToolExecutor> _logger;

    /// <summary>Same per-sender, per-minute cap as EnquiryFunctions.SendMessage - shared key
    /// prefix so Sage-sent and UI-sent messages count against ONE limit, not two independent
    /// ones a user could stack to double their effective flood budget.</summary>
    private const int EnquiryMessageRateLimitMaxCount = 20;
    private static readonly TimeSpan EnquiryMessageRateLimitWindow = TimeSpan.FromMinutes(1);

    public AgentToolExecutor(
        IListingRepository listings,
        IPlacesService places,
        IEmbeddingService embeddingService,
        ICacheService cache,
        ICustomerRepository customers,
        IViewingBookingRepository viewingBookings,
        ISavedListingRepository savedListings,
        IEnquiryRepository enquiries,
        ITenantApplicationRepository applications,
        IPropertyTermsRepository terms,
        ILogger<AgentToolExecutor> logger)
    {
        _listings = listings;
        _places = places;
        _embeddingService = embeddingService;
        _cache = cache;
        _customers = customers;
        _viewingBookings = viewingBookings;
        _savedListings = savedListings;
        _enquiries = enquiries;
        _applications = applications;
        _terms = terms;
        _logger = logger;
    }

    public async Task<string> ExecuteAsync(string toolName, string argumentsJson, AgentToolContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            using var args = JsonDocument.Parse(string.IsNullOrWhiteSpace(argumentsJson) ? "{}" : argumentsJson);
            var root = args.RootElement;

            return toolName switch
            {
                AgentToolCatalog.SearchListings => await SearchListingsAsync(root, cancellationToken),
                AgentToolCatalog.GetListingDetails => await GetListingDetailsAsync(root, cancellationToken),
                AgentToolCatalog.GetNearbyPlaces => await GetNearbyPlacesAsync(root, cancellationToken),
                AgentToolCatalog.CompareListings => await CompareListingsAsync(root, cancellationToken),
                AgentToolCatalog.GetRecommendations => await GetRecommendationsAsync(root, cancellationToken),
                AgentToolCatalog.GetMyProfile => await GetMyProfileAsync(context, cancellationToken),
                AgentToolCatalog.GetMyViewings => await GetMyViewingsAsync(context, cancellationToken),
                AgentToolCatalog.BookViewing => await BookViewingAsync(context, root, cancellationToken),
                AgentToolCatalog.CancelViewing => await CancelViewingAsync(context, root, cancellationToken),
                AgentToolCatalog.SaveListing => await SaveListingAsync(context, root, cancellationToken),
                AgentToolCatalog.UnsaveListing => await UnsaveListingAsync(context, root, cancellationToken),
                AgentToolCatalog.GetSavedListings => await GetSavedListingsAsync(context, cancellationToken),
                AgentToolCatalog.SendEnquiry => await SendEnquiryAsync(context, root, cancellationToken),
                AgentToolCatalog.GetMyEnquiries => await GetMyEnquiriesAsync(context, cancellationToken),
                AgentToolCatalog.GetMyApplications => await GetMyApplicationsAsync(context, cancellationToken),
                AgentToolCatalog.GetLeaseTerms => await GetLeaseTermsAsync(root, cancellationToken),
                AgentToolCatalog.GetMyPayments => await GetMyPaymentsAsync(context, cancellationToken),
                AgentToolCatalog.GetOnboardingInfo => await GetOnboardingInfoAsync(context, cancellationToken),
                AgentToolCatalog.SuggestNextStep => await SuggestNextStepAsync(context, root, cancellationToken),
                _ => Serialize(new { error = $"Unknown tool '{toolName}'." })
            };
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Tool {Tool} received malformed arguments: {Args}", toolName, argumentsJson);
            return Serialize(new { error = "Malformed arguments JSON.", instruction = ToolFailureInstruction });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Tool {Tool} execution failed", toolName);
            return Serialize(new { error = "Tool execution failed.", instruction = ToolFailureInstruction });
        }
    }

    // ── Personal / account tools ────────────────────────────────────────────
    // Every method below trusts ONLY context.UserId/CustomerId (resolved server-side from the
    // caller's verified JWT in AiAgentService.ChatAsync) - never anything the model might pass as
    // an argument. "Signed in" is gated on UserId, not CustomerId: some historical
    // ViewingBooking/TenantApplication rows store the raw UserId in their CustomerId column when no
    // formal Customer profile was ever created, so a caller can have real data to find even with a
    // null CustomerId - the repositories below match on either.

    private async Task<string> GetMyProfileAsync(AgentToolContext context, CancellationToken cancellationToken)
    {
        if (!context.UserId.HasValue)
            return Serialize(new { error = "Not signed in.", instruction = NotSignedInInstruction });

        var customer = context.CustomerId.HasValue
            ? await _customers.GetByIdAsync(context.CustomerId.Value, cancellationToken)
            : null;
        if (customer == null)
            return Serialize(new { error = "No StayHere customer profile found for this account.", instruction = NotSignedInInstruction });

        return Serialize(new
        {
            customer.DisplayName,
            customer.FirstName,
            customer.LastName,
            customer.Email,
            customer.Phone,
            kycStatus = customer.KycStatus,
            accountStatus = customer.AccountStatus,
            memberSince = customer.CreatedAt
        });
    }

    private async Task<string> GetMyViewingsAsync(AgentToolContext context, CancellationToken cancellationToken)
    {
        if (!context.UserId.HasValue)
            return Serialize(new { error = "Not signed in.", instruction = NotSignedInInstruction });

        var bookings = await _viewingBookings.GetByCustomerAsync(context.CustomerId, context.UserId, cancellationToken);
        var items = bookings.Select(b => new
        {
            b.Id,
            b.ListingId,
            listingTitle = b.Listing?.Title,
            listingCode = b.Listing?.ListingCode,
            listingLocation = b.Listing?.Location != null ? FormatLocation(b.Listing.Location) : null,
            preferredDate = b.PreferredDate,
            preferredTime = b.PreferredTime,
            viewingType = b.ViewingType,
            status = b.Status,
            meetingLink = b.MeetingLink
        });

        return Serialize(new { count = bookings.Count, viewings = items });
    }

    private async Task<string> BookViewingAsync(AgentToolContext context, JsonElement args, CancellationToken cancellationToken)
    {
        if (!context.UserId.HasValue)
            return Serialize(new { error = "Not signed in.", instruction = NotSignedInInstruction });

        var listingIdOrCode = GetString(args, "listingIdOrCode");
        if (string.IsNullOrWhiteSpace(listingIdOrCode))
            return Serialize(new { error = "listingIdOrCode is required." });

        var listing = await ResolveListingAsync(listingIdOrCode);
        if (listing == null)
            return Serialize(new { error = $"No listing found matching '{listingIdOrCode}'.", instruction = ToolFailureInstruction });

        var preferredDateRaw = GetString(args, "preferredDate");
        if (!DateTime.TryParse(preferredDateRaw, out var preferredDate))
            return Serialize(new { error = "preferredDate is missing or not a valid date. Ask the user for a date and try again." });

        var booking = new ViewingBooking
        {
            Id = Guid.NewGuid(),
            ListingId = listing.Id,
            CustomerId = context.CustomerId ?? context.UserId.Value,
            PreferredDate = DateTime.SpecifyKind(preferredDate.Date, DateTimeKind.Utc),
            PreferredTime = GetString(args, "preferredTime") ?? "10:00",
            ViewingType = GetString(args, "viewingType") ?? "Physical",
            Notes = GetString(args, "notes"),
            ContactPhone = GetString(args, "contactPhone"),
            Status = "Pending",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _viewingBookings.CreateAsync(booking, cancellationToken);

        return Serialize(new
        {
            success = true,
            bookingId = booking.Id,
            listingTitle = listing.Title,
            listingCode = listing.ListingCode,
            preferredDate = booking.PreferredDate,
            preferredTime = booking.PreferredTime,
            viewingType = booking.ViewingType,
            status = booking.Status,
            instruction = "Booking request created successfully as 'Pending'. Tell the user it's booked and awaiting owner confirmation - do not say it's confirmed."
        });
    }

    private async Task<string> CancelViewingAsync(AgentToolContext context, JsonElement args, CancellationToken cancellationToken)
    {
        if (!context.UserId.HasValue)
            return Serialize(new { error = "Not signed in.", instruction = NotSignedInInstruction });

        var bookingIdRaw = GetString(args, "bookingId");
        if (!Guid.TryParse(bookingIdRaw, out var bookingId))
            return Serialize(new { error = "bookingId is required and must be a valid id. Call get_my_viewings first to find it." });

        var booking = await _viewingBookings.GetByIdAsync(bookingId, cancellationToken);
        if (booking == null)
            return Serialize(new { error = "No booking found with that id." });

        var isOwnBooking = (context.CustomerId.HasValue && booking.CustomerId == context.CustomerId.Value)
                         || booking.CustomerId == context.UserId.Value;
        if (!isOwnBooking)
            return Serialize(new { error = "That booking doesn't belong to this account.", instruction = NotSignedInInstruction });

        if (booking.Status is "Cancelled" or "Completed")
            return Serialize(new { error = $"This booking is already {booking.Status} and can't be cancelled.", status = booking.Status });

        booking.Status = "Cancelled";
        booking.UpdatedAt = DateTime.UtcNow;
        await _viewingBookings.UpdateAsync(booking, cancellationToken);

        return Serialize(new
        {
            success = true,
            bookingId = booking.Id,
            status = booking.Status,
            instruction = "Tell the user this viewing has been cancelled."
        });
    }

    private async Task<string> SaveListingAsync(AgentToolContext context, JsonElement args, CancellationToken cancellationToken)
    {
        if (!context.UserId.HasValue)
            return Serialize(new { error = "Not signed in.", instruction = NotSignedInInstruction });

        var listingIdOrCode = GetString(args, "listingIdOrCode");
        if (string.IsNullOrWhiteSpace(listingIdOrCode))
            return Serialize(new { error = "listingIdOrCode is required." });

        var listing = await ResolveListingAsync(listingIdOrCode);
        if (listing == null)
            return Serialize(new { error = $"No listing found matching '{listingIdOrCode}'.", instruction = ToolFailureInstruction });

        var existing = await _savedListings.FindAsync(context.CustomerId, context.UserId, listing.Id, cancellationToken);
        if (existing != null)
        {
            return Serialize(new
            {
                success = true,
                alreadySaved = true,
                listingTitle = listing.Title,
                listingCode = listing.ListingCode,
                instruction = "This listing was already saved. Tell the user it's in their Saved list."
            });
        }

        var saved = new SavedListing
        {
            Id = Guid.NewGuid(),
            ListingId = listing.Id,
            CustomerId = context.CustomerId ?? context.UserId.Value,
            CreatedAt = DateTime.UtcNow
        };
        await _savedListings.CreateAsync(saved, cancellationToken);

        return Serialize(new
        {
            success = true,
            listingTitle = listing.Title,
            listingCode = listing.ListingCode,
            instruction = "Tell the user this listing has been saved to their Saved list."
        });
    }

    private async Task<string> UnsaveListingAsync(AgentToolContext context, JsonElement args, CancellationToken cancellationToken)
    {
        if (!context.UserId.HasValue)
            return Serialize(new { error = "Not signed in.", instruction = NotSignedInInstruction });

        var listingIdOrCode = GetString(args, "listingIdOrCode");
        if (string.IsNullOrWhiteSpace(listingIdOrCode))
            return Serialize(new { error = "listingIdOrCode is required." });

        var listing = await ResolveListingAsync(listingIdOrCode);
        if (listing == null)
            return Serialize(new { error = $"No listing found matching '{listingIdOrCode}'.", instruction = ToolFailureInstruction });

        var existing = await _savedListings.FindAsync(context.CustomerId, context.UserId, listing.Id, cancellationToken);
        if (existing == null)
        {
            return Serialize(new
            {
                success = true,
                wasNotSaved = true,
                listingTitle = listing.Title,
                instruction = "This listing wasn't in the user's Saved list. Tell them there's nothing to remove."
            });
        }

        await _savedListings.DeleteAsync(existing, cancellationToken);

        return Serialize(new
        {
            success = true,
            listingTitle = listing.Title,
            instruction = "Tell the user this listing has been removed from their Saved list."
        });
    }

    private async Task<string> GetSavedListingsAsync(AgentToolContext context, CancellationToken cancellationToken)
    {
        if (!context.UserId.HasValue)
            return Serialize(new { error = "Not signed in.", instruction = NotSignedInInstruction });

        var saved = await _savedListings.GetByCustomerAsync(context.CustomerId, context.UserId, cancellationToken);
        var items = saved.Where(s => s.Listing != null).Select(s => ToListingSummary(s.Listing!));

        return Serialize(new { count = saved.Count, listings = items });
    }

    private async Task<string> SendEnquiryAsync(AgentToolContext context, JsonElement args, CancellationToken cancellationToken)
    {
        if (!context.UserId.HasValue)
            return Serialize(new { error = "Not signed in.", instruction = NotSignedInInstruction });

        var listingIdOrCode = GetString(args, "listingIdOrCode");
        if (string.IsNullOrWhiteSpace(listingIdOrCode))
            return Serialize(new { error = "listingIdOrCode is required." });

        var listing = await ResolveListingAsync(listingIdOrCode);
        if (listing == null)
            return Serialize(new { error = $"No listing found matching '{listingIdOrCode}'.", instruction = ToolFailureInstruction });

        var text = GetString(args, "message")?.Trim();
        if (string.IsNullOrWhiteSpace(text))
            text = $"Hi, I'm interested in {listing.Title}. Could you share more details?";
        if (text.Length > 2000) text = text[..2000];

        var rateLimitKey = $"enquiry-msg-rl:{context.UserId.Value}";
        var allowed = await _cache.TryConsumeRateLimitAsync(rateLimitKey, EnquiryMessageRateLimitMaxCount, EnquiryMessageRateLimitWindow);
        if (!allowed)
            return Serialize(new { error = "Rate limited.", instruction = "Tell the user they're sending messages too quickly and should wait a minute before trying again." });

        var effectiveCustomerId = context.CustomerId ?? context.UserId.Value;
        var enquiry = await _enquiries.FindByListingAndCustomerAsync(listing.Id, context.CustomerId, context.UserId, cancellationToken);

        var now = DateTime.UtcNow;
        var isNewThread = enquiry == null;
        if (enquiry == null)
        {
            enquiry = new Enquiry
            {
                Id = Guid.NewGuid(),
                ListingId = listing.Id,
                CustomerId = effectiveCustomerId,
                OwnerId = listing.OwnerId,
                Status = "Open",
                CreatedAt = now,
                LastMessageAt = now,
                CustomerLastReadAt = now
            };
            await _enquiries.CreateAsync(enquiry, cancellationToken);
        }

        var message = new EnquiryMessage
        {
            Id = Guid.NewGuid(),
            EnquiryId = enquiry.Id,
            SenderRole = "Customer",
            SenderUserId = context.UserId.Value,
            Body = text,
            CreatedAt = now
        };
        await _enquiries.AddMessageAsync(message, cancellationToken);

        enquiry.LastMessageAt = now;
        enquiry.LastMessagePreview = text.Length > 140 ? text[..140] : text;
        enquiry.CustomerLastReadAt = now;
        await _enquiries.UpdateAsync(enquiry, cancellationToken);

        return Serialize(new
        {
            success = true,
            enquiryId = enquiry.Id,
            listingTitle = listing.Title,
            listingCode = listing.ListingCode,
            isNewThread,
            instruction = $"Tell the user their message has been sent to the owner of \"{listing.Title}\" through StayHere's in-app Enquiries chat, and the owner will reply there. You MUST refer to the listing by this exact title ({listing.Title}) in your reply - if this isn't the listing the user meant, say so plainly instead of claiming it was sent to a different one. Never mention or invent a phone number or email for the owner."
        });
    }

    private async Task<string> GetMyEnquiriesAsync(AgentToolContext context, CancellationToken cancellationToken)
    {
        if (!context.UserId.HasValue)
            return Serialize(new { error = "Not signed in.", instruction = NotSignedInInstruction });

        var enquiries = await _enquiries.GetByCustomerAsync(context.CustomerId, context.UserId, cancellationToken);
        var unreadByEnquiry = await _enquiries.CountUnreadForCustomerAsync(enquiries.Select(e => e.Id).ToList(), cancellationToken);

        var items = enquiries.Select(e => new
        {
            e.Id,
            e.ListingId,
            listingTitle = e.Listing?.Title,
            listingCode = e.Listing?.ListingCode,
            e.Status,
            lastMessageAt = e.LastMessageAt,
            lastMessagePreview = e.LastMessagePreview,
            unreadCount = unreadByEnquiry.GetValueOrDefault(e.Id, 0),
            hasOwnerReply = unreadByEnquiry.GetValueOrDefault(e.Id, 0) > 0
        });

        return Serialize(new { count = enquiries.Count, enquiries = items });
    }

    private async Task<string> GetMyApplicationsAsync(AgentToolContext context, CancellationToken cancellationToken)
    {
        if (!context.UserId.HasValue)
            return Serialize(new { error = "Not signed in.", instruction = NotSignedInInstruction });

        var apps = await _applications.GetByCustomerAsync(context.CustomerId, context.UserId, cancellationToken);
        return Serialize(new { count = apps.Count, applications = apps.Select(ToApplicationSummary) });
    }

    private async Task<string> GetLeaseTermsAsync(JsonElement args, CancellationToken cancellationToken)
    {
        var idOrCode = GetString(args, "listingIdOrCode");
        if (string.IsNullOrWhiteSpace(idOrCode))
            return Serialize(new { error = "listingIdOrCode is required." });

        var listing = await ResolveListingAsync(idOrCode);
        if (listing == null)
            return Serialize(new { error = $"No listing found for '{idOrCode}'." });

        var terms = await _terms.GetActiveByListingIdAsync(listing.Id);
        if (terms == null)
            return Serialize(new { error = "No lease terms have been published for this listing yet.", instruction = ToolFailureInstruction });

        return Serialize(new
        {
            terms.Title,
            terms.TermsContent,
            terms.HouseRules,
            terms.PaymentTerms,
            terms.NoticePeriod,
            terms.PetPolicy,
            terms.MinimumLeasePeriod,
            terms.SecurityDeposit,
            terms.WaterDeposit,
            terms.ElectricityDeposit,
            terms.AdminFee,
            terms.Currency,
            terms.PaymentInstructions,
            terms.OnboardingInstructions,
            terms.ItemsToCarry
        });
    }

    private async Task<string> GetMyPaymentsAsync(AgentToolContext context, CancellationToken cancellationToken)
    {
        if (!context.UserId.HasValue)
            return Serialize(new { error = "Not signed in.", instruction = NotSignedInInstruction });

        var apps = await _applications.GetByCustomerAsync(context.CustomerId, context.UserId, cancellationToken);
        var payments = apps
            .SelectMany(a => a.Payments.Select(p => new
            {
                p.Id,
                applicationId = a.Id,
                listingId = a.ListingId,
                paymentType = p.PaymentType,
                amount = p.Amount,
                currency = p.Currency,
                method = p.Method,
                status = p.Status,
                initiatedAt = p.InitiatedAt,
                confirmedAt = p.ConfirmedAt
            }))
            .OrderByDescending(p => p.initiatedAt)
            .ToList();

        return Serialize(new { count = payments.Count, payments });
    }

    private async Task<string> GetOnboardingInfoAsync(AgentToolContext context, CancellationToken cancellationToken)
    {
        if (!context.UserId.HasValue)
            return Serialize(new { error = "Not signed in.", instruction = NotSignedInInstruction });

        var apps = await _applications.GetByCustomerAsync(context.CustomerId, context.UserId, cancellationToken);
        var active = apps.FirstOrDefault(a => a.Status == "Active");
        if (active == null)
            return Serialize(new { error = "No active tenancy found - onboarding details are only available once an application is Active.", instruction = ToolFailureInstruction });

        var terms = await _terms.GetActiveByListingIdAsync(active.ListingId);
        var confirmedPayment = active.Payments
            .Where(p => p.Status == "Confirmed")
            .OrderByDescending(p => p.ConfirmedAt)
            .FirstOrDefault();

        return Serialize(new
        {
            applicationId = active.Id,
            listingId = active.ListingId,
            onboardingInstructions = terms?.OnboardingInstructions,
            accessInstructions = terms?.AccessInstructions,
            itemsToCarry = terms?.ItemsToCarry,
            depositConfirmed = confirmedPayment != null,
            confirmedAmount = confirmedPayment?.Amount
        });
    }

    private async Task<string> SuggestNextStepAsync(AgentToolContext context, JsonElement args, CancellationToken cancellationToken)
    {
        if (!context.UserId.HasValue)
            return Serialize(new { error = "Not signed in.", instruction = NotSignedInInstruction });

        var apps = await _applications.GetByCustomerAsync(context.CustomerId, context.UserId, cancellationToken);

        var listingIdOrCode = GetString(args, "listingIdOrCode");
        var app = !string.IsNullOrWhiteSpace(listingIdOrCode)
            ? await FindApplicationForListingAsync(apps, listingIdOrCode)
            : apps.OrderByDescending(a => a.UpdatedAt).FirstOrDefault();

        if (app == null)
        {
            // No application yet. Booking a viewing is now a fully separate, optional action (not
            // a prerequisite) - applying for tenancy directly is the primary next step, and only if
            // the model told us which listing this is about.
            if (string.IsNullOrWhiteSpace(listingIdOrCode))
                return Serialize(new { nextStep = (object?)null, note = "No applications found and no listing specified - nothing to suggest yet." });

            var listing = await ResolveListingAsync(listingIdOrCode);
            if (listing == null)
                return Serialize(new { error = $"No listing found for '{listingIdOrCode}'." });

            return Serialize(new
            {
                nextStep = new
                {
                    route = "/rental-flow",
                    parameters = new { listingId = listing.Id },
                    label = "Apply for tenancy (booking a viewing first is optional)"
                },
                currentStatus = "NotStarted"
            });
        }

        var (route, label) = app.Status switch
        {
            "PendingApproval" => ((string?)null, "Your application is pending the owner's initial approval — nothing to do right now"),
            "DocumentsPending" => ("/rental-flow", "Upload your documents"),
            "UnderReview" => ((string?)null, "Your documents are under review — nothing to do right now"),
            "Approved" => ("/rental-flow", "Review & accept the lease terms"),
            "TermsAccepted" or "PaymentPending" => ("/rental-flow", "Complete your payment"),
            "Active" => ("/my-properties", "View your move-in details"),
            "Rejected" => ((string?)null, "This application wasn't approved — try browsing other listings"),
            "Cancelled" => ((string?)null, "This application was cancelled"),
            _ => ((string?)null, "Status unclear — check your applications page")
        };

        object? nextStep = route == null
            ? null
            : new { route, parameters = new { listingId = app.ListingId, applicationId = app.Id }, label };

        return Serialize(new { nextStep, currentStatus = app.Status, applicationId = app.Id, listingId = app.ListingId });
    }

    private async Task<TenantApplication?> FindApplicationForListingAsync(IReadOnlyList<TenantApplication> apps, string listingIdOrCode)
    {
        var listing = await ResolveListingAsync(listingIdOrCode);
        if (listing == null) return null;
        return apps
            .Where(a => a.ListingId == listing.Id)
            .OrderByDescending(a => a.UpdatedAt)
            .FirstOrDefault();
    }

    private static object ToApplicationSummary(TenantApplication a) => new
    {
        a.Id,
        a.ListingId,
        status = a.Status,
        rejectionReason = a.RejectionReason,
        termsAcceptedAt = a.TermsAcceptedAt,
        documentsUploaded = a.Documents.Select(d => d.DocumentType).Distinct(),
        payments = a.Payments.Select(p => new { paymentType = p.PaymentType, status = p.Status, amount = p.Amount }),
        createdAt = a.CreatedAt,
        updatedAt = a.UpdatedAt
    };

    private async Task<string> SearchListingsAsync(JsonElement args, CancellationToken cancellationToken)
    {
        var criteria = new ListingSearchCriteria
        {
            Page = 1,
            PageSize = 100,
            AvailabilityStatus = AvailabilityStatus.Available,
            LocationText = GetString(args, "location"),
            MinPrice = GetDecimal(args, "minPrice"),
            MaxPrice = GetDecimal(args, "maxPrice"),
            MinBedrooms = GetInt(args, "minBedrooms"),
            MaxBedrooms = GetInt(args, "maxBedrooms"),
        };

        if (Enum.TryParse<ListingType>(GetString(args, "listingType"), true, out var listingType))
            criteria.ListingType = listingType;
        if (Enum.TryParse<Tenure>(GetString(args, "tenure"), true, out var tenure))
            criteria.Tenure = tenure;

        // Maps the model-facing sortBy enum onto EfListingRepository's actual switch keys (which
        // use "listed_date" with an underscore, and treats "newest"/omitted the same as its own
        // default). Without this, every search silently ignored the user's actual ranking intent
        // ("cheapest" showing the priciest option first, etc.) even though the repository has
        // supported real sorting all along - the tool just never exposed it.
        var sortBy = GetString(args, "sortBy")?.ToLowerInvariant() switch
        {
            "listeddate" => "listed_date",
            "newest" or null or "" => null,
            var s => s
        };
        if (sortBy != null) criteria.SortBy = sortBy;
        criteria.SortDescending = GetBool(args, "sortDescending") ?? true;

        var maxResults = Math.Clamp(GetInt(args, "maxResults") ?? 5, 1, 10);
        var amenity = GetString(args, "amenity");

        var results = (await _listings.SearchAsync(criteria)).AsEnumerable();

        if (!string.IsNullOrWhiteSpace(amenity))
        {
            var required = amenity.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            results = results.Where(l => required.All(req =>
                l.Amenities.Any(a => a.Contains(req, StringComparison.OrdinalIgnoreCase))));
        }

        var summaries = results.Take(maxResults).Select(ToListingSummary).ToList();
        return Serialize(new { count = summaries.Count, listings = summaries });
    }

    private async Task<string> GetListingDetailsAsync(JsonElement args, CancellationToken cancellationToken)
    {
        var idOrCode = GetString(args, "listingIdOrCode");
        if (string.IsNullOrWhiteSpace(idOrCode))
            return Serialize(new { error = "listingIdOrCode is required." });

        var listing = await ResolveListingAsync(idOrCode);
        if (listing == null)
            return Serialize(new { error = $"No listing found for '{idOrCode}'." });

        return Serialize(ToListingDetail(listing));
    }

    private async Task<string> GetNearbyPlacesAsync(JsonElement args, CancellationToken cancellationToken)
    {
        var category = GetString(args, "category");
        if (string.IsNullOrWhiteSpace(category))
            return Serialize(new { error = "category is required." });

        double? lat = GetDouble(args, "latitude");
        double? lng = GetDouble(args, "longitude");

        var idOrCode = GetString(args, "listingIdOrCode");
        if ((lat is null || lng is null) && !string.IsNullOrWhiteSpace(idOrCode))
        {
            var listing = await ResolveListingAsync(idOrCode);
            lat = listing?.Location?.Latitude;
            lng = listing?.Location?.Longitude;
        }

        if (lat is null || lng is null)
            return Serialize(new
            {
                error = "Could not resolve a location. Provide listingIdOrCode for a listing with coordinates, or latitude+longitude directly.",
                instruction = ToolFailureInstruction
            });

        var cacheKey = $"stayhere:aiagent:nearby:{Math.Round(lat.Value, 3)}:{Math.Round(lng.Value, 3)}:{category.ToLowerInvariant()}";
        var places = await _cache.GetOrSetAsync(
            cacheKey,
            () => _places.GetNearbyAsync(lat.Value, lng.Value, category, cancellationToken),
            NearbyPlacesCacheTtl);

        // An empty result is far more often a transient/config failure (API key restriction, API
        // not yet enabled, a momentary outage) than a genuine "nothing of this category exists
        // within range" - confirmed in production: a 403 during a since-fixed API misconfiguration
        // got cached as "[]" for the full 30-day TTL, so every lookup kept silently reporting
        // "unavailable" for a month after the underlying problem was already resolved. Evict it
        // immediately so the very next lookup (this request's retry, or a future one) tries again
        // live instead of being stuck behind a month-long cache of a stale failure.
        if (places.Count == 0)
            await _cache.RemoveAsync(cacheKey);

        string? note;
        if (places.Count == 0)
        {
            note = "No places data is available right now (lookup unavailable or nothing found nearby). " +
                   "Do NOT invent specific place names, distances, or ratings - tell the user this information isn't available at the moment.";
        }
        else if (places.Any(p => PlaceCategories.SecurityProxyTypes.Contains(p.Category)))
        {
            // Checked against each result's actual matched category (not the raw request string),
            // since a security-style request can mix categories - e.g. "police,local_government_office" -
            // and only some results may end up being the security-proxy kind.
            note = "Police/local-government-office proximity reflects security infrastructure only - not a verified crime or safety rating.";
        }
        else
        {
            note = null;
        }

        return Serialize(new
        {
            category,
            count = places.Count,
            places = places.Select(p => new
            {
                p.Name,
                distanceMeters = p.DistanceMeters,
                walkingDistanceMeters = p.WalkingDistanceMeters,
                walkingDurationMinutes = p.WalkingDurationMinutes,
                p.Address,
                p.Rating,
                p.Latitude,
                p.Longitude
            }),
            note
        });
    }

    private async Task<string> CompareListingsAsync(JsonElement args, CancellationToken cancellationToken)
    {
        if (!args.TryGetProperty("listingIdsOrCodes", out var idsEl) || idsEl.ValueKind != JsonValueKind.Array)
            return Serialize(new { error = "listingIdsOrCodes (array) is required." });

        var ids = idsEl.EnumerateArray()
            .Select(e => e.GetString())
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Take(4)
            .ToList();

        var comparisons = new List<object>();
        foreach (var id in ids)
        {
            var listing = await ResolveListingAsync(id!);
            comparisons.Add(listing != null
                ? ToListingDetail(listing)
                : new { requested = id, error = "not found" });
        }

        return Serialize(new { comparisons });
    }

    private async Task<string> GetRecommendationsAsync(JsonElement args, CancellationToken cancellationToken)
    {
        var preferences = GetString(args, "preferences");
        if (string.IsNullOrWhiteSpace(preferences))
            return Serialize(new { error = "preferences is required." });

        var maxResults = Math.Clamp(GetInt(args, "maxResults") ?? 5, 1, 10);

        try
        {
            var vector = await _embeddingService.EmbedAsync(preferences, cancellationToken);
            var ranked = await _listings.SearchByEmbeddingSimilarityAsync(vector, Math.Max(maxResults * 4, 20), cancellationToken);
            return Serialize(new { count = ranked.Count, listings = ranked.Take(maxResults).Select(r => ToListingSummary(r.Listing)) });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Embedding-based recommendation failed; returning empty result");
            return Serialize(new { count = 0, listings = Array.Empty<object>(), note = "Recommendation search is temporarily unavailable." });
        }
    }

    private async Task<Listing?> ResolveListingAsync(string idOrCode)
    {
        if (Guid.TryParse(idOrCode, out var id))
        {
            var byId = await _listings.GetByIdAsync(id);
            if (byId != null) return byId;
        }
        return await _listings.GetByListingCodeAsync(idOrCode);
    }

    private static object ToListingSummary(Listing l) => new
    {
        l.Id,
        l.ListingCode,
        l.Title,
        listingType = l.ListingType.ToString(),
        propertyType = l.PropertyType.ToString(),
        tenure = l.Tenure?.ToString(),
        location = FormatLocation(l.Location),
        latitude = l.Location?.Latitude,
        longitude = l.Location?.Longitude,
        price = l.Price,
        currency = l.PriceCurrency,
        bedrooms = l.Bedrooms,
        bathrooms = l.Bathrooms,
        primaryImageUrl = l.PrimaryImageUrl,
        amenities = l.Amenities.Take(8)
    };

    private static object ToListingDetail(Listing l) => new
    {
        l.Id,
        l.ListingCode,
        l.Title,
        l.Description,
        listingType = l.ListingType.ToString(),
        propertyType = l.PropertyType.ToString(),
        tenure = l.Tenure?.ToString(),
        location = FormatLocation(l.Location),
        latitude = l.Location?.Latitude,
        longitude = l.Location?.Longitude,
        price = l.Price,
        currency = l.PriceCurrency,
        bedrooms = l.Bedrooms,
        bathrooms = l.Bathrooms,
        isFurnished = l.IsFurnished,
        sizeSqft = l.SizeSqft,
        amenities = l.Amenities,
        availabilityStatus = l.AvailabilityStatus.ToString()
    };

    private static string FormatLocation(PropertyLocation? location)
    {
        if (location == null) return "Unknown";
        var suburb = string.IsNullOrWhiteSpace(location.Suburb) ? null : location.Suburb;
        return suburb is null ? location.City : $"{suburb}, {location.City}";
    }

    private static string? GetString(JsonElement e, string name) =>
        e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

    private static int? GetInt(JsonElement e, string name) =>
        e.TryGetProperty(name, out var v) && v.ValueKind is JsonValueKind.Number && v.TryGetInt32(out var i) ? i : null;

    private static bool? GetBool(JsonElement e, string name) =>
        e.TryGetProperty(name, out var v) && v.ValueKind is JsonValueKind.True or JsonValueKind.False ? v.GetBoolean() : null;

    private static decimal? GetDecimal(JsonElement e, string name) =>
        e.TryGetProperty(name, out var v) && v.ValueKind is JsonValueKind.Number && v.TryGetDecimal(out var d) ? d : null;

    private static double? GetDouble(JsonElement e, string name) =>
        e.TryGetProperty(name, out var v) && v.ValueKind is JsonValueKind.Number && v.TryGetDouble(out var d) ? d : null;

    private static string Serialize(object payload) => JsonSerializer.Serialize(payload, JsonOptions);
}
