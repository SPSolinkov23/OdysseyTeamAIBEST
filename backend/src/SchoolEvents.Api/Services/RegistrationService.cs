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
    private readonly ILogger<RegistrationService> _logger;
 
    public RegistrationService(SchoolEventsDbContext db, ILogger<RegistrationService> logger)
    {
        _db = db;
        _logger = logger;
    }
 
    public async Task<RegistrationDto> RegisterAsync(long eventId, long userId)
    {
        _logger.LogInformation("User {UserId} attempting to register for event {EventId}", userId, eventId);
 
        await using var tx = await _db.Database.BeginTransactionAsync();
 
        var ev = await LockEventAsync(eventId);
        if (ev is null)
        {
            _logger.LogWarning("Registration failed: event {EventId} not found", eventId);
            throw ApiException.NotFound("Event not found.");
        }
 
        if (ev.Status != EventStatus.Published)
        {
            _logger.LogWarning("Registration rejected: event {EventId} is not published (status={Status})", eventId, ev.Status);
            throw ApiException.BadRequest("This event is not open for registration.", "event_not_open");
        }
 
        var user = await _db.Users.FindAsync(userId) ?? throw ApiException.Unauthorized();
 
        var existing = await _db.Registrations
            .FirstOrDefaultAsync(r => r.EventId == eventId && r.UserId == userId);
 
        if (existing is not null && existing.Status != RegistrationStatus.Cancelled)
        {
            _logger.LogInformation("Registration rejected: user {UserId} already registered for event {EventId} (status={Status})", userId, eventId, existing.Status);
            throw ApiException.Conflict("You are already registered for this event.", "already_registered");
        }
 
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
            waitlistPosition = ahead + 1; // this sign-up joins the back of the queue
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
 
        if (target == RegistrationStatus.Confirmed)
            _logger.LogInformation("User {UserId} CONFIRMED for event {EventId} ({Confirmed}/{Capacity} seats)", userId, eventId, confirmedCount + 1, ev.Capacity);
        else
            _logger.LogInformation("User {UserId} WAITLISTED for event {EventId} at position {Position}", userId, eventId, waitlistPosition);
 
        return new RegistrationDto
        {
            Id = reg.Id,
            EventId = reg.EventId,
            Status = reg.Status,
            WaitlistPosition = waitlistPosition,
            CreatedAt = reg.CreatedAt,
        };
    }
 
    public async Task<CancelResult> CancelAsync(long registrationId, long userId)
    {
        _logger.LogInformation("User {UserId} attempting to cancel registration {RegistrationId}", userId, registrationId);
 
        await using var tx = await _db.Database.BeginTransactionAsync();
 
        var reg = await _db.Registrations.FindAsync(registrationId);
        if (reg is null)
        {
            _logger.LogWarning("Cancel failed: registration {RegistrationId} not found", registrationId);
            throw ApiException.NotFound("Registration not found.");
        }
 
        if (reg.UserId != userId)
        {
            _logger.LogWarning("Cancel rejected: user {UserId} attempted to cancel registration {RegistrationId} owned by {OwnerId}", userId, registrationId, reg.UserId);
            throw ApiException.Forbidden("You can only cancel your own registration.");
        }
 
        if (reg.Status == RegistrationStatus.Cancelled)
        {
            _logger.LogInformation("Registration {RegistrationId} was already cancelled; no-op", registrationId);
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
                {
                    AddJob(JobTypes.WaitlistPromoted, ev, nextUser, waitlistPosition: null);
                    _logger.LogInformation("Waitlist promotion: user {PromotedUserId} (registration {PromotedRegistrationId}) moved to CONFIRMED for event {EventId}", next.UserId, next.Id, ev.Id);
                }
            }
            else
            {
                _logger.LogInformation("Seat freed for event {EventId} but waitlist is empty; no promotion", ev.Id);
            }
        }
 
        await _db.SaveChangesAsync();
        await tx.CommitAsync();
 
        _logger.LogInformation("Registration {RegistrationId} cancelled by user {UserId} (was {PreviousStatus})", registrationId, userId, wasConfirmed ? "Confirmed" : "Waitlisted");
 
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
 
        _logger.LogInformation("Enqueued notification job {JobType} for user {UserId} (event {EventId})", type, recipient.Id, ev.Id);
    }
}