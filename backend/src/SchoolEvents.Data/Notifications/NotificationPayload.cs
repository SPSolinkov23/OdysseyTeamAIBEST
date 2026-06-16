using System.Text.Json;

namespace SchoolEvents.Data.Notifications;

/// <summary>
/// The JSON body stored on a <see cref="Entities.NotificationJob"/>. Written by the
/// API when a job is enqueued and read by the Worker when rendering the email.
/// This is the contract between the two processes.
/// </summary>
public class NotificationPayload
{
    public long UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    public long EventId { get; set; }
    public string EventTitle { get; set; } = string.Empty;
    public DateTime EventStartsAt { get; set; }
    public string? EventLocation { get; set; }

    /// <summary>Only present for waitlist notifications.</summary>
    public int? WaitlistPosition { get; set; }
}

/// <summary>Shared serializer settings so the API and Worker agree on the wire format.</summary>
public static class NotificationJson
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = false,
    };

    public static string Serialize(NotificationPayload payload) => JsonSerializer.Serialize(payload, Options);

    public static NotificationPayload Deserialize(string json) =>
        JsonSerializer.Deserialize<NotificationPayload>(json, Options) ?? new NotificationPayload();
}
