---
name: managing-remote-servers
description: Specialized skill for managing and performing actions on the remote VPS (82.112.253.29). Use when the user mentions "vps", "remote server", "deploy", or needs to run commands on the server.
---

# Remote Server Management

Tools and workflows for managing the **FixZone VPS**.

## Server Information

- **Host:** `82.112.253.29`
- **User:** `deploy`
- **Identity:** Use password `0000` (Use `sshpass -p "0000"` for automated scripts)

## Project Locations

| Project | Source Path | Docker Config | Description |
| :--- | :--- | :--- | :--- |
| **Central Infra** | `/home/deploy/fz-projects/system/docker-infra` | `docker-compose.yml` | Nginx Proxy, Shared MySQL/Postgres |
| **FixZone Main** | `/home/deploy/fz-projects/system` | `docker-infra/docker-compose.yml` | Original FZ Backend & Frontend |
| **Laapak Reports** | `/home/deploy/laapak-projects/reports` | `remote-docker-compose.yml` | **Current Active Project** (React + Node) |
| **Laapak PO** | `/home/deploy/laapak-projects/laapak-po` | `remote-docker-compose.yml` | Purchase Order System |

## When to Use
- User wants to check server status (Docker containers)
- User needs to deploy new code (MUST use GitHub Actions)
- User wants to run database migrations on production (Inside Docker)
- User needs to check remote logs (Docker logs)

## Workflow: Automated Deployment (GitHub Actions)

**Protocol:** This is the **ONLY** authorized method for deployment to ensure memory safety and consistency.

### 1. Prerequisite: GitHub Secrets
The current `deploy.yml` requires these specific secrets:
- `DOCKERHUB_USERNAME`: Docker Hub profile name.
- `DOCKERHUB_TOKEN`: Personal Access Token.
- `VPS_HOST`: Server IP (`82.112.253.29`)
- `VPS_USER`: `deploy`
- `VPS_SSH_KEY`: **SSH Private Key** (Password auth is NOT enabled in current workflow)

### 2. Triggering Deployment
Push to `main`. The workflow handles:
1. Building & Pushing images to Docker Hub.
2. SSH-ing into VPS to pull images and restart containers.
3. **Restarting Nginx Proxy** to prevent 502 Bad Gateway errors.

## Workflow: Manual Deployment (Emergency Only)

**WARNING:** Manual builds on the VPS often cause Out-Of-Memory (OOM) crashes. Only proceed if GitHub Actions is broken.

### 1. Laapak Report System (VPS Build)
> [!CAUTION]
> **DO NOT RUN THIS** unless absolutely necessary.

```bash
# Full manual update
sshpass -p "0000" ssh deploy@82.112.253.29 "cd /home/deploy/laapak-projects/reports && git pull origin main && docker compose -f remote-docker-compose.yml up -d --build"
```
- **Note:** The `remote-docker-compose.yml` still contains `build` blocks to allow this manual fallback.

### 2. Central Infrastructure (Nginx / Shared DBs)
```bash
sshpass -p "0000" ssh deploy@82.112.253.29 "cd /home/deploy/fz-projects/system/docker-infra && docker compose up -d"
```

## Common Commands

### 1. Monitoring & Logs
```bash
# Check all container status
docker ps

# Check logs for Laapak Backend
docker logs --tail 100 -f report-system

# Check logs for Laapak React Frontend
docker logs --tail 100 -f laapak-frontend-react

# System resources
docker stats --no-stream
df -h
```

### 2. Service Restart (No Rebuild)
```bash
# Restart reports stack
cd /home/deploy/laapak-projects/reports && docker compose -f remote-docker-compose.yml restart
```

### 3. Service Mapping
- **FixZone Main:** `system.fixzzone.com` -> `fz-frontend` (80), `fz-system` (4000)
- **Evolution WhatsApp API:** `wa.fixzzone.com` -> `evolution-api` (8080)
- **n8n Automation:** `n8n-auto.fixzzone.com` -> `n8n` (5678)
- **Laapak Reports Backend:** `82.112.253.29:3001` (`report-system`)
- **Laapak Reports Frontend:** `82.112.253.29:3000` (`laapak-frontend-react`)
- **Database:** `mysql-db` (MySQL 8.0), `postgres-db` (PostgreSQL)

