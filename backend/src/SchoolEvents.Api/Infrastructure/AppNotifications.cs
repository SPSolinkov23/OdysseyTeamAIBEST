using SchoolEvents.Data.Entities;

namespace SchoolEvents.Api.Infrastructure;

/// <summary>
/// Builds in-app <see cref="Notification"/> rows with user-facing (Bulgarian) copy
/// that mirrors the email templates and the original client wording.
/// </summary>
public static class AppNotifications
{
    public static Notification Build(long userId, string type, long eventId, string eventTitle, int? waitlistPosition = null)
    {
        var message = type switch
        {
            JobTypes.RegistrationConfirmed =>
                $"Your registration for \u201c{eventTitle}\u201d is confirmed.",
            JobTypes.RegistrationWaitlisted when waitlistPosition is not null =>
                $"You're on the waitlist for \u201c{eventTitle}\u201d (position {waitlistPosition}).",
            JobTypes.RegistrationWaitlisted =>
                $"You're on the waitlist for \u201c{eventTitle}\u201d.",
            JobTypes.WaitlistPromoted =>
                $"A spot opened up! Your registration for \u201c{eventTitle}\u201d is now confirmed.",
            JobTypes.RegistrationCancelled =>
                $"You cancelled your registration for \u201c{eventTitle}\u201d.",
            JobTypes.EventCancelled =>
                $"An event you registered for was cancelled: \u201c{eventTitle}\u201d.",
            _ => eventTitle,
        };

        return new Notification
        {
            UserId = userId,
            Type = type,
            EventId = eventId,
            Message = message,
            IsRead = false,
        };
    }

    /// <summary>The one-off greeting shown to a freshly registered student.</summary>
    public static Notification Welcome(long userId, string name) => new()
    {
        UserId = userId,
        Type = JobTypes.AccountWelcome,
        EventId = null,
        Message = $"Welcome, {name}! Your account is ready. Browse the upcoming events.",
        IsRead = false,
    };

    public static Notification OrganizerPending(long userId) => new()
    {
        UserId = userId,
        Type = JobTypes.OrganizerPending,
        EventId = null,
        Message = "You've applied to become an organizer. Your request is pending approval from an administrator.",
        IsRead = false,
    };
}
