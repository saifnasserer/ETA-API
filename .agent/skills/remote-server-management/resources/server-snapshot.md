# Remote Server Snapshot (Feb 3, 2026)

## System Overview
- **Host:** `82.112.253.29`
- **Identity:** `deploy`
- **Environment:** Full Docker Architecture (PM2 and Host-Nginx Removed)

## Docker Services & Port Mapping

| Service Name | Container Name | Internal Port | External Visibility |
|--------------|----------------|---------------|---------------------|
| `fz-frontend` | `fz-frontend` | 80 | `system.fixzzone.com` |
| `fz-system` | `fz-system` | 4000 | `system.fixzzone.com/api` |
| `evolution-api` | `evolution-api` | 8080 | `wa.fixzzone.com` |
| `n8n` | `n8n` | 5678 | `n8n-auto.fixzzone.com` |
| `report-system` | `report-system` | 3001 | `reports.laapak.com` |
| `laapak-po` | `laapak-po` | 3002 | `po.laapak.com` |
| `inventory-system` | `inventory-system` | 4005 | `4005` (Custom) |
| `nginx-proxy` | `nginx-proxy` | 80 / 443 | GLOBAL Entry Point |
| `mysql-db` | `mysql-db` | 3306 | `127.0.0.1:3306` (Secured) |
| `postgres-db` | `postgres-db` | 5432 | Internal only |
| `redis` | `redis` | 6379 | Internal only |

## Infrastructure Components
| Service | Details |
|---------|---------|
| **Docker Compose** | Path: `/home/deploy/fz-projects/system/docker-infra/docker-compose.yml` |
| **Nginx (Docker)** | Configs: `/home/deploy/fz-projects/system/docker-infra/nginx/conf.d/*.conf` |
| **SSL** | Host `/etc/letsencrypt` mounted to container `/etc/letsencrypt` (ReadOnly). |
| **Database** | MySQL 8.0 (Container) uses persistent volume `mysql_data`. |
| **Cleanup** | **PM2 UNINSTALLED**, **Host-Nginx DISABLED**. |

## Project Root Layout (`/home/deploy/fz-projects/system`)
- `docker-infra/` - Central management for all containers and proxy configs.
- `backend/` - Source for `fz-system`.
- `frontend/react-app/` - Source for `fz-frontend`.
- `laapak-projects/` - Source for reports and PO systems.

## Maintenance Notes
- **Logs:** `docker compose logs -f <service>` from the `docker-infra` directory.
- **Proxy Change:** Edit files in `nginx/conf.d/` and run `docker compose restart nginx-proxy`.
