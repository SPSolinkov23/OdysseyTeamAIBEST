namespace SchoolEvents.Data.Entities;

public class User : ITimestamped
{
    public long Id { get; set; }

    /// <summary>Always stored lower-cased so the unique index is effectively case-insensitive.</summary>
    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    public UserRole Role { get; set; } = UserRole.Student;

    public OrganizerStatus OrganizerStatus { get; set; } = OrganizerStatus.None;

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<Event> Events { get; set; } = new List<Event>();
    public ICollection<Registration> Registrations { get; set; } = new List<Registration>();
}
