namespace SchoolEvents.Data.Entities;

public class NotificationJob : ITimestamped
{
    public long Id { get; set; }

    public string Type { get; set; } = string.Empty;

    public string Payload { get; set; } = "{}";

    public JobStatus Status { get; set; } = JobStatus.Pending;

    public int Attempts { get; set; }
    public int MaxAttempts { get; set; } = 5;

    public DateTime AvailableAt { get; set; }

    public string? IdempotencyKey { get; set; }

    public string? LastError { get; set; }

    public long? EventId { get; set; }

    public DateTime? LockedAt { get; set; }
    public string? LockedBy { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

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
    public const string OrganizerRequestSubmitted = "OrganizerRequestSubmitted";
}