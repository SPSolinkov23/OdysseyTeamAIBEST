# School Events & Notification Center

A small full-stack system where **organizers** publish capacity-limited events and **students** register. If an event is full, students join a **FIFO waitlist**; when a confirmed seat is freed, the next person is **promoted automatically**. Every important change is recorded as a **domain event** and pushed onto a **queue**, which a **separate worker process** turns into an email — so the HTTP request stays fast.

The stack is **C# end-to-end** with a clean producer/consumer split:

| Component | Tech | Role |
|-----------|------|------|
| `src/SchoolEvents.Api/` | **C# / ASP.NET Core 8 + EF Core 8** | HTTP REST API — the **producer** (enqueues jobs). Also serves the UI. |
| `src/SchoolEvents.Api/wwwroot/` | **HTML + vanilla JS + Tailwind CSS** (CDN) | Student & organizer UI (single-page app) |
| `src/SchoolEvents.Worker/` | **C# / .NET 8** (`BackgroundService`) | Background **consumer** — drains the queue and sends email |
| `src/SchoolEvents.Data/` | **EF Core 8** (entities, `DbContext`, migrations) | Shared data layer used by both the API and the worker |
| Database | **MySQL 8** | Users, events, registrations, **and the queue** |

The API and worker share **only the database** (via the `SchoolEvents.Data` project). That decoupling is the whole point: the queue is a table, the producer is one process, the consumer is another.

---

## Architecture at a glance

```text
              ┌──────────────────────┐   same origin    ┌───────────────────────┐
              │  Browser SPA          │ ◄──────────────► │  ASP.NET Core API     │
              │  wwwroot: HTML/JS/    │   HTTP / JSON     │  (SchoolEvents.Api)   │
              │  Tailwind (served by  │                   │  PRODUCER             │
              │  the API)             │                   └──────────┬────────────┘
              └──────────────────────┘                              │  in ONE transaction:
                                                                     │  1) change registration
                                                                     │  2) INSERT notification_jobs
                                                                     ▼
                                                          ┌───────────────────────┐
                                                          │  MySQL 8              │
                                                          │  users / events /     │
                                                          │  registrations /      │
                                                          │  notification_jobs ◄──┼── the QUEUE (outbox)
                                                          │  notification_logs    │
                                                          └──────────┬────────────┘
                                                                     │ poll: claim pending jobs
                                                                     │ (FOR UPDATE SKIP LOCKED)
                                                                     ▼
                                                          ┌───────────────────────┐
                                                          │  .NET Worker          │
                                                          │  (SchoolEvents.Worker)│──► SMTP email (MailKit)
                                                          │  retries + idempotency│──► notification_logs
                                                          └───────────────────────┘
```

---

## Prerequisites

- **.NET SDK 8.0** — `dotnet --version` should print `8.x`.
- **MySQL 8** — e.g. MySQL Server managed with **MySQL Workbench**, listening on `127.0.0.1:3306`.
- **Node.js 18+** — *optional*, only needed to run `smoke_test.mjs`. The app itself needs no Node.
- **EF Core CLI** — *optional* (the API auto-migrates on startup). Install with `dotnet tool install --global dotnet-ef` if you want to run migrations by hand.

> Tailwind is loaded from a **CDN** in `wwwroot/index.html`, so there is **no front-end build step** — no `npm install`, no bundler.

---

## First-time setup

### 1) Create the database and app user (once)

Run this in MySQL Workbench (or any MySQL client) as a privileged user:

```sql
CREATE DATABASE IF NOT EXISTS school_events CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'app'@'localhost' IDENTIFIED BY 'app_local_pw';
GRANT ALL PRIVILEGES ON school_events.* TO 'app'@'localhost';
FLUSH PRIVILEGES;
```

These match the default connection string used by the API and worker:

```text
Server=localhost;Port=3306;Database=school_events;User Id=app;Password=app_local_pw;AllowPublicKeyRetrieval=True;SslMode=None;
```

To use different credentials, override the connection string without editing code:

