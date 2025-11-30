---
description: Deploy to Digital Ocean
---

# Deploy to Digital Ocean

Follow these steps to deploy Easy Backend to Digital Ocean.

## Initial Deployment

1. **SSH into your droplet**
   ```bash
   ssh root@your-droplet-ip
   ```

2. **Clone repository**
   ```bash
   cd /opt
   git clone <your-repo-url> easy-backend
   cd easy-backend
   ```

3. **Configure environment**
   ```bash
   cp .env.production .env
   nano .env  # Edit all CHANGE_ME values
   ```

4. **Update nginx SSL paths**
   Edit `nginx/conf.d/default.conf` - replace `api.coacheasy.app` with your domain.

// turbo
5. **Deploy**
   ```bash
   sudo ./deploy.sh
   ```

6. **Verify**
   ```bash
   curl https://api.coacheasy.app/health
   ```

## Update/Redeploy

1. **SSH into droplet**
   ```bash
   ssh root@your-droplet-ip
   cd /opt/easy-backend
   ```

// turbo
2. **Update**
   ```bash
   sudo ./scripts/update.sh
   ```

## Backup Database

// turbo
```bash
sudo ./scripts/backup.sh
```

Set up daily backups with cron:
```bash
sudo crontab -e
# Add: 0 2 * * * /opt/easy-backend/scripts/backup.sh
```

## View Logs

// turbo
```bash
docker compose logs -f app
```

## Restart Services

// turbo
```bash
docker compose restart app
```
