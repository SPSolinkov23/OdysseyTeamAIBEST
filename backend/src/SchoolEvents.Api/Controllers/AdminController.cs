using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolEvents.Api.Dtos;
using SchoolEvents.Api.Infrastructure;
using SchoolEvents.Data;
using SchoolEvents.Data.Entities;
using SchoolEvents.Data.Notifications;

namespace SchoolEvents.Api.Controllers;

[ApiController]
[Route("admin")]
[Authorize]
public class AdminController : ControllerBase
{
    private readonly SchoolEventsDbContext _db;

    public AdminController(SchoolEventsDbContext db)
    {
        _db = db;
    }

    [HttpGet("pending-organizers")]
    public async Task<ActionResult<PendingOrganizersResponse>> PendingOrganizers()
    {
        await EnsureAdminAsync();

        var items = await _db.Users.AsNoTracking()
            .Where(u => u.OrganizerStatus == OrganizerStatus.Pending)
            .OrderBy(u => u.CreatedAt).ThenBy(u => u.Id)
            .Select(u => new PendingOrganizerDto
            {
                Id = u.Id,
                Email = u.Email,
                DisplayName = u.DisplayName,
                CreatedAt = u.CreatedAt,
            })
            .ToListAsync();

        return Ok(new PendingOrganizersResponse { PendingOrganizers = items });
    }

    [HttpPost("organizers/{id:long}/approve")]
    public async Task<ActionResult<OrganizerDecisionResult>> Approve(long id)
    {
        await EnsureAdminAsync();
        var user = await LoadPendingAsync(id);

        user.Role = UserRole.Organizer;
        user.OrganizerStatus = OrganizerStatus.Approved;

        _db.Notifications.Add(AppNotifications.OrganizerApproved(user.Id));
        EnqueueEmail(user, JobTypes.OrganizerApproved);

        await _db.SaveChangesAsync();

        return Ok(new OrganizerDecisionResult { Id = user.Id, OrganizerStatus = user.OrganizerStatus });
    }

    [HttpPost("organizers/{id:long}/reject")]
    public async Task<ActionResult<OrganizerDecisionResult>> Reject(long id)
    {
        await EnsureAdminAsync();
        var user = await LoadPendingAsync(id);

        user.OrganizerStatus = OrganizerStatus.Rejected;

        _db.Notifications.Add(AppNotifications.OrganizerRejected(user.Id));
        EnqueueEmail(user, JobTypes.OrganizerRejected);

        await _db.SaveChangesAsync();

        return Ok(new OrganizerDecisionResult { Id = user.Id, OrganizerStatus = user.OrganizerStatus });
    }

    private async Task EnsureAdminAsync()
    {
        if (!await _db.IsAdminAsync(User.GetUserId()))
            throw ApiException.Forbidden("Admin access is required.");
    }

    private async Task<User> LoadPendingAsync(long id)
    {
        var user = await _db.Users.FindAsync(id)
            ?? throw ApiException.NotFound("User not found.");

        if (user.OrganizerStatus != OrganizerStatus.Pending)
            throw ApiException.BadRequest("This user has no pending organizer request.", "not_pending");

        return user;
    }

    private void EnqueueEmail(User user, string jobType)
    {
        _db.NotificationJobs.Add(new NotificationJob
        {
            Type = jobType,
            Payload = NotificationJson.Serialize(new NotificationPayload
            {
                UserId = user.Id,
                Email = user.Email,
                Name = user.DisplayName,
            }),
            Status = JobStatus.Pending,
            MaxAttempts = 5,
            AvailableAt = DateTime.UtcNow,
        });
    }
}