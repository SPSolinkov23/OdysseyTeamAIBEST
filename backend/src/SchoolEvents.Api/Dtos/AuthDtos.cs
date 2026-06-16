using System.ComponentModel.DataAnnotations;
using SchoolEvents.Data.Entities;

namespace SchoolEvents.Api.Dtos;

public class RegisterRequest
{
    [Required, EmailAddress, MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(8), MaxLength(200)]
    public string Password { get; set; } = string.Empty;

    [Required, MaxLength(120)]
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>Optional: "student" (default) or "organizer" (only if signup is allowed).</summary>
    public string? Role { get; set; }
}

public class LoginRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

public class UpdateMeRequest
{
    [Required, MaxLength(120)]
    public string DisplayName { get; set; } = string.Empty;
}

public class ChangePasswordRequest
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required, MinLength(8), MaxLength(200)]
    public string NewPassword { get; set; } = string.Empty;
}

public record UserDto(long Id, string Email, string DisplayName, UserRole Role, DateTime CreatedAt);

public class AuthResponse
{
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public UserDto User { get; set; } = default!;
}
