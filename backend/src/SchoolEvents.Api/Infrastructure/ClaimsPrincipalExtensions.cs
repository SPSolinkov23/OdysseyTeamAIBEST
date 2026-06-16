using System.Security.Claims;
using SchoolEvents.Data.Entities;

namespace SchoolEvents.Api.Infrastructure;

public static class ClaimsPrincipalExtensions
{
    public static long GetUserId(this ClaimsPrincipal user)
    {
        var sub = user.FindFirstValue("sub") ?? user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (long.TryParse(sub, out var id)) return id;
        throw ApiException.Unauthorized();
    }

    public static bool IsOrganizer(this ClaimsPrincipal user) =>
        string.Equals(user.FindFirstValue("role"), nameof(UserRole.Organizer), StringComparison.OrdinalIgnoreCase);
}
