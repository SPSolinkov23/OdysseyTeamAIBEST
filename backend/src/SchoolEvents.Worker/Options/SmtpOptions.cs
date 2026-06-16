namespace SchoolEvents.Worker.Options;

public class SmtpOptions
{
    public const string SectionName = "Smtp";

    /// <summary>When false, emails are written to the log instead of sent (great for dev).</summary>
    public bool Enabled { get; set; }

    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string User { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;

    /// <summary>RFC 5322 from header, e.g. "School Events &lt;no-reply@school.edu&gt;".</summary>
    public string From { get; set; } = "School Events <no-reply@localhost>";

    public bool UseStartTls { get; set; } = true;
}
