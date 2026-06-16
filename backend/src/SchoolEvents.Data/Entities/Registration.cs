namespace SchoolEvents.Data.Entities;

public class Registration : ITimestamped
{
    public long Id { get; set; }

    public long EventId { get; set; }
    public Event? Event { get; set; }

    public long UserId { get; set; }
    public User? User { get; set; }

    public RegistrationStatus Status { get; set; } = RegistrationStatus.Confirmed;

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
