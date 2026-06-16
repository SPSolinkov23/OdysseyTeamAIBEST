namespace SchoolEvents.Api.Infrastructure;

/// <summary>
/// Thrown by controllers/services to short-circuit a request with a specific HTTP
/// status and a machine-readable code. Translated to JSON by
/// <see cref="ErrorHandlingMiddleware"/>.
/// </summary>
public class ApiException : Exception
{
    public int StatusCode { get; }
    public string Code { get; }

    public ApiException(int statusCode, string code, string message) : base(message)
    {
        StatusCode = statusCode;
        Code = code;
    }

    public static ApiException BadRequest(string message, string code = "bad_request") => new(400, code, message);
    public static ApiException Unauthorized(string message = "Authentication required.") => new(401, "unauthorized", message);
    public static ApiException Forbidden(string message = "You do not have access to this resource.") => new(403, "forbidden", message);
    public static ApiException NotFound(string message = "Resource not found.") => new(404, "not_found", message);
    public static ApiException Conflict(string message, string code = "conflict") => new(409, code, message);
}
