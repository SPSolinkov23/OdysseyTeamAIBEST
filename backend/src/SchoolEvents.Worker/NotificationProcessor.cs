using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SchoolEvents.Data;
using SchoolEvents.Data.Entities;
using SchoolEvents.Data.Notifications;
using SchoolEvents.Worker.Email;
using SchoolEvents.Worker.Options;

namespace SchoolEvents.Worker;

public class NotificationProcessor
{
    private readonly SchoolEventsDbContext _db;
    private readonly IEmailSender _email;
    private readonly WorkerOptions _options;
    private readonly ILogger<NotificationProcessor> _logger;
    private readonly string _workerId = $"{Environment.MachineName}:{Environment.ProcessId}";

    public NotificationProcessor(
        SchoolEventsDbContext db,
        IEmailSender email,
        IOptions<WorkerOptions> options,
        ILogger<NotificationProcessor> logger)
    {
        _db = db;
        _email = email;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<int> RunOnceAsync(CancellationToken ct)
    {
        var claimed = await ClaimBatchAsync(ct);
        foreach (var job in claimed)
            await ProcessAsync(job, ct);

        return claimed.Count;
    }

    private async Task<List<NotificationJob>> ClaimBatchAsync(CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var staleBefore = now.AddSeconds(-_options.StaleProcessingSeconds);
        var batchSize = Math.Clamp(_options.BatchSize, 1, 200);

        await using var tx = await _db.Database.BeginTransactionAsync(ct);

        var sql =
            $@"SELECT * FROM notification_jobs
               WHERE (status = 'Pending' AND available_at <= {{0}})
                  OR (status = 'Processing' AND locked_at IS NOT NULL AND locked_at < {{1}})
               ORDER BY id
               LIMIT {batchSize}
               FOR UPDATE SKIP LOCKED";

        var jobs = await _db.NotificationJobs.FromSqlRaw(sql, now, staleBefore).ToListAsync(ct);
        if (jobs.Count == 0)
        {
            await tx.CommitAsync(ct);
            return jobs;
        }

        foreach (var job in jobs)
        {
            job.Status = JobStatus.Processing;
            job.LockedAt = now;
            job.LockedBy = _workerId;
        }

        await _db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        _logger.LogInformation("Claimed {Count} job(s)", jobs.Count);
        return jobs;
    }

    private async Task ProcessAsync(NotificationJob job, CancellationToken ct)
    {
        try
        {
            var payload = NotificationJson.Deserialize(job.Payload);
            var idempotencyKey = $"job:{job.Id}";

            var alreadyDelivered = await _db.NotificationLogs.AnyAsync(l => l.IdempotencyKey == idempotencyKey, ct);
            if (!alreadyDelivered)
            {
                var (subject, body) = EmailTemplates.Build(job.Type, payload);
                await _email.SendAsync(payload.Email, payload.Name, subject, body, ct);

                _db.NotificationLogs.Add(new NotificationLog
                {
                    JobId = job.Id,
                    Channel = "email",
                    Recipient = payload.Email,
                    Subject = subject,
                    Status = "sent",
                    IdempotencyKey = idempotencyKey,
                });
            }
            else
            {
                _logger.LogInformation("Job {Id} already delivered; skipping send (idempotent)", job.Id);
            }

            job.Status = JobStatus.Sent;
            job.LastError = null;
            job.LockedAt = null;
            job.LockedBy = null;
            await _db.SaveChangesAsync(ct);

            _logger.LogInformation("Job {Id} ({Type}) delivered", job.Id, job.Type);
        }
        catch (Exception ex)
        {
            job.Attempts += 1;
            job.LastError = ex.Message;
            job.LockedAt = null;
            job.LockedBy = null;

            if (job.Attempts >= job.MaxAttempts)
            {
                job.Status = JobStatus.Failed;
                _logger.LogError(ex, "Job {Id} ({Type}) permanently failed after {Attempts} attempt(s)", job.Id, job.Type, job.Attempts);
            }
            else
            {
                var delaySeconds = _options.BaseRetryDelaySeconds * Math.Pow(2, job.Attempts - 1);
                job.Status = JobStatus.Pending;
                job.AvailableAt = DateTime.UtcNow.AddSeconds(delaySeconds);
                _logger.LogWarning("Job {Id} ({Type}) failed (attempt {Attempts}); retrying in {Delay}s", job.Id, job.Type, job.Attempts, delaySeconds);
            }

            await _db.SaveChangesAsync(ct);
        }
    }
}
