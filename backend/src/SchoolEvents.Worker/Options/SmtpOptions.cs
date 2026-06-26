namespace SchoolEvents.Worker.Options;

public class SmtpOptions
{
    public const string SectionName = "Smtp";

    public bool Enabled { get; set; }

    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string User { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;

    public string From { get; set; } = "School Events <no-reply@localhost>";

    public bool UseStartTls { get; set; } = true;
}
