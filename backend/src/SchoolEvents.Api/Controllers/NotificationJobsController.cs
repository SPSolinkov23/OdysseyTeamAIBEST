using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolEvents.Api.Dtos;
using SchoolEvents.Data;
using SchoolEvents.Data.Entities;

namespace SchoolEvents.Api.Controllers;

[ApiController]
[Route("notification-jobs")]
[Authorize(Roles = nameof(UserRole.Organizer))]
public class NotificationJobsController : ControllerBase
{
    private readonly SchoolEventsDbContext _db;

    public NotificationJobsController(SchoolEventsDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<JobListResponse>> List(
        [FromQuery(Name = "event_id")] long? eventId,
        [FromQuery] string? status,
        [FromQuery] int limit = 100)
    {
        var query = _db.NotificationJobs.AsNoTracking();

        if (eventId is not null)
            query = query.Where(j => j.EventId == eventId);

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<JobStatus>(status, ignoreCase: true, out var parsed))
            query = query.Where(j => j.Status == parsed);

        var jobs = await query
            .OrderByDescending(j => j.Id)
            .Take(Math.Clamp(limit, 1, 500))
            .Select(j => new JobDto
            {
                Id = j.Id,
                Type = j.Type,
                Status = j.Status,
                Attempts = j.Attempts,
                MaxAttempts = j.MaxAttempts,
                AvailableAt = j.AvailableAt,
                EventId = j.EventId,
                LastError = j.LastError,
                CreatedAt = j.CreatedAt,
            })
            .ToListAsync();

        return Ok(new JobListResponse { Jobs = jobs });
    }
}