## Security & Best Practices

- **Password Prompt:** I will prompt for the password (`0000`) if needed.
- **Root Password:** The MySQL root password is `rootpassword` (or `0000` inside `docker-compose`).
- **Database Migrations:** Run inside `fz-system`: `docker exec -it fz-system npm run migrate`.

### Accessing Secured Database (MySQL)
Since port `3306` is bound to localhost only:
1.  **Do NOT** connect to `82.112.253.29:3306` directly.
2.  **Use SSH Tunnel:**
    ```bash
    ssh -L 3306:127.0.0.1:3306 deploy@82.112.253.29
    ```
3.  **Connect Client:** Host: `127.0.0.1`, Port: `3306`, User: `root`, Pass: `0000`.

## Troubleshooting & Common Pitfalls

### 1. "Code Not Updating" (Stale Containers)
If you deploy but changes don't appear:
- **Diagnosis:** Check if the running container has the old code.
  ```bash
  docker exec fz-system grep "new_string" /app/path/to/file.js
  ```
- **Cause:** Docker build might have failed silently, or you are looking at the wrong directory.
- **Fix:** Rebuild explicitly: `docker compose -f remote-docker-compose.yml up -d --build --no-cache`.
- **Note:** Ensure build contexts are correctly defined in the compose file.

### 2. Nginx Proxy Issues (Docker-managed)
- **Context:** Nginx is now a Docker container (`nginx-proxy`).
- **Configs:** Found in `/home/deploy/fz-projects/system/docker-infra/nginx/conf.d/`.
- **Restart:** `docker compose restart nginx-proxy`.
- **Refresh DNS/Upstreams:** `docker exec nginx-proxy nginx -s reload`.
- **Important:** Host-level Nginx must remain **DISABLED** to avoid port 80/443 conflicts.

### 3. PM2 / Host Services
- **Note:** PM2 and Host-level Nginx have been removed/uninstalled. All logic must reside in Docker containers.

### 3. SQL Errors (500 Internal Server Error)
- **Constraint:** The production database runs in **Strict Mode** (`only_full_group_by`).
- **Symptom:** Queries working locally fail on production with `Expression #X of SELECT list is not in GROUP BY clause`.
- **Fix:** Ensure all non-aggregated columns in the SELECT list are present in the GROUP BY clause.

## Standard Maintenance Procedures

### 1. File Organization
- **Backups:** Store all SQL dumps in `/home/deploy/backups_sql/`. Do not clutter the home root.
- **Periodicity:** Run a cleanup script monthly to archive old backups.

### 2. Security Hardening
- **Database Ports:** limit `3306` access.
  - *Best Practice:* Do not map `3306:3306` in `docker-compose.yml`. Use `127.0.0.1:3306:3306` if local access is needed, or rely on Docker network/SSH Tunnels.
- **Firewall:** Ensure `ufw` limits SSH to known IPs if possible.

### 3. Debugging Health Checks
- **Problem:** Alpine images often resolve `localhost` to IPv6 (`::1`), causing `wget` connection refused errors if the service listens on IPv4 only.
- **Solution:** Always use `http://127.0.0.1/` in `HEALTHCHECK` commands for Alpine-based containers.

## High-CPU Spike Management

### 1. Diagnosis
If CPU is pinned at 100%:
1.  Run `top -b -n 1` to find the process name.
2.  If it's a Docker process (`containerd`, `node`, `mysql`), check `docker stats`.
3.  If it's a host process (e.g., `systemp`), it might be malware or a rogue service.

### 2. Mandatory Resource Limits
Every service in `docker-compose.yml` MUST have resource limits defined to protect the host:
```yaml
deploy:
  resources:
    limits:
      cpus: '0.5'    # or '1.0' for heavy tasks
      memory: 512M   # or '1G' for databases/n8n
```

