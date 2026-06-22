namespace SchoolEvents.Data.Entities;

public class Admin
{
    public long Id { get; set; }

    public long UserId { get; set; }
    public User? User { get; set; }

    public DateTime CreatedAt { get; set; }
}
