namespace SchoolEvents.Data.Entities;

public class NotificationLog
{
    public long Id { get; set; }

    public long? JobId { get; set; }

    public string Channel { get; set; } = "email";
    public string Recipient { get; set; } = string.Empty;
    public string? Subject { get; set; }
    public string Status { get; set; } = "sent";
    public string? Detail { get; set; }

    public string IdempotencyKey { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
}
