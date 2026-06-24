using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using SchoolEvents.Api.Dtos;
using SchoolEvents.Api.Infrastructure;
using SchoolEvents.Data;
using SchoolEvents.Data.Entities;
using SchoolEvents.Data.Notifications;

namespace SchoolEvents.Api.Services;

public class EventService
{
    private readonly SchoolEventsDbContext _db;

    public EventService(SchoolEventsDbContext db)
    {
        _db = db;
    }

    private static readonly Expression<Func<Event, EventDto>> ToDto = e => new EventDto
    {
        Id = e.Id,
        Title = e.Title,
        Description = e.Description,
        Location = e.Location,
        Category = e.Category,
        Url = e.Url,
        StartsAt = e.StartsAt,
        EndsAt = e.EndsAt,
        Capacity = e.Capacity,
        Status = e.Status,
        OrganizerId = e.OrganizerId,
        OrganizerName = e.Organizer!.DisplayName,
        ConfirmedCount = e.Registrations.Count(r => r.Status == RegistrationStatus.Confirmed),
        WaitlistCount = e.Registrations.Count(r => r.Status == RegistrationStatus.Waitlisted),
        SeatsAvailable = e.Capacity - e.Registrations.Count(r => r.Status == RegistrationStatus.Confirmed),
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt,
    };

