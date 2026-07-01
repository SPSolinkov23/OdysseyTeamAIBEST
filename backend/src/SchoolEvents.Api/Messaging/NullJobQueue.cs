namespace SchoolEvents.Api.Messaging;

public class NullJobQueue : IJobQueue
{
    public void NotifyJobReady()
    {
    }
}
