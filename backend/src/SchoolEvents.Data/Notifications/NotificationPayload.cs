using System.Text.Json;

namespace SchoolEvents.Data.Notifications;

public class NotificationPayload
{
    public long UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Language { get; set; } = "bg";

    public long EventId { get; set; }
    public string EventTitle { get; set; } = string.Empty;
    public DateTime EventStartsAt { get; set; }
    public string? EventLocation { get; set; }

    public int? WaitlistPosition { get; set; }

    public string? ActorName { get; set; }
    public string? ActorEmail { get; set; }
}

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
