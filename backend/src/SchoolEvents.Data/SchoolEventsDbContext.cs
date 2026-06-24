using Microsoft.EntityFrameworkCore;
using SchoolEvents.Data.Entities;

namespace SchoolEvents.Data;

public class SchoolEventsDbContext : DbContext
{
    public SchoolEventsDbContext(DbContextOptions<SchoolEventsDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Event> Events => Set<Event>();
    public DbSet<Registration> Registrations => Set<Registration>();
    public DbSet<NotificationJob> NotificationJobs => Set<NotificationJob>();
    public DbSet<NotificationLog> NotificationLogs => Set<NotificationLog>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<Admin> Admins => Set<Admin>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        b.Entity<User>(e =>
        {
            e.Property(x => x.Email).HasMaxLength(255).IsRequired();
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.PasswordHash).HasMaxLength(255).IsRequired();
            e.Property(x => x.DisplayName).HasMaxLength(120).IsRequired();
            e.Property(x => x.Role).HasConversion<string>().HasMaxLength(20).IsRequired();
            e.Property(x => x.OrganizerStatus).HasConversion<string>().HasMaxLength(20).IsRequired();
            e.Property(x => x.Language).HasMaxLength(2).IsRequired();
        });

        b.Entity<Admin>(e =>
        {
            e.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.UserId).IsUnique();
        });

        b.Entity<Event>(e =>
        {
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.Property(x => x.Description).HasColumnType("text");
            e.Property(x => x.Location).HasMaxLength(200);
            e.Property(x => x.Category).HasMaxLength(60);
            e.Property(x => x.Url).HasMaxLength(500);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20).IsRequired();
            e.HasOne(x => x.Organizer)
                .WithMany(u => u.Events)
                .HasForeignKey(x => x.OrganizerId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => x.Status);
            e.HasIndex(x => x.StartsAt);
            e.HasIndex(x => x.OrganizerId);
        });

        b.Entity<Registration>(e =>
        {
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20).IsRequired();
            e.HasOne(x => x.Event)
                .WithMany(ev => ev.Registrations)
                .HasForeignKey(x => x.EventId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.User)
                .WithMany(u => u.Registrations)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.EventId, x.UserId }).IsUnique();
            e.HasIndex(x => new { x.EventId, x.Status });
        });

        b.Entity<NotificationJob>(e =>
        {
            e.Property(x => x.Type).HasMaxLength(60).IsRequired();
            e.Property(x => x.Payload).HasColumnType("json").IsRequired();
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20).IsRequired();
            e.Property(x => x.LockedBy).HasMaxLength(80);
            e.Property(x => x.LastError).HasColumnType("text");
            e.HasIndex(x => x.IdempotencyKey).IsUnique();
            e.HasIndex(x => new { x.Status, x.AvailableAt });
            e.HasIndex(x => x.EventId);
        });

        b.Entity<NotificationLog>(e =>
        {
            e.Property(x => x.Channel).HasMaxLength(20).IsRequired();
            e.Property(x => x.Recipient).HasMaxLength(255).IsRequired();
            e.Property(x => x.Subject).HasMaxLength(255);
            e.Property(x => x.Status).HasMaxLength(20).IsRequired();
            e.Property(x => x.Detail).HasColumnType("text");
            e.Property(x => x.IdempotencyKey).HasMaxLength(200).IsRequired();
            e.HasIndex(x => x.IdempotencyKey).IsUnique();
        });

        b.Entity<Notification>(e =>
        {
            e.Property(x => x.Type).HasMaxLength(60).IsRequired();
            e.Property(x => x.Message).HasMaxLength(500).IsRequired();
            e.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.UserId, x.CreatedAt });
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override int SaveChanges()
    {
        ApplyTimestamps();
        return base.SaveChanges();
    }

    private void ApplyTimestamps()
    {
        var now = DateTime.UtcNow;
        foreach (var entry in ChangeTracker.Entries<ITimestamped>())
        {
            if (entry.State == EntityState.Added)
            {
                if (entry.Entity.CreatedAt == default) entry.Entity.CreatedAt = now;
                entry.Entity.UpdatedAt = now;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = now;
            }
        }

        foreach (var entry in ChangeTracker.Entries<NotificationLog>())
        {
            if (entry.State == EntityState.Added && entry.Entity.CreatedAt == default)
                entry.Entity.CreatedAt = now;
        }

        foreach (var entry in ChangeTracker.Entries<Notification>())
        {
            if (entry.State == EntityState.Added && entry.Entity.CreatedAt == default)
                entry.Entity.CreatedAt = now;
        }

        foreach (var entry in ChangeTracker.Entries<Admin>())
        {
            if (entry.State == EntityState.Added && entry.Entity.CreatedAt == default)
                entry.Entity.CreatedAt = now;
        }
    }
}
