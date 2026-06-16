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
    private readonly bool _allowOrganizerSignup;

    public AuthController(SchoolEventsDbContext db, TokenService tokens, IConfiguration config)
    {
        _db = db;
        _tokens = tokens;
        _allowOrganizerSignup = config.GetValue("Auth:AllowOrganizerSignup", false);
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest req)
    {
        var email = req.Email.Trim().ToLowerInvariant();

        if (await _db.Users.AnyAsync(u => u.Email == email))
            throw ApiException.Conflict("An account with that email already exists.", "email_taken");

        var role = UserRole.Student;
        if (!string.IsNullOrWhiteSpace(req.Role))
        {
            if (!Enum.TryParse(req.Role, ignoreCase: true, out role))
                throw ApiException.BadRequest("Unknown role.");
            if (role == UserRole.Organizer && !_allowOrganizerSignup)
                throw ApiException.Forbidden("Organizer accounts cannot be self-registered.");
        }

        var user = new User
        {
            Email = email,
            PasswordHash = PasswordHasher.Hash(req.Password),
            DisplayName = req.DisplayName.Trim(),
            Role = role,
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        // Enqueue a welcome email; the Worker delivers it asynchronously.
        _db.NotificationJobs.Add(new NotificationJob
        {
            Type = JobTypes.AccountWelcome,
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

        // Mirror it as an in-app notification so the bell isn't empty on first login.
        _db.Notifications.Add(AppNotifications.Welcome(user.Id, user.DisplayName));
        await _db.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, BuildAuth(user));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest req)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user is null || !PasswordHasher.Verify(req.Password, user.PasswordHash))
            throw ApiException.Unauthorized("Invalid email or password.");

        return Ok(BuildAuth(user));
    }

    [HttpPost("logout")]
    public IActionResult Logout() => NoContent(); // JWT is stateless; the client drops the token

    private AuthResponse BuildAuth(User user)
    {
        var (token, expiresAt) = _tokens.Create(user);
        return new AuthResponse
        {
            Token = token,
            ExpiresAt = expiresAt,
            User = new UserDto(user.Id, user.Email, user.DisplayName, user.Role, user.CreatedAt),
        };
    }
}
