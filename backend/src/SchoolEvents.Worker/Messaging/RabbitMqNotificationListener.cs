using Microsoft.Extensions.Options;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using SchoolEvents.Data.Messaging;

namespace SchoolEvents.Worker.Messaging;

public class RabbitMqNotificationListener : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly RabbitMqOptions _options;
    private readonly ILogger<RabbitMqNotificationListener> _logger;
    private IConnection? _connection;
    private IModel? _channel;

    public RabbitMqNotificationListener(
        IServiceScopeFactory scopeFactory,
        IOptions<RabbitMqOptions> options,
        ILogger<RabbitMqNotificationListener> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var factory = new ConnectionFactory
        {
            HostName = _options.HostName,
            Port = _options.Port,
            UserName = _options.UserName,
            Password = _options.Password,
            AutomaticRecoveryEnabled = true,
        };

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                _connection = factory.CreateConnection("schoolevents-worker");
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "RabbitMQ not reachable yet; retrying in 5s (the DB poller keeps delivering meanwhile)");
                try { await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken); }
                catch (OperationCanceledException) { return; }
            }
        }

        if (stoppingToken.IsCancellationRequested) return;

        _channel = _connection!.CreateModel();
        _channel.QueueDeclare(_options.Queue, durable: true, exclusive: false, autoDelete: false, arguments: null);
        _channel.BasicQos(prefetchSize: 0, prefetchCount: 1, global: false);

        var consumer = new EventingBasicConsumer(_channel);
        consumer.Received += async (_, ea) =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var processor = scope.ServiceProvider.GetRequiredService<NotificationProcessor>();
                await processor.RunOnceAsync(stoppingToken);
                _channel!.BasicAck(ea.DeliveryTag, multiple: false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to handle job-ready signal");
                _channel!.BasicNack(ea.DeliveryTag, multiple: false, requeue: false);
            }
        };

        _channel.BasicConsume(_options.Queue, autoAck: false, consumer);
        _logger.LogInformation("RabbitMQ listener started on queue {Queue}", _options.Queue);
    }

    public override void Dispose()
    {
        _channel?.Dispose();
        _connection?.Dispose();
        base.Dispose();
    }
}
