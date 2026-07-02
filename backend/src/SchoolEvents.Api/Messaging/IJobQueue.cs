namespace SchoolEvents.Api.Messaging;

public interface IJobQueue
{
    void NotifyJobReady();
}
