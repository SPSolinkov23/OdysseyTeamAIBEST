using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolEvents.Api.Dtos;
using SchoolEvents.Api.Infrastructure;
using SchoolEvents.Data;
using SchoolEvents.Data.Entities;

namespace SchoolEvents.Api.Controllers;

/// <summary>In-app notification center for the signed-in user (both roles).</summary>
[ApiController]
[Route("notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private const int MaxItems = 100;
    private readonly SchoolEventsDbContext _db;

    public NotificationsController(SchoolEventsDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<NotificationListResponse>> List()
    {
        var userId = User.GetUserId();

        var items = await _db.Notifications.AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt).ThenByDescending(n => n.Id)
            .Take(MaxItems)
            .Select(n => new NotificationDto
            {
                Id = n.Id,
                Type = n.Type,
                EventId = n.EventId,
                Message = n.Message,
                Read = n.IsRead,
                CreatedAt = n.CreatedAt,
            })
            .ToListAsync();

        return Ok(new NotificationListResponse
        {
            Notifications = items,
            UnreadCount = items.Count(n => !n.Read),
        });
    }

    [HttpPost("read")]
    public async Task<IActionResult> MarkAllRead()
    {
        var userId = User.GetUserId();

        await _db.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));

        return NoContent();
    }
}
