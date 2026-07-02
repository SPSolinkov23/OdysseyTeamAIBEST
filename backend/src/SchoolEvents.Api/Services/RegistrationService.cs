using Microsoft.EntityFrameworkCore;
using SchoolEvents.Api.Dtos;
using SchoolEvents.Api.Infrastructure;
using SchoolEvents.Api.Messaging;
using SchoolEvents.Data;
using SchoolEvents.Data.Entities;
using SchoolEvents.Data.Notifications;

namespace SchoolEvents.Api.Services;

public class RegistrationService
{
    private readonly SchoolEventsDbContext _db;
    private readonly IJobQueue _jobQueue;

    protected RegistrationService() { _db = null!; _jobQueue = null!; }

    public RegistrationService(SchoolEventsDbContext db, IJobQueue jobQueue)
    {
        _db = db;
        _jobQueue = jobQueue;
    }

    public virtual async Task<RegistrationDto> RegisterAsync(long eventId, long userId)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();

        var ev = await LockEventAsync(eventId)
                 ?? throw ApiException.NotFound("Event not found.");

        if (ev.Status != EventStatus.Published)
            throw ApiException.BadRequest("This event is not open for registration.", "event_not_open");

        var user = await _db.Users.FindAsync(userId) ?? throw ApiException.Unauthorized();

        var existing = await _db.Registrations
            .FirstOrDefaultAsync(r => r.EventId == eventId && r.UserId == userId);

        if (existing is not null && existing.Status != RegistrationStatus.Cancelled)
            throw ApiException.Conflict("You are already registered for this event.", "already_registered");

        var confirmedCount = await _db.Registrations
            .CountAsync(r => r.EventId == eventId && r.Status == RegistrationStatus.Confirmed);

        var target = confirmedCount < ev.Capacity
            ? RegistrationStatus.Confirmed
            : RegistrationStatus.Waitlisted;

        int? waitlistPosition = null;
        if (target == RegistrationStatus.Waitlisted)
        {
            var ahead = await _db.Registrations
                .CountAsync(r => r.EventId == eventId && r.Status == RegistrationStatus.Waitlisted);
            waitlistPosition = ahead + 1;
        }

        Registration reg;
        if (existing is not null)
        {
            existing.Status = target;
            existing.CreatedAt = DateTime.UtcNow;
            reg = existing;
        }
        else
        {
            reg = new Registration { EventId = eventId, UserId = userId, Status = target };
            _db.Registrations.Add(reg);
        }

        AddJob(
            target == RegistrationStatus.Confirmed ? JobTypes.RegistrationConfirmed : JobTypes.RegistrationWaitlisted,
            ev,
            user,
            waitlistPosition);

        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        _jobQueue.NotifyJobReady();

        return new RegistrationDto
        {
            Id = reg.Id,
            EventId = reg.EventId,
            Status = reg.Status,
            WaitlistPosition = waitlistPosition,
            CreatedAt = reg.CreatedAt,
        };
    }

    public virtual async Task<CancelResult> CancelAsync(long registrationId, long userId)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();

        var reg = await _db.Registrations.FindAsync(registrationId);
        if (reg is null) throw ApiException.NotFound("Registration not found.");
        if (reg.UserId != userId) throw ApiException.Forbidden("You can only cancel your own registration.");

        if (reg.Status == RegistrationStatus.Cancelled)
        {
            await tx.CommitAsync();
            return new CancelResult { PromotedRegistration = null };
        }

        var ev = await LockEventAsync(reg.EventId)
                 ?? throw ApiException.NotFound("Event not found.");

        await _db.Entry(reg).ReloadAsync();
        if (reg.Status == RegistrationStatus.Cancelled)
        {
            await tx.CommitAsync();
            return new CancelResult { PromotedRegistration = null };
        }

        var wasConfirmed = reg.Status == RegistrationStatus.Confirmed;
        reg.Status = RegistrationStatus.Cancelled;

        _db.Notifications.Add(AppNotifications.Build(userId, JobTypes.RegistrationCancelled, ev.Id, ev.Title));

        long? promoted = null;
        if (wasConfirmed)
        {
            var next = await _db.Registrations
                .Where(r => r.EventId == reg.EventId && r.Status == RegistrationStatus.Waitlisted)
                .OrderBy(r => r.CreatedAt).ThenBy(r => r.Id)
                .FirstOrDefaultAsync();

            if (next is not null)
            {
                next.Status = RegistrationStatus.Confirmed;
                promoted = next.Id;

                var nextUser = await _db.Users.FindAsync(next.UserId);
                if (nextUser is not null)
                    AddJob(JobTypes.WaitlistPromoted, ev, nextUser, waitlistPosition: null);
            }
        }

        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        if (promoted is not null)
            _jobQueue.NotifyJobReady();

        return new CancelResult { PromotedRegistration = promoted };
    }

    private async Task<Event?> LockEventAsync(long eventId)
    {
        var rows = await _db.Events
            .FromSqlInterpolated($"SELECT * FROM events WHERE id = {eventId} FOR UPDATE")
            .ToListAsync();
        return rows.FirstOrDefault();
    }

    private void AddJob(string type, Event ev, User recipient, int? waitlistPosition)
    {
        var payload = new NotificationPayload
        {
            UserId = recipient.Id,
            Email = recipient.Email,
            Name = recipient.DisplayName,
            Language = recipient.Language,
            EventId = ev.Id,
            EventTitle = ev.Title,
            EventStartsAt = ev.StartsAt,
            EventLocation = ev.Location,
            WaitlistPosition = waitlistPosition,
        };

        _db.NotificationJobs.Add(new NotificationJob
        {
            Type = type,
            EventId = ev.Id,
            Payload = NotificationJson.Serialize(payload),
            Status = JobStatus.Pending,
            Attempts = 0,
            MaxAttempts = 5,
            AvailableAt = DateTime.UtcNow,
        });

        _db.Notifications.Add(AppNotifications.Build(recipient.Id, type, ev.Id, ev.Title, waitlistPosition));
    }
}