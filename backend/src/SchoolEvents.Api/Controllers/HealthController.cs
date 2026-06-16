using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolEvents.Data;

namespace SchoolEvents.Api.Controllers;

[ApiController]
[Route("health")]
[AllowAnonymous]
public class HealthController : ControllerBase
{
    private readonly SchoolEventsDbContext _db;

    public HealthController(SchoolEventsDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public IActionResult Health() => Ok(new { status = "ok" });

    [HttpGet("ready")]
    public async Task<IActionResult> Ready()
    {
        try
        {
            await _db.Database.ExecuteSqlRawAsync("SELECT 1");
            return Ok(new { status = "ready" });
        }
        catch
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { status = "not_ready" });
        }
    }
}
