namespace SchoolEvents.Worker.Email;

public interface IEmailSender
{
    Task SendAsync(string toEmail, string toName, string subject, string body, CancellationToken ct);
}
