namespace SchoolEvents.Data.Entities;

public class Event : ITimestamped
{
    public long Id { get; set; }

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Location { get; set; }

    public string? Category { get; set; }

    public string? Url { get; set; }

    public DateTime StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }

    public int Capacity { get; set; }

    public EventStatus Status { get; set; } = EventStatus.Draft;

    public long OrganizerId { get; set; }
    public User? Organizer { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<Registration> Registrations { get; set; } = new List<Registration>();
}