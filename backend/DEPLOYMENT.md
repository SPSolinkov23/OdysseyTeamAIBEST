# Deploying to Ubuntu with aaPanel (Nginx + MySQL + .NET 8)

This guide hosts the C# stack on one Ubuntu server:

- **MySQL 8** — installed via **aaPanel** (App Store)
- **Nginx** — installed via **aaPanel**, used as a reverse proxy (+ TLS)
- **ASP.NET Core API** — runs under **systemd** (Kestrel on `127.0.0.1:5080`), also serves the UI
- **.NET Worker** — runs under **systemd** (drains the notification queue)

```text
Cloudflare (optional, proxied + TLS at edge)
        │  https://events.example.com
        ▼
Nginx (aaPanel, :80/:443)  ──reverse proxy──►  Kestrel 127.0.0.1:5080
                                                   │  (SchoolEvents.Api + wwwroot UI)
  systemd: schoolevents-api    ─────────────┐
  systemd: schoolevents-worker ─────────────┘ share ─► MySQL 127.0.0.1:3306 (aaPanel)
```

> Replace `events.example.com` with your domain. Your server IP from earlier was `135.181.238.55`; the deploy path is `/var/www/school-events`. Run commands as a sudo-capable user. `$` = shell, `sql>` = inside MySQL.

The deployment artifacts referenced below live in `deploy/`:
- `deploy/schoolevents-api.service`, `deploy/schoolevents-worker.service` — systemd units
- `deploy/publish.sh` — builds & publishes both apps into `/var/www/school-events`
- `src/SchoolEvents.Api/appsettings.Production.example.json`, `src/SchoolEvents.Worker/appsettings.Production.example.json` — config templates

---

## 1. Install aaPanel

SSH into the server and run the official installer (Ubuntu):

```bash
$ wget -O install.sh https://www.aapanel.com/script/install_6.0_en.sh
$ sudo bash install.sh aapanel
```

At the end it prints the **panel URL, username, and password** — save them. Open the panel URL in your browser and log in. On first login it offers a recommended stack; you can pick **Nginx** there or install it in the next step.

> Open the panel port (default `8888`) and HTTP/HTTPS in any cloud firewall. aaPanel also manages the local UFW/iptables rules for you.

---

## 2. Install Nginx + MySQL via aaPanel

In the panel:

1. **App Store** (left menu) → **Nginx** → **Install** (pick a recent 1.2x build).
2. **App Store** → **MySQL** → **Install** → choose **8.0**. (The app targets MySQL 8.)
3. Wait for both to show **Running** under **App Store → Installed**.

aaPanel stores the MySQL **root** password under **Databases → (gear/Root password)** if you need it later.

---

## 3. Create the database + app user (aaPanel)

In **Databases → Add database**:

- **Database name:** `school_events`
- **Username:** `schoolevents`
- **Password:** generate a strong one — **save it**, you'll paste it into the systemd units.
- **Access permission:** `Local server (127.0.0.1)` is enough (the app runs on the same box).

That's equivalent to:

```sql
sql> CREATE DATABASE school_events CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
sql> CREATE USER 'schoolevents'@'127.0.0.1' IDENTIFIED BY 'YOUR_DB_PASSWORD';
sql> GRANT ALL PRIVILEGES ON school_events.* TO 'schoolevents'@'127.0.0.1';
sql> FLUSH PRIVILEGES;
```

You don't need to create any tables — the API **auto-applies EF Core migrations on startup**.

> phpMyAdmin/Adminer is available from **Databases → manage** if you want to inspect tables later.

---

## 4. Install the .NET 8 runtime

aaPanel doesn't manage .NET, so install Microsoft's package. On Ubuntu 22.04/24.04:

```bash
$ sudo apt-get update
$ sudo apt-get install -y dotnet-sdk-8.0      # SDK so we can publish on the server
$ dotnet --info                                # confirm 8.x, and note the path
$ which dotnet                                 # usually /usr/bin/dotnet
```

If `apt` can't find it, add Microsoft's feed first:

```bash
$ wget https://packages.microsoft.com/config/ubuntu/$(. /etc/os-release; echo $VERSION_ID)/packages-microsoft-prod.deb -O /tmp/ms.deb
$ sudo dpkg -i /tmp/ms.deb && sudo apt-get update
$ sudo apt-get install -y dotnet-sdk-8.0
```

> Only the **ASP.NET Core Runtime 8** is required to *run* the app (`aspnetcore-runtime-8.0`). Install the **SDK** if you want to build/publish on the server (recommended, used by `publish.sh`).

---

## 5. Get the code + publish

Put the repo on the server (git clone or `scp` the `project/` folder), then publish:

```bash
$ cd /opt        # or wherever you keep source
$ git clone <your-repo> school-events-src   # OR scp the project/ folder here
$ cd school-events-src/project              # the folder containing SchoolEvents.sln
$ sudo bash deploy/publish.sh               # publishes to /var/www/school-events/{api,worker}
```

`publish.sh` runs `dotnet publish -c Release` for both projects and sets ownership to `www-data`. The API publish output includes the `wwwroot` UI automatically.

---

