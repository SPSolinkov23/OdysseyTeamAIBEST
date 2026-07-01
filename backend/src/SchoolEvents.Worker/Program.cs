using SchoolEvents.Data;
using SchoolEvents.Worker;
using SchoolEvents.Worker.Email;
using SchoolEvents.Worker.Options;
using Serilog;
 
try
{
    var builder = Host.CreateApplicationBuilder(args);
 
    builder.Services.AddSerilog((services, config) =>
    {
        var configuration = services.GetRequiredService<IConfiguration>();
        var seqUrl = configuration["Seq:ServerUrl"];
 
        config
            .MinimumLevel.Information()
            .MinimumLevel.Override("Microsoft.EntityFrameworkCore", Serilog.Events.LogEventLevel.Warning)
            .Enrich.FromLogContext()
            .WriteTo.Console();
 
        if (!string.IsNullOrWhiteSpace(seqUrl))
            config.WriteTo.Seq(seqUrl);
    });
 
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