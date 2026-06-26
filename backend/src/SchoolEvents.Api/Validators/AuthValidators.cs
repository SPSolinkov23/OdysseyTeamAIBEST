using FluentValidation;
using SchoolEvents.Api.Dtos;
 
namespace SchoolEvents.Api.Validators;
 
public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    private const string PasswordRegex = @"^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$";
 
    public RegisterRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty()
                .WithMessage("The email is required.")
            .EmailAddress()
                .WithMessage("The email is not valid.")
            .MaximumLength(255)
                .WithMessage("The email cannot be longer than 255 characters.");
 
        RuleFor(x => x.Password)
            .NotEmpty()
                .WithMessage("The password is required.")
            .MinimumLength(8)
                .WithMessage("The password must be at least 8 characters long.")
            .MaximumLength(200)
                .WithMessage("The password cannot be longer than 200 characters.")
            .Matches(PasswordRegex)
                .WithMessage("The password must contain at least one uppercase letter, one digit, and one special character (@$!%*?&).");
 
        RuleFor(x => x.DisplayName)
            .NotEmpty()
                .WithMessage("The display name is required.")
            .MaximumLength(120)
                .WithMessage("The display name cannot be longer than 120 characters.");
 
        RuleFor(x => x.Role)
            .Must(role => role is null or "student" or "organizer")
                .WithMessage("The role can only be 'student' or 'organizer'.")
            .When(x => x.Role is not null);

        RuleFor(x => x.Language)
            .Must(lang => lang is null or "en" or "bg")
                .WithMessage("The language can only be 'en' or 'bg'.")
            .When(x => x.Language is not null);
    }
}
 
public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty()
                .WithMessage("The email is required.")
            .EmailAddress()
                .WithMessage("The email is not valid.");
 
        RuleFor(x => x.Password)
            .NotEmpty()
                .WithMessage("The password is required.");
    }
}
 
public class UpdateMeRequestValidator : AbstractValidator<UpdateMeRequest>
{
    public UpdateMeRequestValidator()
    {
        RuleFor(x => x.DisplayName)
            .MaximumLength(120)
                .WithMessage("The display name cannot be longer than 120 characters.")
            .When(x => !string.IsNullOrWhiteSpace(x.DisplayName));

        RuleFor(x => x.Language)
            .Must(lang => lang is null or "en" or "bg")
                .WithMessage("The language can only be 'en' or 'bg'.")
            .When(x => x.Language is not null);
    }
}
 
public class ChangePasswordRequestValidator : AbstractValidator<ChangePasswordRequest>
{
    private const string PasswordRegex =
        @"^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$";
 
    public ChangePasswordRequestValidator()
    {
        RuleFor(x => x.CurrentPassword)
            .NotEmpty()
                .WithMessage("The current password is required.");
 
        RuleFor(x => x.NewPassword)
            .NotEmpty()
                .WithMessage("The new password is required.")
            .MinimumLength(8)
                .WithMessage("The new password must be at least 8 characters long.")
            .MaximumLength(200)
                .WithMessage("The new password cannot be longer than 200 characters.")
            .Matches(PasswordRegex)
                .WithMessage("The new password must contain at least one uppercase letter, one digit, and one special character (@$!%*?&).")
            .NotEqual(x => x.CurrentPassword)
                .WithMessage("The new password cannot be the same as the current password.");
    }
}