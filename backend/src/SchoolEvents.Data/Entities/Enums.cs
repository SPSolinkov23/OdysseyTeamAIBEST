namespace SchoolEvents.Data.Entities;

/// <summary>Account type. Students register for events; organizers create/manage them.</summary>
public enum UserRole
{
    Student,
    Organizer,
}

/// <summary>Lifecycle of an event. Only Published events are visible to students.</summary>
public enum EventStatus
{
    Draft,
    Published,
    Cancelled,
}

/// <summary>State of a single registration row.</summary>
public enum RegistrationStatus
{
    Confirmed,
    Waitlisted,
    Cancelled,
}

/// <summary>State of a queued notification job (the outbox row).</summary>
public enum JobStatus
{
    Pending,
    Processing,
    Sent,
    Failed,
}
