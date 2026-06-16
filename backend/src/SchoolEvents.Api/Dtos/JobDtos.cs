using SchoolEvents.Data.Entities;

namespace SchoolEvents.Api.Dtos;

public class JobDto
{
    public long Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public JobStatus Status { get; set; }
    public int Attempts { get; set; }
    public int MaxAttempts { get; set; }
    public DateTime AvailableAt { get; set; }
    public long? EventId { get; set; }
    public string? LastError { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class JobListResponse
{
    public IReadOnlyList<JobDto> Jobs { get; set; } = Array.Empty<JobDto>();
}