    public async Task<List<EventDto>> ListAsync(long? callerId, string? status, string? q, bool mine)
    {
        IQueryable<Event> query = _db.Events.AsNoTracking();

        if (mine)
        {
            if (callerId is null) throw ApiException.Unauthorized();
            query = query.Where(e => e.OrganizerId == callerId);
        }
        else
        {
            query = query.Where(e => e.Status == EventStatus.Published);
        }

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<EventStatus>(status, ignoreCase: true, out var parsed))
            query = query.Where(e => e.Status == parsed);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(e => e.Title.Contains(term) || (e.Location != null && e.Location.Contains(term)));
        }

        return await query.OrderBy(e => e.StartsAt).Select(ToDto).ToListAsync();
    }

    public async Task<EventDto> GetAsync(long id, long? callerId, bool callerIsOrganizer)
    {
        var dto = await _db.Events.AsNoTracking()
            .Where(e => e.Id == id)
            .Select(ToDto)
            .FirstOrDefaultAsync()
            ?? throw ApiException.NotFound("Event not found.");

        if (dto.Status != EventStatus.Published)
        {
            var ownsIt = callerId is not null && callerIsOrganizer && dto.OrganizerId == callerId;
            if (!ownsIt) throw ApiException.NotFound("Event not found.");
        }

        if (callerId is not null)
            dto.MyRegistration = await GetMyRegistrationAsync(id, callerId.Value);

        return dto;
    }

    public async Task<EventDto> CreateAsync(long organizerId, CreateEventRequest req)
    {
        ValidateTimes(ToUtc(req.StartsAt), req.EndsAt is null ? null : ToUtc(req.EndsAt.Value));

        var ev = new Event
        {
            Title = req.Title.Trim(),
            Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim(),
            Location = string.IsNullOrWhiteSpace(req.Location) ? null : req.Location.Trim(),
            Category = string.IsNullOrWhiteSpace(req.Category) ? null : req.Category.Trim(),
            Url = string.IsNullOrWhiteSpace(req.Url) ? null : req.Url.Trim(),
            StartsAt = ToUtc(req.StartsAt),
            EndsAt = req.EndsAt is null ? null : ToUtc(req.EndsAt.Value),
            Capacity = req.Capacity,
            Status = EventStatus.Draft,
            OrganizerId = organizerId,
        };

        _db.Events.Add(ev);
        await _db.SaveChangesAsync();

        return await GetAsync(ev.Id, organizerId, callerIsOrganizer: true);
    }

    public async Task<EventDto> UpdateAsync(long id, long organizerId, UpdateEventRequest req)
    {
        var ev = await LoadOwnedAsync(id, organizerId);

        if (req.Title is not null) ev.Title = req.Title.Trim();
        if (req.Description is not null) ev.Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim();
        if (req.Location is not null) ev.Location = string.IsNullOrWhiteSpace(req.Location) ? null : req.Location.Trim();
        if (req.Category is not null) ev.Category = string.IsNullOrWhiteSpace(req.Category) ? null : req.Category.Trim();
        if (req.Url is not null) ev.Url = string.IsNullOrWhiteSpace(req.Url) ? null : req.Url.Trim();
        if (req.StartsAt is not null) ev.StartsAt = ToUtc(req.StartsAt.Value);
        if (req.EndsAt is not null) ev.EndsAt = ToUtc(req.EndsAt.Value);
        if (req.Capacity is not null)
        {
            if (req.Capacity.Value < 1) throw ApiException.BadRequest("Capacity must be at least 1.");
            ev.Capacity = req.Capacity.Value;
        }

        ValidateTimes(ev.StartsAt, ev.EndsAt);

        await _db.SaveChangesAsync();
        return await GetAsync(ev.Id, organizerId, callerIsOrganizer: true);
    }

    public async Task<EventDto> PublishAsync(long id, long organizerId)
    {
        var ev = await LoadOwnedAsync(id, organizerId);
        if (ev.Status == EventStatus.Cancelled)
            throw ApiException.BadRequest("A cancelled event cannot be published.");

        ev.Status = EventStatus.Published;
        await _db.SaveChangesAsync();
        return await GetAsync(ev.Id, organizerId, callerIsOrganizer: true);
    }
    
    public async Task<EventDto> CancelAsync(long id, long organizerId)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();

        var ev = await LoadOwnedAsync(id, organizerId);
        if (ev.Status != EventStatus.Cancelled)
        {
            var affected = await _db.Registrations
                .Include(r => r.User)
                .Where(r => r.EventId == id && r.Status != RegistrationStatus.Cancelled)
                .ToListAsync();

            foreach (var r in affected)
            {
                r.Status = RegistrationStatus.Cancelled;
                var attendee = r.User!;
                _db.NotificationJobs.Add(new NotificationJob
                {
                    Type = JobTypes.EventCancelled,
                    EventId = ev.Id,
                    Status = JobStatus.Pending,
                    MaxAttempts = 5,
                    AvailableAt = DateTime.UtcNow,
                    Payload = NotificationJson.Serialize(new NotificationPayload
                    {
                        UserId = attendee.Id,
                        Email = attendee.Email,
                        Name = attendee.DisplayName,
                        Language = attendee.Language,
                        EventId = ev.Id,
                        EventTitle = ev.Title,
                        EventStartsAt = ev.StartsAt,
                        EventLocation = ev.Location,
                    }),
                });
                _db.Notifications.Add(AppNotifications.Build(attendee.Id, JobTypes.EventCancelled, ev.Id, ev.Title));
            }

            ev.Status = EventStatus.Cancelled;
            await _db.SaveChangesAsync();
        }

        await tx.CommitAsync();
        return await GetAsync(ev.Id, organizerId, callerIsOrganizer: true);
    }

    public async Task<EventRegistrationsResponse> GetAttendeesAsync(long id, long organizerId)
    {
        await LoadOwnedAsync(id, organizerId);

        var confirmed = await _db.Registrations.AsNoTracking()
            .Where(r => r.EventId == id && r.Status == RegistrationStatus.Confirmed)
            .OrderBy(r => r.CreatedAt).ThenBy(r => r.Id)
            .Select(r => new AttendeeDto
            {
                Id = r.Id,
                UserId = r.UserId,
                UserName = r.User!.DisplayName,
                Email = r.User.Email,
                Status = r.Status,
                CreatedAt = r.CreatedAt,
            })
            .ToListAsync();

        return new EventRegistrationsResponse { Registrations = confirmed };
    }

    public async Task<WaitlistResponse> GetWaitlistAsync(long id, long organizerId)
    {
        await LoadOwnedAsync(id, organizerId);

        var waitlist = await _db.Registrations.AsNoTracking()
            .Where(r => r.EventId == id && r.Status == RegistrationStatus.Waitlisted)
            .OrderBy(r => r.CreatedAt).ThenBy(r => r.Id)
            .Select(r => new AttendeeDto
            {
                Id = r.Id,
                UserId = r.UserId,
                UserName = r.User!.DisplayName,
                Email = r.User.Email,
                Status = r.Status,
                CreatedAt = r.CreatedAt,
            })
            .ToListAsync();

        for (var i = 0; i < waitlist.Count; i++) waitlist[i].WaitlistPosition = i + 1;

        return new WaitlistResponse { Waitlist = waitlist };
    }

    private async Task<MyRegistrationDto?> GetMyRegistrationAsync(long eventId, long userId)
    {
        var mine = await _db.Registrations.AsNoTracking()
            .Where(r => r.EventId == eventId && r.UserId == userId && r.Status != RegistrationStatus.Cancelled)
            .Select(r => new { r.Id, r.Status, r.CreatedAt })
            .FirstOrDefaultAsync();

        if (mine is null) return null;

        int? position = null;
        if (mine.Status == RegistrationStatus.Waitlisted)
        {
            position = await _db.Registrations.CountAsync(r =>
                r.EventId == eventId &&
                r.Status == RegistrationStatus.Waitlisted &&
                (r.CreatedAt < mine.CreatedAt || (r.CreatedAt == mine.CreatedAt && r.Id <= mine.Id)));
        }

        return new MyRegistrationDto { Id = mine.Id, Status = mine.Status, WaitlistPosition = position };
    }

    private async Task<Event> LoadOwnedAsync(long id, long organizerId)
    {
        var ev = await _db.Events.FirstOrDefaultAsync(e => e.Id == id)
                 ?? throw ApiException.NotFound("Event not found.");
        if (ev.OrganizerId != organizerId)
            throw ApiException.Forbidden("You can only manage events you created.");
        return ev;
    }

    private static DateTime ToUtc(DateTime dt) => dt.Kind switch
    {
        DateTimeKind.Utc => dt,
        DateTimeKind.Local => dt.ToUniversalTime(),
        _ => DateTime.SpecifyKind(dt, DateTimeKind.Utc),
    };

    private static void ValidateTimes(DateTime startsAt, DateTime? endsAt)
    {
        if (endsAt is not null && endsAt <= startsAt)
            throw ApiException.BadRequest("The end time must be after the start time.");
    }
}
