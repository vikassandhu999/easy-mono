# Developer Handoff - Easy Backend Deployment

**Last Updated**: 2025-12-01  
**Status**: Ready for deployment to Digital Ocean  
**Target Environment**: 1GB Digital Ocean Droplet

---

## Project Overview

**Easy Backend** is a Phoenix/Elixir coaching platform that provides:
- Passwordless authentication (OTP via email)
- Multi-tenant architecture (business-scoped data)
- Coach and client management
- Training plans, nutrition plans, recipes
- RESTful API for frontend applications

**Tech Stack:**
- Elixir 1.15.7 / OTP 26.2.1
- Phoenix Framework 1.8+
- PostgreSQL 16
- Docker + Docker Compose for deployment
- Nginx as reverse proxy

---

## What Has Been Done

### 1. **Deployment Solution Created**

A streamlined Docker Compose deployment optimized for 1GB Digital Ocean droplets has been implemented:

**Key Files:**
- [`docker-compose.yml`](file:///Users/vikassandhu/Desktop/10x/easy-backend/docker-compose.yml) - Orchestrates PostgreSQL, App, and Nginx
- [`Dockerfile`](file:///Users/vikassandhu/Desktop/10x/easy-backend/Dockerfile) - Multi-stage build for Elixir release
- [`run.sh`](file:///Users/vikassandhu/Desktop/10x/easy-backend/run.sh) - Startup script that runs migrations then starts app
- [`deploy.sh`](file:///Users/vikassandhu/Desktop/10x/easy-backend/deploy.sh) - Initial deployment script
- [`scripts/update.sh`](file:///Users/vikassandhu/Desktop/10x/easy-backend/scripts/update.sh) - Update/redeploy script
- [`scripts/backup.sh`](file:///Users/vikassandhu/Desktop/10x/easy-backend/scripts/backup.sh) - Database backup script

### 2. **Memory Optimization**

Configured for 1GB RAM with conservative limits:
- PostgreSQL: 256M max, 128M reserved
- Phoenix App: 450M max, 200M reserved  
- Nginx: ~50M
- System overhead: ~244M buffer

This prevents out-of-memory errors that were previously occurring.

### 3. **SSL Configuration**

Nginx configured to use existing Let's Encrypt certificates:
- Certificates mounted from `/etc/letsencrypt`
- Domain: `api.coacheasy.app`
- HTTPS redirect enabled
- HSTS enabled for security
- ACME challenge support for certificate renewal

### 4. **Automated Migrations**

Migrations now run automatically during app startup via `run.sh`:
- No separate migration container needed
- Saves memory (no second Erlang VM)
- Gracefully handles already-applied migrations

### 5. **Documentation**

Complete deployment documentation created:
- [`docs/DEPLOYMENT.md`](file:///Users/vikassandhu/Desktop/10x/easy-backend/docs/DEPLOYMENT.md) - Comprehensive deployment guide
- [`.agent/workflows/deploy.md`](file:///Users/vikassandhu/Desktop/10x/easy-backend/.agent/workflows/deploy.md) - Quick deployment workflow
- [`docs/deployment_walkthrough.md`](file:///Users/vikassandhu/Desktop/10x/easy-backend/docs/deployment_walkthrough.md) - Detailed walkthrough

### 6. **Cleanup Completed**

Removed obsolete files from previous deployment attempts:
- Deleted overlay scripts (`rel/overlays/bin/migrate`, `rel/overlays/bin/server`)
- Removed SSL generation scripts (using real certs)
- Removed committed SSH keys (security fix)
- Updated `.gitignore` to prevent secret commits
- Updated `mix.exs` to remove overlay references

---

## Current State

### ✅ Ready to Deploy

The codebase is **production-ready** for deployment to Digital Ocean.

**Environment:**
- Target: 1GB Digital Ocean Droplet
- Domain: `api.coacheasy.app`
- SSL: Let's Encrypt certificates already generated via certbot
- Database: PostgreSQL in Docker (not managed)

**Prerequisites on Droplet:**
- Docker installed
- Docker Compose V2 installed
- SSL certificates at `/etc/letsencrypt/live/api.coacheasy.app/`
- Firewall allows ports 22 (SSH), 80 (HTTP), 443 (HTTPS)
- DNS pointing to droplet IP

### 🔧 Configuration Files

**Environment Variables** (`.env` on droplet):
```bash
# Database
POSTGRES_USER=easy
POSTGRES_PASSWORD=<secure password>
POSTGRES_DB=easy_prod

# Secrets
SECRET_KEY_BASE=<generate with: openssl rand -base64 64>
JWT_SECRET=<generate with: openssl rand -base64 48>

# Domain
PHX_HOST=api.coacheasy.app

# Email (Postmark)
MAILER_ADAPTER=postmark
POSTMARK_API_KEY=<your key>

# Frontend URLs
APP_URL=https://api.coacheasy.app
FRONTEND_URL=https://app.coacheasy.app
CLIENT_FRONTEND_URL=https://client.coacheasy.app
```

Use [`.env.production`](file:///Users/vikassandhu/Desktop/10x/easy-backend/.env.production) as template.

---

## How to Deploy

### Initial Deployment

1. **SSH into droplet:**
   ```bash
   ssh root@<droplet-ip>
   ```

2. **Clone repository:**
   ```bash
   cd /opt
   git clone <repo-url> easy-backend
   cd easy-backend
   ```

3. **Configure environment:**
   ```bash
   cp .env.production .env
   nano .env  # Edit all values marked CHANGE_ME
   ```

4. **Verify SSL certificate domain matches:**
   ```bash
   ls -la /etc/letsencrypt/live/api.coacheasy.app/
   ```
   
   If domain is different, update `nginx/conf.d/default.conf` lines 38-39.

5. **Deploy:**
   ```bash
   sudo ./deploy.sh
   ```

6. **Verify:**
   ```bash
   docker compose ps
   docker compose logs -f app
   curl https://api.coacheasy.app/health
   ```

### Subsequent Updates

```bash
cd /opt/easy-backend
git pull
sudo ./scripts/update.sh
```

### Database Backups

```bash
# Manual backup
sudo ./scripts/backup.sh

# Set up daily cron (2 AM)
sudo crontab -e
# Add: 0 2 * * * /opt/easy-backend/scripts/backup.sh
```

---

## What Needs to Be Done

### Immediate (Before First Deploy)

1. **Generate Production Secrets**
   - [ ] Generate `SECRET_KEY_BASE` with `openssl rand -base64 64`
   - [ ] Generate `JWT_SECRET` with `openssl rand -base64 48`
   - [ ] Set secure `POSTGRES_PASSWORD`
   - [ ] Configure email service API key

2. **Verify Infrastructure**
   - [ ] Confirm droplet has Docker + Docker Compose V2
   - [ ] Verify SSL certificates exist and are valid
   - [ ] Check DNS is pointing to droplet
   - [ ] Ensure firewall rules are configured

3. **First Deployment**
   - [ ] Run `./deploy.sh` on droplet
   - [ ] Verify health endpoint responds
   - [ ] Test authentication flow (OTP email)
   - [ ] Create first admin/coach user

### Short-term (Within First Week)

1. **Monitoring & Observability**
   - [ ] Set up uptime monitoring (UptimeRobot, Pingdom, etc.)
   - [ ] Configure log aggregation if needed
   - [ ] Set up alerts for service downtime
   - [ ] Monitor memory/CPU usage patterns

2. **Backup Strategy**
   - [ ] Configure automated backups (cron job)
   - [ ] Test backup restoration procedure
   - [ ] Consider Digital Ocean Spaces for backup storage

3. **Performance Tuning**
   - [ ] Monitor database query performance
   - [ ] Adjust `POOL_SIZE` if needed (currently 5)
   - [ ] Review Erlang VM settings based on actual usage
   - [ ] Consider adding swap if not already present

### Medium-term (Within First Month)

1. **Security Hardening**
   - [ ] Review and restrict firewall rules
   - [ ] Set up fail2ban for SSH protection
   - [ ] Implement rate limiting at nginx level if needed
   - [ ] Regular security updates for Docker images

2. **Operational Excellence**
   - [ ] Document runbook for common issues
   - [ ] Create rollback procedure
   - [ ] Set up healthcheck alerts
   - [ ] Establish maintenance windows

3. **Scaling Considerations**
   - [ ] Monitor when 1GB RAM becomes insufficient
   - [ ] Plan migration to 2GB or 4GB droplet
   - [ ] Consider managed PostgreSQL if database grows
   - [ ] Evaluate CDN for static assets

---

## Important Technical Details

### Memory Management

The 1GB droplet configuration is **tight but functional**:
- ERL_FLAGS in `docker-compose.yml` constrain Erlang VM
- Database pool size limited to 5 connections
- Memory limits enforced via Docker Compose

**Warning Signs of Memory Issues:**
- High swap usage
- OOM killer messages in logs
- Slow response times
- Container restarts

**Solution:** Upgrade to 2GB droplet (~$12/month).

### Database Migrations

Migrations run automatically on every app start via `run.sh`:
```bash
/app/bin/easy eval "Easy.Release.migrate"
```

This is idempotent - safe to run multiple times.

**Manual migration** (if needed):
```bash
docker compose exec app /app/bin/easy eval "Easy.Release.migrate"
```

### SSL Certificate Renewal

Certificates auto-renew via certbot. To manually renew:
```bash
sudo certbot renew
docker compose restart nginx
```

ACME challenges work through nginx at `/.well-known/acme-challenge/`.

### Service Architecture

```
Client (HTTPS) 
    ↓
Nginx (port 443) - SSL termination, reverse proxy
    ↓
Phoenix App (port 4000) - Elixir/Phoenix application
    ↓
PostgreSQL (port 5432) - Database (internal only)
```

---

## Troubleshooting

### App Won't Start

```bash
# Check logs
docker compose logs app

# Common issues:
# - Missing env vars: Check .env file
# - DB connection: Wait for DB health check
# - Port conflict: Check if port 4000 is in use
```

### Out of Memory

```bash
# Check memory
free -h
docker stats

# Solutions:
# 1. Restart services: docker compose restart
# 2. Add swap space
# 3. Upgrade to 2GB droplet
```

### Deployment Failed

```bash
# View build logs
docker compose build

# Clean rebuild
docker compose down
docker system prune -a
sudo ./deploy.sh
```

### Health Check Fails

```bash
# Test from inside droplet
curl http://localhost:4000/health

# Test external
curl https://api.coacheasy.app/health

# Check nginx
docker compose logs nginx
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Service orchestration |
| `Dockerfile` | Application build |
| `run.sh` | Startup script (migrations + server) |
| `deploy.sh` | Initial deployment |
| `scripts/update.sh` | Redeploy with new code |
| `scripts/backup.sh` | Database backup |
| `.env.production` | Environment template |
| `nginx/conf.d/default.conf` | Nginx reverse proxy config |
| `config/runtime.exs` | Runtime configuration |
| `lib/easy/release.ex` | Migration helpers |
| `rel/vm.args.eex` | Erlang VM arguments |

---

## Useful Commands

```bash
# View logs
docker compose logs -f app
docker compose logs -f db
docker compose logs nginx

# Restart services
docker compose restart app
docker compose restart db
docker compose restart nginx

# Check resource usage
docker stats
free -h
df -h

# Access database
docker compose exec db psql -U easy -d easy_prod

# Run interactive Elixir console
docker compose exec app /app/bin/easy remote

# Stop all services
docker compose down

# Full cleanup (destroys data!)
docker compose down -v
```

---

## Contact & Resources

- **Repository**: [GitHub URL]
- **Production URL**: https://api.coacheasy.app
- **Frontend Apps**: 
  - Coach app: https://app.coacheasy.app
  - Client app: https://client.coacheasy.app

**Documentation:**
- [DEPLOYMENT.md](file:///Users/vikassandhu/Desktop/10x/easy-backend/docs/DEPLOYMENT.md) - Full deployment guide
- [CONFIGURATION.md](file:///Users/vikassandhu/Desktop/10x/easy-backend/docs/CONFIGURATION.md) - Configuration reference
- [API_STRUCTURE.md](file:///Users/vikassandhu/Desktop/10x/easy-backend/docs/API_STRUCTURE.md) - API documentation

---

## Questions to Ask

Before proceeding, clarify:

1. **Access**: Do you have SSH access to the droplet?
2. **Credentials**: Do you have database and email service credentials?
3. **Monitoring**: What monitoring/alerting system should be used?
4. **Backup Storage**: Where should backups be stored long-term?
5. **Scaling Plan**: At what point should we upgrade from 1GB droplet?
6. **Support**: Who handles after-hours incidents?

---

**Good luck with the deployment! 🚀**

*If you run into issues, check the logs first, then refer to the troubleshooting section in DEPLOYMENT.md.*
