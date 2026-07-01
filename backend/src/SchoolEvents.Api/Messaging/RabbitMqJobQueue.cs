using System.Text;
using Microsoft.Extensions.Options;
using RabbitMQ.Client;
using SchoolEvents.Data.Messaging;

namespace SchoolEvents.Api.Messaging;

public class RabbitMqJobQueue : IJobQueue, IDisposable
{
    private readonly IConnection _connection;
    private readonly IModel _channel;
    private readonly string _queue;
    private readonly ILogger<RabbitMqJobQueue> _logger;

    public RabbitMqJobQueue(IOptions<RabbitMqOptions> options, ILogger<RabbitMqJobQueue> logger)
    {
        _logger = logger;
        var o = options.Value;
        _queue = o.Queue;

        var factory = new ConnectionFactory
        {
            HostName = o.HostName,
            Port = o.Port,
            UserName = o.UserName,
            Password = o.Password,
        };

        _connection = factory.CreateConnection("schoolevents-api");
        _channel = _connection.CreateModel();
        _channel.QueueDeclare(_queue, durable: true, exclusive: false, autoDelete: false, arguments: null);
    }

    public void NotifyJobReady()
    {
        try
        {
            var body = Encoding.UTF8.GetBytes("job-ready");
            var props = _channel.CreateBasicProperties();
            props.Persistent = true;
            _channel.BasicPublish(exchange: "", routingKey: _queue, basicProperties: props, body: body);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not publish job-ready signal; the worker poll will still deliver it");
        }
    }

    public void Dispose()
    {
        _channel?.Dispose();
        _connection?.Dispose();
    }
}
