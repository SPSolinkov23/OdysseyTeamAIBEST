using Microsoft.EntityFrameworkCore;
using SchoolEvents.Data;

namespace SchoolEvents.Api.Infrastructure;

public static class AdminExtensions
{
    public static Task<bool> IsAdminAsync(this SchoolEventsDbContext db, long userId, CancellationToken ct = default) =>
        db.Admins.AnyAsync(a => a.UserId == userId, ct);
}
