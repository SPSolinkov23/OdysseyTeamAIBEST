using Microsoft.EntityFrameworkCore;
using SchoolEvents.Api.Auth;
using SchoolEvents.Data;
using SchoolEvents.Data.Entities;

namespace SchoolEvents.Api;

/// <summary>Idempotent demo data: a known organizer, a demo student, and sample events.</summary>
public static class SeedData
{
    public const string OrganizerEmail = "organizer@school.edu";
    public const string OrganizerPassword = "Organizer123!";
    public const string StudentEmail = "student@school.edu";
    public const string StudentPassword = "Student123!";

    public static async Task EnsureAsync(SchoolEventsDbContext db, ILogger logger)
    {
        var organizer = await db.Users.FirstOrDefaultAsync(u => u.Email == OrganizerEmail);
        if (organizer is null)
        {
            organizer = new User
            {
                Email = OrganizerEmail,
                PasswordHash = PasswordHasher.Hash(OrganizerPassword),
                DisplayName = "Event Office",
                Role = UserRole.Organizer,
            };
            db.Users.Add(organizer);
            await db.SaveChangesAsync();
            logger.LogInformation("Seeded organizer account {Email}", OrganizerEmail);
        }

        if (!await db.Users.AnyAsync(u => u.Email == StudentEmail))
        {
            db.Users.Add(new User
            {
                Email = StudentEmail,
                PasswordHash = PasswordHasher.Hash(StudentPassword),
                DisplayName = "Demo Student",
                Role = UserRole.Student,
            });
            await db.SaveChangesAsync();
            logger.LogInformation("Seeded demo student account {Email}", StudentEmail);
        }

        if (!await db.Events.AnyAsync())
        {
            var now = DateTime.UtcNow;
            db.Events.AddRange(
                new Event
                {
                    Title = "Robotics Club Kickoff",
                    Description = "Meet the team, see last year's build, and sign up for the new season.",
                    Location = "Engineering Lab 3",
                    Category = "Club",
                    StartsAt = now.AddDays(7).Date.AddHours(16),
                    Capacity = 30,
                    Status = EventStatus.Published,
                    OrganizerId = organizer.Id,
                },
                new Event
                {
                    Title = "Spring Drama Auditions",
                    Description = "Open auditions for the spring production. Prepare a one-minute monologue.",
                    Location = "Auditorium",
                    Category = "Seminar",
                    StartsAt = now.AddDays(10).Date.AddHours(15),
                    Capacity = 12,
                    Status = EventStatus.Published,
                    OrganizerId = organizer.Id,
                },
                new Event
                {
                    Title = "College Essay Workshop",
                    Description = "Small-group workshop with the counseling office. Seats are limited!",
                    Location = "Room 214",
                    Category = "Workshop",
                    StartsAt = now.AddDays(3).Date.AddHours(14),
                    Capacity = 2,
                    Status = EventStatus.Published,
                    OrganizerId = organizer.Id,
                },
                new Event
                {
                    Title = "Jazz Band Rehearsal",
                    Description = "Draft event — not yet open to students.",
                    Location = "Music Room",
                    Category = "Club",
                    StartsAt = now.AddDays(14).Date.AddHours(17),
                    Capacity = 20,
                    Status = EventStatus.Draft,
                    OrganizerId = organizer.Id,
                });
            await db.SaveChangesAsync();
            logger.LogInformation("Seeded sample events");
        }
    }
}
