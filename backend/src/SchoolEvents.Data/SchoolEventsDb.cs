using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace SchoolEvents.Data;

/// <summary>
/// Single source of truth for how the MySQL provider is configured, shared by the
/// API host, the Worker host, and the design-time migration factory.
/// </summary>
public static class SchoolEventsDb
{
    /// <summary>
    /// Pinned so migrations don't need a live server to be generated. The running
    /// server is 8.4.x; any 8.0+ value enables the features we rely on
    /// (JSON columns, <c>FOR UPDATE SKIP LOCKED</c>).
    /// </summary>
    public static readonly MySqlServerVersion ServerVersion = new(new Version(8, 4, 0));

    public static void Configure(DbContextOptionsBuilder builder, string connectionString)
    {
        // NB: we deliberately do NOT enable a retrying execution strategy here.
        // The registration/worker flows open explicit transactions for row locks
        // (SELECT ... FOR UPDATE), and the retrying strategy forbids user-initiated
        // transactions unless every call is wrapped in an execution-strategy delegate.
        builder
            .UseMySql(connectionString, ServerVersion)
            .UseSnakeCaseNamingConvention();
    }

    public static IServiceCollection AddSchoolEventsData(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<SchoolEventsDbContext>(options => Configure(options, connectionString));
        return services;
    }
}
