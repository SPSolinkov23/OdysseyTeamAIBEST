namespace SchoolEvents.Data.Entities;

public class Notification
{
    public long Id { get; set; }

    public long UserId { get; set; }
    public User? User { get; set; }

    public string Type { get; set; } = string.Empty;

    public long? EventId { get; set; }

    public string Message { get; set; } = string.Empty;

    public bool IsRead { get; set; }

    public DateTime CreatedAt { get; set; }
}
