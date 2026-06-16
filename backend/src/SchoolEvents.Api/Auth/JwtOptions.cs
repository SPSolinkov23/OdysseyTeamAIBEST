namespace SchoolEvents.Api.Auth;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "school-events";
    public string Audience { get; set; } = "school-events";
    public string Secret { get; set; } = string.Empty;
    public int ExpiresMinutes { get; set; } = 720;
}
