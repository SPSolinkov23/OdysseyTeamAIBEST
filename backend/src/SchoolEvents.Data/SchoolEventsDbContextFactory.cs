using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SchoolEvents.Data;

/// <summary>
/// Lets <c>dotnet ef migrations</c> create the context without booting a host.
/// Reads <c>SCHOOL_EVENTS_DB</c> if present, otherwise falls back to the local
/// development connection string.
/// </summary>
public class SchoolEventsDbContextFactory : IDesignTimeDbContextFactory<SchoolEventsDbContext>
{
    public SchoolEventsDbContext CreateDbContext(string[] args)
    {
        var connectionString =
            Environment.GetEnvironmentVariable("SCHOOL_EVENTS_DB")
            ?? "Server=localhost;Port=3306;Database=school_events;User Id=app;Password=app_local_pw;AllowPublicKeyRetrieval=True;SslMode=None;";

        var builder = new DbContextOptionsBuilder<SchoolEventsDbContext>();
        SchoolEventsDb.Configure(builder, connectionString);
        return new SchoolEventsDbContext(builder.Options);
    }
}
