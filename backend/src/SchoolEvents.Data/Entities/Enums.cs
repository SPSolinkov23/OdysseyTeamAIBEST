namespace SchoolEvents.Data.Entities;

public enum UserRole
{
    Student,
    Organizer,
}

public enum OrganizerStatus
{
    None,
    Pending,
    Approved,
    Rejected,
}

public enum EventStatus
{
    Draft,
    Published,
    Cancelled,
}

public enum RegistrationStatus
{
    Confirmed,
    Waitlisted,
    Cancelled,
}

public enum JobStatus
{
    Pending,
    Processing,
    Sent,
    Failed,
}