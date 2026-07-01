using SchoolEvents.Data;
using SchoolEvents.Worker;
using SchoolEvents.Worker.Email;
using SchoolEvents.Worker.Options;
using Serilog;
 
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft.EntityFrameworkCore", Serilog.Events.LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File(
        path: "logs/worker-.txt",
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 14,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss} [{Level:u3}] {SourceContext}: {Message:lj}{NewLine}{Exception}")
    .CreateLogger();
 
try
{
    Log.Information("Starting SchoolEvents.Worker");
 
    var builder = Host.CreateApplicationBuilder(args);
 
    builder.Services.AddSerilog();
 
    var connectionString = builder.Configuration.GetConnectionString("Default")
        ?? throw new InvalidOperationException("ConnectionStrings:Default is required.");
    builder.Services.AddSchoolEventsData(connectionString);
 
    builder.Services.Configure<WorkerOptions>(builder.Configuration.GetSection(WorkerOptions.SectionName));
    builder.Services.Configure<SmtpOptions>(builder.Configuration.GetSection(SmtpOptions.SectionName));
 
    builder.Services.AddSingleton<IEmailSender, SmtpEmailSender>();
    builder.Services.AddHostedService<NotificationWorker>();
 
    var host = builder.Build();
    host.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "SchoolEvents.Worker terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
