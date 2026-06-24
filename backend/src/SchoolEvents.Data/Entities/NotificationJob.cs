namespace SchoolEvents.Data.Entities;

/// <summary>
/// A row in the transactional outbox / job queue. The API inserts a job in the
/// same transaction as the business change; the Worker claims and delivers it.
/// </summary>
public class NotificationJob : ITimestamped
{
    public long Id { get; set; }

    /// <summary>One of <see cref="JobTypes"/>. Stored verbatim (e.g. "RegistrationConfirmed").</summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>JSON document with everything the Worker needs to render the email.</summary>
    public string Payload { get; set; } = "{}";

    public JobStatus Status { get; set; } = JobStatus.Pending;

    public int Attempts { get; set; }
    public int MaxAttempts { get; set; } = 5;

    /// <summary>Earliest time the job may be claimed (used for retry back-off).</summary>
    public DateTime AvailableAt { get; set; }

    /// <summary>Dedup guard: a second insert with the same key is ignored.</summary>
    public string? IdempotencyKey { get; set; }

    public string? LastError { get; set; }

    /// <summary>Convenience column so organizers can filter jobs for one event.</summary>
    public long? EventId { get; set; }

    public DateTime? LockedAt { get; set; }
    public string? LockedBy { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>Canonical job type names. Kept as strings so the wire value is stable.</summary>
public static class JobTypes
{
    public const string AccountWelcome = "AccountWelcome";
    public const string RegistrationConfirmed = "RegistrationConfirmed";
    public const string RegistrationWaitlisted = "RegistrationWaitlisted";
    public const string RegistrationCancelled = "RegistrationCancelled";
    public const string WaitlistPromoted = "WaitlistPromoted";
    public const string EventCancelled = "EventCancelled";
    public const string OrganizerPending = "OrganizerPending";
    public const string OrganizerApproved = "OrganizerApproved";
    public const string OrganizerRejected = "OrganizerRejected";
}
