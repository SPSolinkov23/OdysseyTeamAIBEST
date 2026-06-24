using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace SchoolEvents.Data;

public static class SchoolEventsDb
{    public static readonly MySqlServerVersion ServerVersion = new(new Version(8, 4, 0));

    public static void Configure(DbContextOptionsBuilder builder, string connectionString)
    {
        builder.UseMySql(connectionString, ServerVersion).UseSnakeCaseNamingConvention();
    }

    public static IServiceCollection AddSchoolEventsData(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<SchoolEventsDbContext>(options => Configure(options, connectionString));
        return services;
    }
}
