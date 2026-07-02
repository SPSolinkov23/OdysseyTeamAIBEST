using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolEvents.Api.Dtos;
using SchoolEvents.Api.Infrastructure;
using SchoolEvents.Api.Services;
using SchoolEvents.Data;
using SchoolEvents.Data.Entities;

namespace SchoolEvents.Api.Controllers;

[ApiController]
[Authorize]
public class RegistrationsController : ControllerBase
{
    private readonly RegistrationService _registrations;
    private readonly SchoolEventsDbContext _db;

    public RegistrationsController(RegistrationService registrations, SchoolEventsDbContext db)
    {
        _registrations = registrations;
        _db = db;
    }

    [HttpPost("events/{eventId:long}/registrations")]
    public async Task<ActionResult<RegistrationDto>> Register(long eventId)
    {
        var dto = await _registrations.RegisterAsync(eventId, User.GetUserId());
        return StatusCode(StatusCodes.Status201Created, dto);
    }

    [HttpGet("registrations/me")]
    public async Task<ActionResult<RegistrationListResponse>> Mine()
    {
        var userId = User.GetUserId();

        var list = await _db.Registrations.AsNoTracking()
            .Where(r => r.UserId == userId && r.Status != RegistrationStatus.Cancelled)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new RegistrationDto
            {
                Id = r.Id,
                EventId = r.EventId,
                Status = r.Status,
                CreatedAt = r.CreatedAt,
                Event = new EventSummaryDto
                {
                    Id = r.Event!.Id,
                    Title = r.Event.Title,
                    StartsAt = r.Event.StartsAt,
                    EndsAt = r.Event.EndsAt,
                    Location = r.Event.Location,
                    Category = r.Event.Category,
                    Status = r.Event.Status,
                },
            })
            .ToListAsync();

        foreach (var r in list.Where(r => r.Status == RegistrationStatus.Waitlisted))
        {
            r.WaitlistPosition = await _db.Registrations.CountAsync(x =>
                x.EventId == r.EventId &&
                x.Status == RegistrationStatus.Waitlisted &&
                (x.CreatedAt < r.CreatedAt || (x.CreatedAt == r.CreatedAt && x.Id <= r.Id)));
        }

        return Ok(new RegistrationListResponse { Registrations = list });
    }

    [HttpDelete("registrations/{id:long}")]
    public async Task<ActionResult<CancelResult>> Cancel(long id)
    {
        return Ok(await _registrations.CancelAsync(id, User.GetUserId()));
    }
}
