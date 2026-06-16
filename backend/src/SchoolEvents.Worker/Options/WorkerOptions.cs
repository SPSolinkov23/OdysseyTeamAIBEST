namespace SchoolEvents.Worker.Options;

public class WorkerOptions
{
    public const string SectionName = "Worker";

    /// <summary>How often to poll the queue when it was empty.</summary>
    public int PollIntervalSeconds { get; set; } = 3;

    /// <summary>Max jobs claimed per poll.</summary>
    public int BatchSize { get; set; } = 20;

    /// <summary>Base for exponential back-off between retries.</summary>
    public int BaseRetryDelaySeconds { get; set; } = 10;

    /// <summary>A job stuck in "processing" longer than this is considered abandoned and reclaimed.</summary>
    public int StaleProcessingSeconds { get; set; } = 300;
}
