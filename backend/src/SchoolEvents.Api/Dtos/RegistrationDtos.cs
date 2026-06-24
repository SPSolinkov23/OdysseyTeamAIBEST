using SchoolEvents.Data.Entities;

namespace SchoolEvents.Api.Dtos;

public class RegistrationDto
{
    public long Id { get; set; }
    public long EventId { get; set; }
    public RegistrationStatus Status { get; set; }

    public int? WaitlistPosition { get; set; }

    public DateTime CreatedAt { get; set; }

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

public class CancelResult
{
    public RegistrationStatus Status { get; set; } = RegistrationStatus.Cancelled;

    public long? PromotedRegistration { get; set; }
}

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
