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
    }
}
