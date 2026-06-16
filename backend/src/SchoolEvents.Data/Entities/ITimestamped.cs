namespace SchoolEvents.Data.Entities;

/// <summary>
/// Implemented by entities whose <c>created_at</c>/<c>updated_at</c> columns are
/// maintained automatically by <see cref="SchoolEventsDbContext.SaveChangesAsync"/>.
/// </summary>
public interface ITimestamped
{
    DateTime CreatedAt { get; set; }
    DateTime UpdatedAt { get; set; }
}
