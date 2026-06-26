
using SchoolEvents.Data.Entities;

namespace SchoolEvents.Api.Dtos;

public class RegisterRequest
{
    public string Email { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    public string? Role { get; set; }

    public string? Language { get; set; }
}

public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class UpdateMeRequest
{
    public string DisplayName { get; set; } = string.Empty;

    public string? Language { get; set; }
}

public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public record UserDto(long Id, string Email, string DisplayName, UserRole Role, DateTime CreatedAt, OrganizerStatus OrganizerStatus, bool IsAdmin, string Language);

public class AuthResponse
{
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public UserDto User { get; set; } = default!;
}