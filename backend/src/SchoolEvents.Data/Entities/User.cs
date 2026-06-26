namespace SchoolEvents.Data.Entities;

public class User : ITimestamped
{
    public long Id { get; set; }

    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    public UserRole Role { get; set; } = UserRole.Student;

    public OrganizerStatus OrganizerStatus { get; set; } = OrganizerStatus.None;

    public string Language { get; set; } = "bg";

    public string Theme { get; set; } = "light";

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<Event> Events { get; set; } = new List<Event>();
    public ICollection<Registration> Registrations { get; set; } = new List<Registration>();
}
