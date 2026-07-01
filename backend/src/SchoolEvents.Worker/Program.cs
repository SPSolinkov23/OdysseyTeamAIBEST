using SchoolEvents.Data;
using SchoolEvents.Data.Messaging;
using SchoolEvents.Worker;
using SchoolEvents.Worker.Email;
using SchoolEvents.Worker.Messaging;
using SchoolEvents.Worker.Options;

var builder = Host.CreateApplicationBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("ConnectionStrings:Default is required.");

builder.Services.AddSchoolEventsData(connectionString);

builder.Services.Configure<WorkerOptions>(builder.Configuration.GetSection(WorkerOptions.SectionName));
builder.Services.Configure<SmtpOptions>(builder.Configuration.GetSection(SmtpOptions.SectionName));
builder.Services.Configure<RabbitMqOptions>(builder.Configuration.GetSection(RabbitMqOptions.SectionName));

builder.Services.AddSingleton<IEmailSender, SmtpEmailSender>();
builder.Services.AddScoped<NotificationProcessor>();
builder.Services.AddHostedService<NotificationWorker>();

var useRabbitMq = string.Equals(builder.Configuration["Messaging:Transport"], "RabbitMQ", StringComparison.OrdinalIgnoreCase);
if (useRabbitMq)
    builder.Services.AddHostedService<RabbitMqNotificationListener>();

var host = builder.Build();
host.Run();
