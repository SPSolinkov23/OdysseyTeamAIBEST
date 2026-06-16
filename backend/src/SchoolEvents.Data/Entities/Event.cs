namespace SchoolEvents.Data.Entities;

public class Event : ITimestamped
{
    public long Id { get; set; }

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Location { get; set; }

    /// <summary>Free-form category label (drives the UI icon/colour), e.g. "Уъркшоп".</summary>
    public string? Category { get; set; }

    /// <summary>Optional external link (meeting URL, info page, etc.).</summary>
    public string? Url { get; set; }

    public DateTime StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }

    /// <summary>Maximum number of <see cref="RegistrationStatus.Confirmed"/> seats.</summary>
    public int Capacity { get; set; }

    public EventStatus Status { get; set; } = EventStatus.Draft;

    public long OrganizerId { get; set; }
    public User? Organizer { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<Registration> Registrations { get; set; } = new List<Registration>();
}