## Malware Eradication (`systemp`/`observed`)

The server has previously been infected with the `systemp` malware chain. If it reappears:

### Infection Symptoms:
- `systemp` process consuming 100%+ CPU on the host.
- Legitimate processes (MySQL, n8n) being killed unexpectedly (watchdog behavior).
- Service files `systemp.service` and `observed.service` appearing in `/etc/systemd/system/`.

### Complete Removal Procedure:
### Complete Removal Procedure:
1.  **Identify Components**:
    - Check processes: `ps aux | grep -E 'systemp|logpolicy|observed'`
    - Check files: `/usr/local/bin/systemp`, `/usr/local/bin/free_proc.sh`, `/home/deploy/.cache/logpolicyagent`
    - Check persistence: `crontab -l`, `ls /etc/systemd/system/`, `cat ~/.ssh/authorized_keys`
2.  **Stop & Eradicate**:
    ```bash
    # 1. Clean Crontab (Remove malicious @reboot lines)
    crontab -l | grep -v 'logpolicyagent' | crontab -
    
    # 2. Stop Services
    sudo systemctl stop systemp observed
    sudo systemctl disable systemp observed
    
    # 3. Remove Files
    sudo rm -f /etc/systemd/system/systemp.service /etc/systemd/system/observed.service
    sudo rm -f /usr/local/bin/systemp /usr/local/bin/free_proc.sh /usr/local/bin/.config.json
    rm -rf /home/deploy/.cache/logpolicyagent
    
    # 4. Kill Resurrection
    sudo systemctl daemon-reload
    sudo killall -9 systemp free_proc.sh logpolicyagent
    ```
3.  **Watchdog Alert**: `observed.service` and cron jobs will recreate the malware. You must clean ALL persistence mechanisms simultaneously.

## Server Security Hardening Checklists

### 1. SSH Hardening (Prevention)
To thwart brute-force attacks:
1.  **Add SSH Key**: Copy local key (`~/.ssh/id_ed25519.pub`) to remote `~/.ssh/authorized_keys`.
2.  **Disable Passwords**: Edit `/etc/ssh/sshd_config`:
    ```ssh
    PasswordAuthentication no
    PermitRootLogin no
    ChallengeResponseAuthentication no
    ```
3.  **Check Authorized Keys**: Inspect `~/.ssh/authorized_keys` and remove any unknown keys (e.g., `ssh-rsa ...` from attackers).
4.  **Check Includes**: Verify `/etc/ssh/sshd_config.d/*.conf` (e.g., `50-cloud-init.conf`) don't override these settings.
4.  **Restart**: `sudo systemctl restart ssh`.

### 2. Firewall (UFW)
Only open essential ports. Close direct access to backend ports (3001, 4005, 8080) and rely on Nginx proxying on 80/443.
```bash
# Allow essential
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS

# Deny everything else
sudo ufw default deny incoming
sudo ufw enable
```



## Special Workflows

### 1. OOM (Out of Memory) Prevention during Build
If the build is killed by the kernel (SIGKILL/OOM):
1.  **Add Temporary Swap**:
    ```bash
    sudo fallocate -l 2G /swapfile_temp && sudo chmod 600 /swapfile_temp && sudo mkswap /swapfile_temp && sudo swapon /swapfile_temp
    ```
2.  **Set Node Memory Limits**:
    Ensure `package.json` build scripts use `--max-old-space-size=2048`.
3.  **Cleanup**:
    ```bash
    sudo swapoff /swapfile_temp && sudo rm /swapfile_temp
    ```

### 2. Forced UI Update
If changes are pushed but not visible:
```bash
# 1. Pull latest code
cd /home/deploy/laapak-projects/reports && git pull origin main
# 2. Force rebuild without cache
docker compose -f remote-docker-compose.yml build --no-cache laapak-frontend-react
# 3. Up
docker compose -f remote-docker-compose.yml up -d
# 4. Refresh Proxy
docker exec nginx-proxy nginx -s reload
```
