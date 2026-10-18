using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Functions.Worker.Middleware;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Text.Json;

namespace StayHere.Shared.Middleware;

public class GlobalExceptionMiddleware : IFunctionsWorkerMiddleware
{
    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            var logger = context.GetLogger<GlobalExceptionMiddleware>();
            logger.LogError(ex, "An unhandled exception occurred during function execution.");

            try
            {
                var httpRequestData = await context.GetHttpRequestDataAsync();
                if (httpRequestData != null)
                {
                    var response = httpRequestData.CreateResponse(HttpStatusCode.InternalServerError);
                    response.Headers.Add("Content-Type", "application/json; charset=utf-8");

                    var errorResponse = new
                    {
                        error = "Internal Server Error",
                        message = ex.Message,
                        type = ex.GetType().Name
                    };

                    await response.WriteStringAsync(JsonSerializer.Serialize(errorResponse, new JsonSerializerOptions
                    {
                        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                    }));

                    context.GetInvocationResult().Value = response;
                }
            }
            catch (ObjectDisposedException)
            {
                // The caller already disconnected (client-side timeout, cancelled request) before
                // the function finished - typically after a long tool-calling chain that hit
                // several upstream rate-limit backoffs. The underlying HttpContext/feature
                // collection is gone by the time we get here, so there is no response left to
                // write; the error above is already logged, so just stop rather than letting this
                // secondary exception mask the real one or crash the middleware pipeline.
                logger.LogWarning("Could not write the error response - the caller had already disconnected.");
            }
        }
    }
}
