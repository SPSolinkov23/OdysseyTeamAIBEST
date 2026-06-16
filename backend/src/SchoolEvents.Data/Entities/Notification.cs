namespace SchoolEvents.Data.Entities;

/// <summary>
/// A per-user, in-app notification shown in the notification center (bell icon).
/// Distinct from <see cref="NotificationJob"/>, which is the outbox row that drives
/// asynchronous <em>email</em> delivery. The two are written together so the user
/// sees the same event in-app and (when SMTP is enabled) by email.
/// </summary>
public class Notification
{
    public long Id { get; set; }

    public long UserId { get; set; }
    public User? User { get; set; }

    /// <summary>One of the <see cref="JobTypes"/> constants (e.g. RegistrationConfirmed).</summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>Related event, when applicable.</summary>
    public long? EventId { get; set; }

    public string Message { get; set; } = string.Empty;

    /// <summary>Named to avoid the MySQL reserved word "read".</summary>
    public bool IsRead { get; set; }

    public DateTime CreatedAt { get; set; }
}
