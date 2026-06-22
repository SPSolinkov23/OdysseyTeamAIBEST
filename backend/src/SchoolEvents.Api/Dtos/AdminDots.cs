using SchoolEvents.Data.Entities;

namespace SchoolEvents.Api.Dtos;

public class PendingOrganizerDto
{
    public long Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class PendingOrganizersResponse
{
    public IReadOnlyList<PendingOrganizerDto> PendingOrganizers { get; set; } = Array.Empty<PendingOrganizerDto>();
}

public class OrganizerDecisionResult
{
    public long Id { get; set; }
    public OrganizerStatus OrganizerStatus { get; set; }
}