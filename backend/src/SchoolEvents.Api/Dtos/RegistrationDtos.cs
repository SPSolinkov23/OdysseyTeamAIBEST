using SchoolEvents.Data.Entities;

namespace SchoolEvents.Api.Dtos;

/// <summary>Returned by POST register and in the student's "my registrations" list.</summary>
public class RegistrationDto
{
    public long Id { get; set; }
    public long EventId { get; set; }
    public RegistrationStatus Status { get; set; }

    /// <summary>1-based position in the queue; null when confirmed/cancelled.</summary>
    public int? WaitlistPosition { get; set; }

    public DateTime CreatedAt { get; set; }

    /// <summary>Populated in list views so the UI can render without an extra fetch.</summary>
    public EventSummaryDto? Event { get; set; }
}

public class EventSummaryDto
{
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }
    public string? Location { get; set; }
    public string? Category { get; set; }
    public EventStatus Status { get; set; }
}

public class RegistrationListResponse
{
    public IReadOnlyList<RegistrationDto> Registrations { get; set; } = Array.Empty<RegistrationDto>();
}

/// <summary>Result of cancelling a registration.</summary>
public class CancelResult
{
    public RegistrationStatus Status { get; set; } = RegistrationStatus.Cancelled;

    /// <summary>Id of a waitlisted registration that was promoted to confirmed, if any.</summary>
    public long? PromotedRegistration { get; set; }
}

/// <summary>An attendee row for the organizer's manage view.</summary>
public class AttendeeDto
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public RegistrationStatus Status { get; set; }
    public int? WaitlistPosition { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class EventRegistrationsResponse
{
    public IReadOnlyList<AttendeeDto> Registrations { get; set; } = Array.Empty<AttendeeDto>();
}

public class WaitlistResponse
{
    public IReadOnlyList<AttendeeDto> Waitlist { get; set; } = Array.Empty<AttendeeDto>();
}
