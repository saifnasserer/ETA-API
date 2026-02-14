---
description: Deploying Laapak Reports System to remote VPS
---

# Deployment Workflow

**Standard Protocol:** ALWAYS use **GitHub Actions** for deployment. Manual deployments are strictly forbidden unless the CI pipeline is verified broken.

## 1. Automated Deployment (Standard)
Trigger a deployment by pushing to `main`:

```bash
git add .
git commit -m "feat: description of changes"
git push origin main
```

**What happens:**
1. GitHub builds and pushes Docker images.
2. VPS pulls new images and restarts containers.
3. **Auto-Restart:** Nginx proxy is restarted to refresh upstreams (prevents 502 errors).

### Required GitHub Secrets
Ensure these match your `deploy.yml`:
- `VPS_HOST`: Server IP (`82.112.253.29`)
- `VPS_USER`: SSH Username (`deploy`)
- `VPS_SSH_KEY`: **Private SSH Key** content (Pem format)

## 2. Manual Trigger (GitHub UI)
If you need to redeploy without changes:
1. Go to **Actions** tab in GitHub.
2. Select **Build and Deploy**.
3. Click **Run workflow**.

## 3. Emergency Manual Fallback
**ONLY** use if GitHub Actions is completely down.
If GitHub Actions is failing, you can still manually trigger a build on the VPS.

// turbo
```bash
sshpass -p "0000" ssh -o StrictHostKeyChecking=no deploy@82.112.253.29 "cd /home/deploy/laapak-projects/reports && git pull origin main && docker compose -f remote-docker-compose.yml up -d --build"
```

## 3. Handle Memory Issues (Optional)
If the build fails with a `SIGKILL` or OOM error during the frontend build:

### a. Add Temporary Swap
// turbo
```bash
sshpass -p "0000" ssh -t -o StrictHostKeyChecking=no deploy@82.112.253.29 "echo '0000' | sudo -S fallocate -l 2G /swapfile_temp && echo '0000' | sudo -S chmod 600 /swapfile_temp && echo '0000' | sudo -S mkswap /swapfile_temp && echo '0000' | sudo -S swapon /swapfile_temp"
```

### b. Retry Deployment
Once swap is added, run the deployment command again (Step 2).

### c. Remove Temporary Swap
// turbo
```bash
sshpass -p "0000" ssh -t -o StrictHostKeyChecking=no deploy@82.112.253.29 "echo '0000' | sudo -S swapoff /swapfile_temp && echo '0000' | sudo -S rm /swapfile_temp"
```

## 4. Forced Refresh (Optional)
If changes are pushed but not live, force a clean rebuild and reload the proxy.

// turbo
```bash
sshpass -p "0000" ssh -o StrictHostKeyChecking=no deploy@82.112.253.29 "cd /home/deploy/laapak-projects/reports && docker compose -f remote-docker-compose.yml build --no-cache laapak-frontend-react && docker compose -f remote-docker-compose.yml up -d && docker exec nginx-proxy nginx -s reload"
```

## 5. Verification
Check the status of the containers and logs.

// turbo
```bash
sshpass -p "0000" ssh -o StrictHostKeyChecking=no deploy@82.112.253.29 "docker ps && docker logs --tail 20 laapak-frontend-react && docker logs --tail 20 report-system"
```
