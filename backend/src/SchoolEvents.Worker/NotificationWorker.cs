using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SchoolEvents.Data;
using SchoolEvents.Data.Entities;
using SchoolEvents.Data.Notifications;
using SchoolEvents.Worker.Email;
using SchoolEvents.Worker.Options;

namespace SchoolEvents.Worker;

/// <summary>
/// Polls the <c>notification_jobs</c> queue, claiming a batch with
/// <c>FOR UPDATE SKIP LOCKED</c> so multiple workers never grab the same row.
/// Delivery is idempotent (guarded by <c>notification_logs</c>) and failures are
/// retried with exponential back-off up to <c>max_attempts</c>.
/// </summary>
public class NotificationWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IEmailSender _email;
    private readonly WorkerOptions _options;
    private readonly ILogger<NotificationWorker> _logger;
    private readonly string _workerId = $"{Environment.MachineName}:{Environment.ProcessId}";

    public NotificationWorker(
        IServiceScopeFactory scopeFactory,
        IEmailSender email,
        IOptions<WorkerOptions> options,
        ILogger<NotificationWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _email = email;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Notification worker started as {WorkerId}", _workerId);

        while (!stoppingToken.IsCancellationRequested)
        {
            var processed = 0;
            try
            {
                processed = await PollOnceAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Worker poll failed; will retry after the poll interval");
            }

            // Only sleep when the queue was empty; otherwise drain it as fast as we can.
            if (processed == 0)
            {
                try { await Task.Delay(TimeSpan.FromSeconds(_options.PollIntervalSeconds), stoppingToken); }
                catch (OperationCanceledException) { break; }
            }
        }

        _logger.LogInformation("Notification worker stopping");
    }

    private async Task<int> PollOnceAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SchoolEventsDbContext>();

        var claimed = await ClaimBatchAsync(db, ct);
        foreach (var job in claimed)
            await ProcessAsync(db, job, ct);

        return claimed.Count;
    }

    private async Task<List<NotificationJob>> ClaimBatchAsync(SchoolEventsDbContext db, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var staleBefore = now.AddSeconds(-_options.StaleProcessingSeconds);
        var batchSize = Math.Clamp(_options.BatchSize, 1, 200);

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        // batchSize is an internal int (clamped), so it is safe to inline into the SQL;
        // the timestamps are passed as real parameters.
        var sql =
            $@"SELECT * FROM notification_jobs
               WHERE (status = 'Pending' AND available_at <= {{0}})
                  OR (status = 'Processing' AND locked_at IS NOT NULL AND locked_at < {{1}})
               ORDER BY id
               LIMIT {batchSize}
               FOR UPDATE SKIP LOCKED";

        var jobs = await db.NotificationJobs.FromSqlRaw(sql, now, staleBefore).ToListAsync(ct);
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

        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        _logger.LogInformation("Claimed {Count} job(s)", jobs.Count);
        return jobs;
    }

    private async Task ProcessAsync(SchoolEventsDbContext db, NotificationJob job, CancellationToken ct)
    {
        try
        {
            var payload = NotificationJson.Deserialize(job.Payload);
            var idempotencyKey = $"job:{job.Id}";

            // Delivery-level idempotency: a retried job must not email the same person twice.
            var alreadyDelivered = await db.NotificationLogs.AnyAsync(l => l.IdempotencyKey == idempotencyKey, ct);
            if (!alreadyDelivered)
            {
                var (subject, body) = EmailTemplates.Build(job.Type, payload);
                await _email.SendAsync(payload.Email, payload.Name, subject, body, ct);

                db.NotificationLogs.Add(new NotificationLog
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
            await db.SaveChangesAsync(ct);

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

            await db.SaveChangesAsync(ct);
        }
    }
}