```powershell
# Runtime (API & worker read ConnectionStrings:Default)
$env:ConnectionStrings__Default = "Server=localhost;Port=3306;Database=school_events;User Id=me;Password=secret;..."

# Design-time (dotnet ef) reads SCHOOL_EVENTS_DB
$env:SCHOOL_EVENTS_DB = "Server=localhost;Port=3306;Database=school_events;User Id=me;Password=secret;..."
```

### 2) Restore packages

```powershell
cd project
dotnet restore
```

### 3) Schema & seed data

You don't have to do anything: on startup in **Development** the API **applies EF Core migrations** and **seeds** demo data automatically (`Seed:Enabled = true`).

To apply migrations manually instead:

```powershell
dotnet ef database update --project src/SchoolEvents.Data --startup-project src/SchoolEvents.Api
```

### Demo accounts (created by the seed)

| Role | Email | Password |
|------|-------|----------|
| Organizer | `organizer@school.edu` | `Organizer123!` |
| Student | `student@school.edu` | `Student123!` |

One seeded sample event has **capacity 2**, which makes the waitlist easy to demo.

---

## Running (two processes)

Open two terminals from the `project/` folder:

```powershell
# Terminal 1 — API + UI (producer). Serves both the REST API and the SPA.
dotnet run --project src/SchoolEvents.Api --launch-profile http   # http://localhost:5080

# Terminal 2 — Worker (consumer). Polls the queue, sends/logs email.
dotnet run --project src/SchoolEvents.Worker
```

Then open **http://localhost:5080** and sign in with a demo account. The UI, the JSON API, and the SPA fallback are all served from the same origin, so there is nothing else to start.

---

## The queue — how it works (transactional outbox)

The queue is the **`notification_jobs`** table. We use the **transactional outbox** pattern:

1. The controller validates input and checks auth/role.
2. A service opens **one DB transaction** (`BeginTransactionAsync`).
3. It changes business state (insert/update the registration, maybe promote a waitlister) — locking the event row with `SELECT … FOR UPDATE` so capacity is never exceeded.
4. **In the same transaction**, it adds row(s) to `notification_jobs` with a `type` + a JSON `payload`.
5. `COMMIT`.
6. Returns `201`/`200` immediately — **no email is sent on the request thread**.

Because the job and the business change commit together, you can never end up "registration confirmed but notification lost" (or vice-versa). See `src/SchoolEvents.Api/Services/RegistrationService.cs` and `EventService.cs`.

The **worker** (`src/SchoolEvents.Worker/NotificationWorker.cs`) is a separate process that loops, claiming a batch atomically so multiple workers never grab the same row:

```sql
-- MySQL 8: SKIP LOCKED lets concurrent consumers claim disjoint rows.
SELECT * FROM notification_jobs
WHERE (status = 'Pending'    AND available_at <= @now)
   OR (status = 'Processing' AND locked_at IS NOT NULL AND locked_at < @staleBefore)  -- reclaim stuck jobs
ORDER BY id
LIMIT @batchSize
FOR UPDATE SKIP LOCKED;
-- claimed rows are flipped to 'Processing' (locked_at / locked_by set) in the same transaction
```

**Why a DB table and not Redis/RabbitMQ?** It needs zero extra infrastructure, it's transactional with the business write, and it's the right approach at this scale. The producer/consumer boundary is already clean, so it would swap to Redis/RabbitMQ later without touching business logic.

---

## Async notifications

- **Payloads are assembled server-side from trusted DB records — never from client text.** The API services build a JSON payload (recipient name + email, event title/time/location, and any waitlist position) from authenticated database rows, so a student can never spoof an email for someone else. The worker renders the email purely from that payload (`src/SchoolEvents.Worker/Email/EmailTemplates.cs`).
- **Job types implemented (5, exceeds the required 3):** `RegistrationConfirmed`, `RegistrationWaitlisted`, `WaitlistPromoted`, `RegistrationCancelled`, `EventCancelled` — all end-to-end (API → queue → worker → email). See `JobTypes` in `src/SchoolEvents.Data/Entities/NotificationJob.cs`.
- **Reliability:** each job has a `status` (`Pending → Processing → Sent`/`Failed`), an `attempts` counter, a `max_attempts` cap (**default 5**), and a `last_error`. On failure the worker re-queues with **exponential back-off** (`available_at = now + base * 2^(attempts-1)`, `base = BaseRetryDelaySeconds`) until it gives up and marks the job `Failed`. Jobs stuck in `Processing` longer than `StaleProcessingSeconds` are reclaimed.
- **Idempotency (two guards):**
  1. `notification_jobs.idempotency_key` is **unique** → enqueuing the same logical job twice is a no-op.
  2. `notification_logs.idempotency_key` is **unique** (`job:{id}`) → before sending, the worker checks the log, so a retry never delivers the same email twice.
