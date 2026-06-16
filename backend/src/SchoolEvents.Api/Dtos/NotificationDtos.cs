namespace SchoolEvents.Api.Dtos;

/// <summary>A single in-app notification for the notification center.</summary>
public class NotificationDto
{
    public long Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public long? EventId { get; set; }
    public string Message { get; set; } = string.Empty;
    public bool Read { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class NotificationListResponse
{
    public IReadOnlyList<NotificationDto> Notifications { get; set; } = Array.Empty<NotificationDto>();
    public int UnreadCount { get; set; }
}
