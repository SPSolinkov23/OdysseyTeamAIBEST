using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolEvents.Api.Auth;
using SchoolEvents.Api.Dtos;
using SchoolEvents.Api.Infrastructure;
using SchoolEvents.Data;
using SchoolEvents.Data.Entities;
using SchoolEvents.Data.Notifications;

namespace SchoolEvents.Api.Controllers;

[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly SchoolEventsDbContext _db;
    private readonly TokenService _tokens;

    public AuthController(SchoolEventsDbContext db, TokenService tokens)
    {
        _db = db;
        _tokens = tokens;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest req)
    {
        var email = req.Email.Trim().ToLowerInvariant();

        if (await _db.Users.AnyAsync(u => u.Email == email))
            throw ApiException.Conflict("An account with that email already exists.", "email_taken");

        var appliedAsOrganizer = false;
        if (!string.IsNullOrWhiteSpace(req.Role))
        {
            if (!Enum.TryParse<UserRole>(req.Role, ignoreCase: true, out var requestedRole))
                throw ApiException.BadRequest("Unknown role.");
            appliedAsOrganizer = requestedRole == UserRole.Organizer;
        }

        var user = new User
        {
            Email = email,
            PasswordHash = PasswordHasher.Hash(req.Password),
            DisplayName = req.DisplayName.Trim(),
            Role = UserRole.Student,
            OrganizerStatus = appliedAsOrganizer ? OrganizerStatus.Pending : OrganizerStatus.None,
            Language = req.Language ?? "bg",
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        _db.NotificationJobs.Add(new NotificationJob
        {
            Type = JobTypes.AccountWelcome,
            Payload = NotificationJson.Serialize(new NotificationPayload
            {
                UserId = user.Id,
                Email = user.Email,
                Name = user.DisplayName,
                Language = user.Language,
            }),
            Status = JobStatus.Pending,
            MaxAttempts = 5,
            AvailableAt = DateTime.UtcNow,
        });

        _db.Notifications.Add(AppNotifications.Welcome(user.Id, user.DisplayName));

        if (appliedAsOrganizer)
            _db.Notifications.Add(AppNotifications.OrganizerPending(user.Id));

        await _db.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, await BuildAuthAsync(user));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest req)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user is null || !PasswordHasher.Verify(req.Password, user.PasswordHash))
            throw ApiException.Unauthorized("Invalid email or password.");

        return Ok(await BuildAuthAsync(user));
    }

    [HttpPost("logout")]
    public IActionResult Logout() => NoContent();

    private async Task<AuthResponse> BuildAuthAsync(User user)
    {
        var (token, expiresAt) = _tokens.Create(user);
        var isAdmin = await _db.IsAdminAsync(user.Id);
        return new AuthResponse
        {
            Token = token,
            ExpiresAt = expiresAt,
            User = new UserDto(user.Id, user.Email, user.DisplayName, user.Role, user.CreatedAt, user.OrganizerStatus, isAdmin, user.Language),
        };
    }
}