- **Persistent log:** `notification_logs` records every successful delivery (recipient, subject, channel, timestamp), proving delivery attempts.

### Email / SMTP configuration

The worker reads SMTP settings from `src/SchoolEvents.Worker/appsettings.json` (or environment variables). **Leave `Smtp.Enabled = false` for log-only mode** (emails are printed to the console and still written to `notification_logs`) — useful for development without credentials.

To send **real email**, set `Enabled` to `true` and fill in the `Smtp` section:

```jsonc
// src/SchoolEvents.Worker/appsettings.json
"Smtp": {
  "Enabled": true,
  "Host": "smtp.gmail.com",
  "Port": 587,
  "User": "you@gmail.com",
  "Password": "your-app-password",          // Gmail: use an App Password, not your login password
  "From": "School Events <you@gmail.com>",  // RFC 5322 From header
  "UseStartTls": true
}
```

```powershell
# ...or via env vars (no secrets in source control). Double underscore = nested key.
$env:Smtp__Enabled="true"
$env:Smtp__Host="smtp.gmail.com"
$env:Smtp__Port="587"
$env:Smtp__User="you@gmail.com"
$env:Smtp__Password="your-app-password"
$env:Smtp__From="School Events <you@gmail.com>"
dotnet run --project src/SchoolEvents.Worker
```

Common providers: **Gmail** (`smtp.gmail.com:587`, App Password required), **Outlook/Office365** (`smtp.office365.com:587`), or a transactional service like **SendGrid/Mailgun/Brevo** (use their SMTP host + API key as the password).

---

## REST API reference

Base URL: `http://localhost:5080`. All responses are JSON (snake_case). Errors use a consistent shape: `{ "error": { "code", "message" } }`.

### Auth
| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/auth/register` | Creates a **student** by default. Returns `{ token, expires_at, user }`. |
| `POST` | `/auth/login` | Returns `{ token, expires_at, user }` (JWT). |
| `POST` | `/auth/logout` | `204`. JWT is stateless — the client discards the token. |

### Events
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/events` | optional | Filters: `?status=`, `?q=`, `?mine=true`. Anonymous/students see published events; organizers can list their own. |
| `GET` | `/events/{id}` | optional | Details + counts. Drafts visible to the owner only. Includes the caller's `my_registration`. |
| `POST` | `/events` | organizer | Create a **draft**. |
| `PATCH` | `/events/{id}` | organizer (owner) | Edit event fields. |
| `POST` | `/events/{id}/publish` | organizer (owner) | DRAFT → PUBLISHED. |
| `POST` | `/events/{id}/cancel` | organizer (owner) | Cancels event + active registrations; enqueues `EventCancelled` for each attendee. |
| `GET` | `/events/{id}/registrations` | organizer (owner) | Confirmed list **and** ordered FIFO waitlist. |

### Registrations
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `POST` | `/events/{eventId}/registrations` | student | Register → confirmed or waitlisted; enqueues a job. |
| `GET` | `/registrations/me` | authed | Caller's own registrations + waitlist position. |
| `DELETE` | `/registrations/{id}` | owner | Cancel own registration; may auto-promote the next waitlister. |

