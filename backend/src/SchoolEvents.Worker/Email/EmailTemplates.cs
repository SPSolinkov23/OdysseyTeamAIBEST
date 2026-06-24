using System.Globalization;
using SchoolEvents.Data.Entities;
using SchoolEvents.Data.Notifications;

namespace SchoolEvents.Worker.Email;

public static class EmailTemplates
{
    public static (string Subject, string Body) Build(string jobType, NotificationPayload p)
    {
        var when = p.EventStartsAt.ToString("dddd, MMM d, yyyy 'at' h:mm tt 'UTC'", CultureInfo.InvariantCulture);
        var where = string.IsNullOrWhiteSpace(p.EventLocation) ? "" : $"\nLocation: {p.EventLocation}";

        return jobType switch
        {

            JobTypes.OrganizerApproved => (
                "Your organizer request was approved",
                $"Hi {p.Name},\n\nGood news! Your request to become an organizer has been approved. "
                + "You can now create and manage events.\n\n— School Events"),

            JobTypes.OrganizerRejected => (
                "Your organizer request was declined",
                $"Hi {p.Name},\n\nYour request to become an organizer has been declined. "
                + "Your account stays as a student account and you can keep registering for events.\n\n— School Events"),

            JobTypes.AccountWelcome => (
                "Welcome to School Events",
                $"Hi {p.Name},\n\nYour School Events account has been created successfully. "
                + "You can now browse upcoming events and register for the ones you like.\n\n"
                + "See you there!\n— School Events"),

            JobTypes.RegistrationConfirmed => (
                $"You're confirmed for {p.EventTitle}",
                $"Hi {p.Name},\n\nYour spot for \"{p.EventTitle}\" is confirmed.\nWhen: {when}{where}\n\nSee you there!\n— School Events"),

            JobTypes.RegistrationWaitlisted => (
                $"You're on the waitlist for {p.EventTitle}",
                $"Hi {p.Name},\n\n\"{p.EventTitle}\" is currently full, so you've been added to the waitlist"
                + (p.WaitlistPosition is int pos ? $" at position #{pos}" : "")
                + $".\nWhen: {when}{where}\n\nWe'll email you automatically if a seat opens up.\n— School Events"),

            JobTypes.WaitlistPromoted => (
                $"A seat opened up — you're confirmed for {p.EventTitle}",
                $"Hi {p.Name},\n\nGood news! A seat opened up and you've been moved from the waitlist to confirmed for \"{p.EventTitle}\".\nWhen: {when}{where}\n\nSee you there!\n— School Events"),

            JobTypes.RegistrationCancelled => (
                $"Your registration for {p.EventTitle} was cancelled",
                $"Hi {p.Name},\n\nYour registration for \"{p.EventTitle}\" has been cancelled.\n\nIf this was a mistake you can sign up again from the events page.\n— School Events"),

            JobTypes.EventCancelled => (
                $"\"{p.EventTitle}\" has been cancelled",
                $"Hi {p.Name},\n\nWe're sorry to let you know that \"{p.EventTitle}\" (scheduled for {when}) has been cancelled by the organizer.\n\n— School Events"),

            _ => (
                $"Update about {p.EventTitle}",
                $"Hi {p.Name},\n\nThere's an update about \"{p.EventTitle}\".\n— School Events"),
        };
    }
}
