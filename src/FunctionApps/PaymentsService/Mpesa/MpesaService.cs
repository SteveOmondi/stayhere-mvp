using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace StayHere.PaymentsService.Mpesa;

/// <summary>
/// Wraps all outbound calls to the Safaricom Daraja API.
///
/// Responsibilities:
///   - OAuth token acquisition with 50-minute in-process cache (token TTL is 3600 s)
///   - STK Push initiation (LipaNaMpesa Online)
///   - STK Push status query
///   - C2B URL registration
///
/// All methods return strongly-typed result objects so callers never inspect raw HTTP.
/// </summary>
public class MpesaService
{
    private const string TokenCacheKey = "mpesa_access_token";

    private readonly IHttpClientFactory _httpFactory;
    private readonly IMemoryCache _cache;
    private readonly MpesaOptions _opts;
    private readonly ILogger<MpesaService> _log;

    private static readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);

    public MpesaService(
        IHttpClientFactory httpFactory,
        IMemoryCache cache,
        IOptions<MpesaOptions> opts,
        ILogger<MpesaService> log)
    {
        _httpFactory = httpFactory;
        _cache = cache;
        _opts = opts.Value;
        _log = log;
    }

    // ── OAuth token ────────────────────────────────────────────────────────────

    /// <summary>
    /// Returns a bearer token, using an in-process cache to avoid hitting the
    /// rate-limit on the /oauth endpoint (Safaricom allows ~1 call/sec).
    /// Cached for 50 minutes; Safaricom issues tokens valid for 3600 seconds.
    /// </summary>
    public async Task<string> GetAccessTokenAsync()
    {
        if (_cache.TryGetValue(TokenCacheKey, out string? cached) && cached is not null)
            return cached;

        var client = _httpFactory.CreateClient("mpesa");
        var creds = Convert.ToBase64String(
            Encoding.UTF8.GetBytes($"{_opts.ConsumerKey}:{_opts.ConsumerSecret}"));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", creds);

        var resp = await client.GetAsync(
            $"{_opts.BaseUrl}/oauth/v1/generate?grant_type=client_credentials");
        resp.EnsureSuccessStatusCode();

        var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
        var token = doc.RootElement.GetProperty("access_token").GetString()
                    ?? throw new InvalidOperationException("access_token missing from Safaricom OAuth response.");

        _cache.Set(TokenCacheKey, token, TimeSpan.FromMinutes(50));
        _log.LogInformation("Safaricom access token refreshed.");
        return token;
    }

    // ── STK Push ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Initiates an M-Pesa STK Push (LipaNaMpesa Online).
    /// Returns a typed result containing CheckoutRequestID and MerchantRequestID.
    /// </summary>
    public async Task<StkPushResult> InitiateStkPushAsync(
        string phone,
        decimal amount,
        string accountReference,
        string transactionDesc = "StayHere Rental Payment")
    {
        if (string.IsNullOrWhiteSpace(_opts.ConsumerKey) ||
            string.IsNullOrWhiteSpace(_opts.ConsumerSecret))
        {
            _log.LogWarning("M-Pesa credentials not configured — simulating sandbox STK Push.");
            var simId = $"ws_CO_SIM_{Guid.NewGuid():N}".ToUpper()[..20];
            return StkPushResult.Ok(simId, $"MERCHANT_SIM_{Guid.NewGuid():N}".ToUpper()[..18]);
        }

        try
        {
            var token = await GetAccessTokenAsync();
            var client = CreateBearerClient(token);

            var (timestamp, password) = BuildStkPassword();

            var body = new
            {
                BusinessShortCode = _opts.ShortCode,
                Password = password,
                Timestamp = timestamp,
                TransactionType = "CustomerPayBillOnline",
                Amount = (int)Math.Ceiling(amount),   // Safaricom requires integer
                PartyA = phone,
                PartyB = _opts.ShortCode,
                PhoneNumber = phone,
                CallBackURL = _opts.StkCallbackUrl,
                AccountReference = Truncate(accountReference, 12),
                TransactionDesc = Truncate(transactionDesc, 13)
            };

            var resp = await client.PostAsync(
                $"{_opts.BaseUrl}/mpesa/stkpush/v1/processrequest",
                JsonContent(body));

            var raw = await resp.Content.ReadAsStringAsync();
            _log.LogInformation("STK Push response: {Response}", raw);

            if (!resp.IsSuccessStatusCode)
                return StkPushResult.Fail($"Safaricom returned HTTP {(int)resp.StatusCode}: {raw}");

            using var doc = JsonDocument.Parse(raw);
            var root = doc.RootElement;

            // Safaricom returns ResponseCode "0" for success
            var responseCode = root.GetPropertyOrNull("ResponseCode")?.GetString();
            if (responseCode != "0")
            {
                var errDesc = root.GetPropertyOrNull("errorMessage")?.GetString()
                              ?? root.GetPropertyOrNull("ResponseDescription")?.GetString()
                              ?? "Unknown error";
                return StkPushResult.Fail(errDesc);
            }

            var checkoutId = root.GetProperty("CheckoutRequestID").GetString()!;
            var merchantId = root.GetProperty("MerchantRequestID").GetString()!;
            return StkPushResult.Ok(checkoutId, merchantId);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "STK Push initiation failed for phone {Phone}", phone);
            return StkPushResult.Fail(ex.Message);
        }
    }

    // ── STK Push query ─────────────────────────────────────────────────────────

    /// <summary>
    /// Queries the current status of an STK Push transaction from Safaricom.
    /// Useful for polling when the callback has not arrived within the expected window.
    /// </summary>
    public async Task<StkQueryResult> QueryStkStatusAsync(string checkoutRequestId)
    {
        try
        {
            var token = await GetAccessTokenAsync();
            var client = CreateBearerClient(token);

            var (timestamp, password) = BuildStkPassword();

            var body = new
            {
                BusinessShortCode = _opts.ShortCode,
                Password = password,
                Timestamp = timestamp,
                CheckoutRequestID = checkoutRequestId
            };

            var resp = await client.PostAsync(
                $"{_opts.BaseUrl}/mpesa/stkpushquery/v1/query",
                JsonContent(body));

            var raw = await resp.Content.ReadAsStringAsync();
            _log.LogInformation("STK Query response for {Id}: {Response}", checkoutRequestId, raw);

            using var doc = JsonDocument.Parse(raw);
            var root = doc.RootElement;

            var resultCode = root.GetPropertyOrNull("ResultCode")?.GetString()
                             ?? root.GetPropertyOrNull("errorCode")?.GetString();
            var resultDesc = root.GetPropertyOrNull("ResultDesc")?.GetString()
                             ?? root.GetPropertyOrNull("errorMessage")?.GetString()
                             ?? "Unknown";

            return new StkQueryResult(
                ResultCode: resultCode ?? "-1",
                ResultDesc: resultDesc,
                IsSuccess: resultCode == "0",
                IsPending: resultCode is null or "1037",   // 1037 = request in progress
                Raw: raw);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "STK Query failed for CheckoutRequestID {Id}", checkoutRequestId);
            return new StkQueryResult("-999", ex.Message, false, false, string.Empty);
        }
    }

    // ── C2B URL registration ───────────────────────────────────────────────────

    /// <summary>
    /// Registers the C2B validation and confirmation callback URLs with Safaricom.
    /// Must be called once before going live. Safe to call again — Safaricom
    /// will simply overwrite the previously registered URLs.
    /// </summary>
    public async Task<C2bRegisterResult> RegisterC2bUrlsAsync()
    {
        try
        {
            var token = await GetAccessTokenAsync();
            var client = CreateBearerClient(token);

            var body = new
            {
                ShortCode = _opts.ShortCode,
                ResponseType = "Completed",         // "Completed" = always confirm, "Cancelled" = reject on validation failure
                ConfirmationURL = _opts.C2bConfirmationUrl,
                ValidationURL = _opts.C2bValidationUrl
            };

            var resp = await client.PostAsync(
                $"{_opts.BaseUrl}/mpesa/c2b/v1/registerurl",
                JsonContent(body));

            var raw = await resp.Content.ReadAsStringAsync();
            _log.LogInformation("C2B URL registration response: {Response}", raw);

            if (!resp.IsSuccessStatusCode)
                return new C2bRegisterResult(false, $"HTTP {(int)resp.StatusCode}: {raw}");

            using var doc = JsonDocument.Parse(raw);
            var responseCode = doc.RootElement.GetPropertyOrNull("ResponseCode")?.GetString();
            var description = doc.RootElement.GetPropertyOrNull("ResponseDescription")?.GetString()
                              ?? doc.RootElement.GetPropertyOrNull("ResponseMessage")?.GetString()
                              ?? raw;

            return responseCode == "0"
                ? new C2bRegisterResult(true, description)
                : new C2bRegisterResult(false, description);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "C2B URL registration failed.");
            return new C2bRegisterResult(false, ex.Message);
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private (string Timestamp, string Password) BuildStkPassword()
    {
        var timestamp = DateTime.Now.ToString("yyyyMMddHHmmss");
        var raw = $"{_opts.ShortCode}{_opts.PassKey}{timestamp}";
        var password = Convert.ToBase64String(Encoding.UTF8.GetBytes(raw));
        return (timestamp, password);
    }

    private HttpClient CreateBearerClient(string token)
    {
        var client = _httpFactory.CreateClient("mpesa");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private static StringContent JsonContent(object payload) =>
        new(JsonSerializer.Serialize(payload, _json), Encoding.UTF8, "application/json");

    private static string Truncate(string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..maxLength];
}

// ── Result types ───────────────────────────────────────────────────────────────

public sealed record StkPushResult(
    bool Success,
    string? CheckoutRequestId,
    string? MerchantRequestId,
    string? ErrorMessage)
{
    public static StkPushResult Ok(string checkoutId, string merchantId) =>
        new(true, checkoutId, merchantId, null);

    public static StkPushResult Fail(string error) =>
        new(false, null, null, error);
}

public sealed record StkQueryResult(
    string ResultCode,
    string ResultDesc,
    bool IsSuccess,
    bool IsPending,
    string Raw);

public sealed record C2bRegisterResult(bool Success, string Message);

// ── JsonElement extension ──────────────────────────────────────────────────────

internal static class JsonElementExtensions
{
    public static JsonElement? GetPropertyOrNull(this JsonElement element, string name) =>
        element.TryGetProperty(name, out var prop) ? prop : null;
}
