using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolEvents.Api.Dtos;
using SchoolEvents.Api.Infrastructure;
using SchoolEvents.Api.Services;
using SchoolEvents.Data.Entities;

namespace SchoolEvents.Api.Controllers;

[ApiController]
[Route("events")]
public class EventsController : ControllerBase
{
    private readonly EventService _events;

    public EventsController(EventService events)
    {
        _events = events;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<EventListResponse>> List(
        [FromQuery] string? status,
        [FromQuery] string? q,
        [FromQuery] bool mine = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 9)
    {
        return Ok(await _events.ListAsync(CallerId(), status, q, mine, page, pageSize));
    }

    [HttpGet("{id:long}")]
    [AllowAnonymous]
    public async Task<ActionResult<EventEnvelope>> Get(long id)
    {
        var dto = await _events.GetAsync(id, CallerId(), User.IsOrganizer());
        return Ok(new EventEnvelope { Event = dto });
    }

    [HttpPost]
    [Authorize(Roles = nameof(UserRole.Organizer))]
    public async Task<ActionResult<EventEnvelope>> Create(CreateEventRequest req)
    {
        var dto = await _events.CreateAsync(User.GetUserId(), req);
        return StatusCode(StatusCodes.Status201Created, new EventEnvelope { Event = dto });
    }

    [HttpPatch("{id:long}")]
    [Authorize(Roles = nameof(UserRole.Organizer))]
    public async Task<ActionResult<EventEnvelope>> Update(long id, UpdateEventRequest req)
    {
        var dto = await _events.UpdateAsync(id, User.GetUserId(), req);
        return Ok(new EventEnvelope { Event = dto });
    }

    [HttpPost("{id:long}/publish")]
    [Authorize(Roles = nameof(UserRole.Organizer))]
    public async Task<ActionResult<EventEnvelope>> Publish(long id)
    {
        var dto = await _events.PublishAsync(id, User.GetUserId());
        return Ok(new EventEnvelope { Event = dto });
    }

    [HttpPost("{id:long}/cancel")]
    [Authorize(Roles = nameof(UserRole.Organizer))]
    public async Task<ActionResult<EventEnvelope>> Cancel(long id)
    {
        var dto = await _events.CancelAsync(id, User.GetUserId());
        return Ok(new EventEnvelope { Event = dto });
    }

    [HttpGet("{id:long}/registrations")]
    [Authorize(Roles = nameof(UserRole.Organizer))]
    public async Task<ActionResult<EventRegistrationsResponse>> Attendees(long id)
    {
        return Ok(await _events.GetAttendeesAsync(id, User.GetUserId()));
    }

    [HttpGet("{id:long}/waitlist")]
    [Authorize(Roles = nameof(UserRole.Organizer))]
    public async Task<ActionResult<WaitlistResponse>> Waitlist(long id)
    {
        return Ok(await _events.GetWaitlistAsync(id, User.GetUserId()));
    }

    private long? CallerId() =>
        User.Identity?.IsAuthenticated == true ? User.GetUserId() : null;
}
