using FluentValidation;
using SchoolEvents.Api.Dtos;
 
namespace SchoolEvents.Api.Validators;
 
public class CreateEventRequestValidator : AbstractValidator<CreateEventRequest>
{
    public CreateEventRequestValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty()
                .WithMessage("The title is required.")
            .MaximumLength(200)
                .WithMessage("The title cannot be longer than 200 characters.");
 
        RuleFor(x => x.Description)
            .MaximumLength(5000)
                .WithMessage("The description cannot be longer than 5000 characters.")
            .When(x => x.Description is not null);
 
        RuleFor(x => x.Location)
            .MaximumLength(200)
                .WithMessage("The location cannot be longer than 200 characters.")
            .When(x => x.Location is not null);
 
        RuleFor(x => x.Category)
            .MaximumLength(60)
                .WithMessage("The category cannot be longer than 60 characters.")
            .When(x => x.Category is not null);
 
        RuleFor(x => x.Url)
            .MaximumLength(500)
                .WithMessage("The URL cannot be longer than 500 characters.")
            .Must(url => Uri.TryCreate(url, UriKind.Absolute, out var result)
                         && (result.Scheme == Uri.UriSchemeHttp || result.Scheme == Uri.UriSchemeHttps))
                .WithMessage("The URL must be a valid HTTP or HTTPS URL.")
            .When(x => !string.IsNullOrWhiteSpace(x.Url));
 
        RuleFor(x => x.StartsAt)
            .NotEmpty()
                .WithMessage("The start time is required.")
            .GreaterThan(DateTime.UtcNow)
                .WithMessage("The event must start in the future.");
 
        RuleFor(x => x.EndsAt)
            .GreaterThan(x => x.StartsAt)
                .WithMessage("The end time must be after the start time.")
            .When(x => x.EndsAt is not null);
 
        RuleFor(x => x.Capacity)
            .InclusiveBetween(1, 100000)
                .WithMessage("The capacity must be between 1 and 100,000.");
    }
}
 
public class UpdateEventRequestValidator : AbstractValidator<UpdateEventRequest>
{
    public UpdateEventRequestValidator()
    {
 
        RuleFor(x => x.Title)
            .MaximumLength(200)
                .WithMessage("The title cannot be longer than 200 characters.")
            .NotEmpty()
                .WithMessage("The title is required.")
            .When(x => x.Title is not null);
 
        RuleFor(x => x.Description)
            .MaximumLength(5000)
                .WithMessage("The description cannot be longer than 5000 characters.")
            .When(x => x.Description is not null);
 
        RuleFor(x => x.Location)
            .MaximumLength(200)
                .WithMessage("The location cannot be longer than 200 characters.")
            .When(x => x.Location is not null);
 
        RuleFor(x => x.Category)
            .MaximumLength(60)
                .WithMessage("The category cannot be longer than 60 characters.")
            .When(x => x.Category is not null);
 
        RuleFor(x => x.Url)
            .MaximumLength(500)
                .WithMessage("The URL cannot be longer than 500 characters.")
            .Must(url => Uri.TryCreate(url, UriKind.Absolute, out var result)
                         && (result.Scheme == Uri.UriSchemeHttp || result.Scheme == Uri.UriSchemeHttps))
                .WithMessage("The URL must be a valid HTTP or HTTPS URL.")
            .When(x => !string.IsNullOrWhiteSpace(x.Url));
 
        RuleFor(x => x.StartsAt)
            .GreaterThan(DateTime.UtcNow)
                .WithMessage("The event must start in the future.")
            .When(x => x.StartsAt is not null);
 
        RuleFor(x => x.EndsAt)
            .GreaterThan(x => x.StartsAt!.Value)
                .WithMessage("The end time must be after the start time.")
            .When(x => x.EndsAt is not null && x.StartsAt is not null);
 
        RuleFor(x => x.Capacity)
            .InclusiveBetween(1, 100000)
                .WithMessage("The capacity must be between 1 and 100,000.")
            .When(x => x.Capacity is not null);
    }
}