## 6. Configure secrets + install the services

Edit the two unit files in `deploy/` and set your real **DB password** and a long random **JWT secret**:

```bash
$ openssl rand -base64 48        # generate a JWT secret to paste in
$ nano deploy/schoolevents-api.service     # set ConnectionStrings__Default + Jwt__Secret
$ nano deploy/schoolevents-worker.service  # set ConnectionStrings__Default (+ SMTP if desired)
```

Install and start them:

```bash
$ sudo cp deploy/schoolevents-api.service deploy/schoolevents-worker.service /etc/systemd/system/
$ sudo systemctl daemon-reload
$ sudo systemctl enable --now schoolevents-api schoolevents-worker
$ systemctl status schoolevents-api --no-pager
$ curl -s http://127.0.0.1:5080/health        # -> {"status":"ok"}
$ curl -s http://127.0.0.1:5080/health/ready   # -> {"status":"ready"} (DB reachable)
```

Tail logs anytime with:

```bash
$ journalctl -u schoolevents-api -f
$ journalctl -u schoolevents-worker -f
```

> **Prefer a file over env vars?** Instead of the `Environment=` lines, copy `appsettings.Production.example.json` to `appsettings.Production.json` inside `/var/www/school-events/api` (and `/worker`), fill it in, and `chown www-data`. The systemd unit already sets `ASPNETCORE_ENVIRONMENT=Production` so it'll be picked up.

---

## 7. Point your domain + reverse proxy (aaPanel)

1. **DNS:** add an **A** record for `events.example.com` → your server IP (`135.181.238.55`). If you use Cloudflare, you can leave it **Proxied**.
2. In aaPanel: **Website → Add site**, domain `events.example.com`, **PHP version: Pure static / no PHP**.
3. Open the new site → **Reverse proxy → Add reverse proxy**:
   - **Target URL:** `http://127.0.0.1:5080`
   - **Send domain:** `$host`
   - Save. aaPanel writes the `proxy_pass` + WebSocket/headers config for you.

If you prefer to hand-edit Nginx (site conf under **Website → conf**), the proxy block is simply:

```nginx
location / {
    proxy_pass http://127.0.0.1:5080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection keep-alive;
}
```

---

## 8. Enable HTTPS

- **Origin Let's Encrypt (aaPanel):** open the site → **SSL → Let's Encrypt** → select the domain → **Apply**. Turn on **Force HTTPS**.
- **With Cloudflare in front:** set Cloudflare **SSL/TLS → Full (strict)** and either use the aaPanel Let's Encrypt cert above or install a **Cloudflare Origin Certificate** (site → SSL → Other certificate, paste cert + key).

Visit **https://events.example.com** — you should see the login page.

---

## 9. Create your first organizer

Production seeding is **off**, so create an organizer once. Easiest: temporarily allow organizer signup, register, then turn it back off.

```bash
# 1) allow organizer signup, restart
$ sudo systemctl set-environment ...   # (or edit the unit) set Auth__AllowOrganizerSignup=true
$ sudo nano /etc/systemd/system/schoolevents-api.service   # add: Environment=Auth__AllowOrganizerSignup=true
$ sudo systemctl daemon-reload && sudo systemctl restart schoolevents-api

# 2) register an organizer via the API
$ curl -s -X POST https://events.example.com/auth/register \
    -H 'Content-Type: application/json' \
    -d '{"display_name":"Admin","email":"admin@yourschool.edu","password":"AStrongPassw0rd!","role":"organizer"}'

# 3) remove the AllowOrganizerSignup line, daemon-reload + restart again
```

Alternatively, insert a row directly in MySQL with a BCrypt hash.

---

## 10. Updating later (redeploy)

```bash
$ cd /opt/school-events-src && git pull
$ cd project && sudo bash deploy/publish.sh
$ sudo systemctl restart schoolevents-api schoolevents-worker
```

Migrations run automatically on API restart.

---

## Email / SMTP in production

The worker sends real mail when `Smtp__Enabled=true`. Set the SMTP env vars in `deploy/schoolevents-worker.service` (host, port, user, password, from) and restart the worker. With `Enabled=false` it stays in **log-only** mode (visible in `journalctl -u schoolevents-worker`) — handy until your mail credentials are ready. See `README.md → Email / SMTP configuration` for provider examples.

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| `502 Bad Gateway` from Nginx | Is the API up? `systemctl status schoolevents-api`; `curl 127.0.0.1:5080/health`. |
| API won't start, exits immediately | `journalctl -u schoolevents-api -n 50`. Usually a bad connection string or missing `Jwt:Secret`. |
| `/health/ready` returns 503 | MySQL unreachable / wrong password / user lacks rights on `school_events`. |
| `Authentication ... caching_sha2_password` errors | Keep `AllowPublicKeyRetrieval=True` in the connection string (already set in the templates). |
| UI loads but API calls 404 | Reverse proxy target must be the **root** `/` → `http://127.0.0.1:5080` (the API serves both UI and `/auth`, `/events`, ... at the same origin). |
| Permission denied reading files | `sudo chown -R www-data:www-data /var/www/school-events`. |
