namespace SchoolEvents.Worker.Options;

public class WorkerOptions
{
    public const string SectionName = "Worker";

    public int PollIntervalSeconds { get; set; } = 3;

    public int BatchSize { get; set; } = 20;

    public int BaseRetryDelaySeconds { get; set; } = 10;

    public int StaleProcessingSeconds { get; set; } = 300;
}