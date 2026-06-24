using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SchoolEvents.Data;

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
