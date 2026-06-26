
using SchoolEvents.Data.Entities;

namespace SchoolEvents.Api.Dtos;

public class CreateEventRequest
{
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? Location { get; set; }

    public string? Category { get; set; }

    public string? Url { get; set; }

    public DateTime StartsAt { get; set; }

    public DateTime? EndsAt { get; set; }

    public int Capacity { get; set; }
}

public class UpdateEventRequest
{
    public string? Title { get; set; }

    public string? Description { get; set; }

    public string? Location { get; set; }

    public string? Category { get; set; }

    public string? Url { get; set; }

    public DateTime? StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }

    public int? Capacity { get; set; }
}

public class EventDto
{
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Location { get; set; }
    public string? Category { get; set; }
    public string? Url { get; set; }
    public DateTime StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }
    public int Capacity { get; set; }
    public EventStatus Status { get; set; }
    public long OrganizerId { get; set; }
    public string? OrganizerName { get; set; }
    public int ConfirmedCount { get; set; }
    public int WaitlistCount { get; set; }
    public int SeatsAvailable { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    /// <summary>The caller's own registration for this event, if any (students only).</summary>
    public MyRegistrationDto? MyRegistration { get; set; }
}

public class MyRegistrationDto
{
    public long Id { get; set; }
    public RegistrationStatus Status { get; set; }
    public int? WaitlistPosition { get; set; }
}

public class EventEnvelope
{
    public EventDto Event { get; set; } = default!;
}

public class EventListResponse
{
    public IReadOnlyList<EventDto> Events { get; set; } = Array.Empty<EventDto>();
    public IReadOnlyList<string> Categories { get; set; } = Array.Empty<string>();
    public EventListStatsDto Stats { get; set; } = new();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages { get; set; }
    public bool HasPreviousPage { get; set; }
    public bool HasNextPage { get; set; }
}

public class EventListStatsDto
{
    public int TotalEvents { get; set; }
    public int PublishedCount { get; set; }
    public int DraftCount { get; set; }
    public int CancelledCount { get; set; }
    public int ConfirmedRegistrationCount { get; set; }
    public int WaitlistCount { get; set; }
    public int SeatsAvailable { get; set; }
}
