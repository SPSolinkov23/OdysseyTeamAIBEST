using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolEvents.Api.Auth;
using SchoolEvents.Api.Dtos;
using SchoolEvents.Api.Infrastructure;
using SchoolEvents.Data;

namespace SchoolEvents.Api.Controllers;

[ApiController]
[Route("users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly SchoolEventsDbContext _db;

    public UsersController(SchoolEventsDbContext db)
    {
        _db = db;
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var user = await _db.Users.FindAsync(User.GetUserId()) ?? throw ApiException.Unauthorized();
        return Ok(new { user = new UserDto(user.Id, user.Email, user.DisplayName, user.Role, user.CreatedAt) });
    }

    [HttpPatch("me")]
    public async Task<IActionResult> Update(UpdateMeRequest req)
    {
        var user = await _db.Users.FindAsync(User.GetUserId()) ?? throw ApiException.Unauthorized();
        user.DisplayName = req.DisplayName.Trim();
        await _db.SaveChangesAsync();
        return Ok(new { user = new UserDto(user.Id, user.Email, user.DisplayName, user.Role, user.CreatedAt) });
    }

    [HttpPost("me/password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest req)
    {
        var user = await _db.Users.FindAsync(User.GetUserId()) ?? throw ApiException.Unauthorized();

        if (!PasswordHasher.Verify(req.CurrentPassword, user.PasswordHash))
            throw ApiException.BadRequest("Your current password is incorrect.", "invalid_password");

        user.PasswordHash = PasswordHasher.Hash(req.NewPassword);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