### Profile, jobs, health
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` / `PATCH` | `/users/me` | authed | Read / update own profile (display name). |
| `GET` | `/notification-jobs` | organizer | Queue observability. Filters: `?event_id=`, `?status=`, `?limit=`. |
| `GET` | `/health`, `/health/ready` | public | Liveness / readiness (readiness runs `SELECT 1`). |

Interactive docs (Swagger UI) are available in Development at **http://localhost:5080/swagger**.

---

## Documented rules (decisions the spec asks you to make)

- **Organizer creation:** the public `/auth/register` creates **students**. Organizers are created by the seed; set `Auth:AllowOrganizerSignup = true` (default in Development) to allow API creation.
- **Cancel-registration rule:** a student may cancel their own registration **at any time**. If it was a confirmed seat, the earliest waitlister is promoted **in the same transaction**.
- **Event cancellation:** all active registrations are set to `cancelled` and each affected user gets one `EventCancelled` job (per-registration idempotency key).
- **Notification-jobs visibility:** only organizers can read the queue.

---

## Security

- **Passwords** are hashed with **BCrypt** (`BCrypt.Net-Next`) — slow, salted, one-way; never stored or reversibly encrypted. See `src/SchoolEvents.Api/Auth/PasswordHasher.cs`.
- **Input validation** via **DataAnnotations** on DTOs; a custom `InvalidModelStateResponseFactory` returns consistent `400`s. EF Core uses **parameterized SQL** everywhere (including the one raw `FOR UPDATE` query), so there's no SQL injection. The browser SPA escapes output (`esc()` helper), guarding against XSS.
- **Authentication** is **JWT (HS256)**; set a strong `Jwt:Secret` outside Development.
- **Authorization** is checked on every sensitive operation: role gates (`[Authorize(Roles = ...)]`) **and** ownership checks (event organizer, registration owner). Students can only ever see their own registrations.
- **CORS** is configurable via `Cors:Origins` (not needed by default since the UI is served same-origin by the API).

## Scalability & design notes

- **Stateless API + JWT** → horizontally scalable behind a load balancer (no server session affinity).
- **Connection pooling** is handled by MySqlConnector under EF Core, reusing DB connections across concurrent requests.
- **No overbooking under concurrency:** registration locks the event row (`SELECT … FOR UPDATE`), serialising concurrent registrations for the same event so capacity is never exceeded.
- **Queue scales independently:** the worker uses `FOR UPDATE SKIP LOCKED`, so you can run **multiple worker instances** for more throughput without double-sending.
- **Indexes** target the hot paths: listing events, counting/ordering registrations, and claiming jobs.

---

## Project structure

```text
project/
├── SchoolEvents.sln
├── src/
│   ├── SchoolEvents.Data/            # EF Core: shared data layer
│   │   ├── Entities/                 # User, Event, Registration, NotificationJob, NotificationLog, Enums
│   │   ├── Notifications/            # NotificationPayload + JSON helpers
│   │   ├── Migrations/               # InitialCreate
│   │   ├── SchoolEventsDbContext.cs  # mappings, snake_case, JSON column, timestamps
│   │   └── SchoolEventsDb.cs         # UseMySql provider config (shared by API + worker)
│   ├── SchoolEvents.Api/             # ASP.NET Core Web API (producer) + UI host
│   │   ├── Auth/                     # JWT options, PasswordHasher (BCrypt), TokenService
│   │   ├── Controllers/              # auth, events, registrations, users, notification-jobs, health
│   │   ├── Dtos/                     # request/response DTOs (snake_case contract)
│   │   ├── Infrastructure/           # ApiException, error-handling middleware, claims helpers
│   │   ├── Services/                 # EventService, RegistrationService (transactions + locking)
│   │   ├── wwwroot/                  # index.html + js/ (api, store, ui, app) — Tailwind via CDN
│   │   ├── SeedData.cs               # idempotent demo seed
│   │   └── Program.cs                # DI, auth, migrate+seed on startup, static files + SPA fallback
│   └── SchoolEvents.Worker/          # .NET worker (consumer)
│       ├── NotificationWorker.cs     # the polling loop (SKIP LOCKED, retries, idempotency)
│       ├── Email/                    # MailKit sender + templates (log-only fallback)
│       ├── Options/                  # Worker + SMTP options
│       └── Program.cs
├── smoke_test.mjs                    # end-to-end API test (see below)
└── README.md
```

## Testing

`smoke_test.mjs` runs a full end-to-end check against the running API (RBAC, create/publish, confirmed/waitlist, overbooking guard, cancel → auto-promotion, ownership, and all required job types). Point it at the API port with the `BASE` env var:

```powershell
# with the API running (Node only needed for this script):
$env:BASE = "http://localhost:5080"
node smoke_test.mjs
```
