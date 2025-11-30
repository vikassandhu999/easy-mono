# Digital Ocean Deployment Guide

Quick and simple guide to deploy Easy Backend to a 1GB Digital Ocean droplet.

## Prerequisites

- Digital Ocean droplet (1GB RAM minimum)
- Domain name pointed to your droplet
- SSL certificates from Let's Encrypt (already generated via certbot)
- SSH access to your droplet

## Quick Start

### 1. Clone Repository on Droplet

```bash
cd /opt
git clone https://github.com/yourusername/easy-backend.git
cd easy-backend
```

### 2. Set Up Environment

```bash
# Copy and edit production environment
cp .env.production .env
nano .env
```

**Critical variables to set:**
- `POSTGRES_PASSWORD` - Secure database password
- `SECRET_KEY_BASE` - Generate with: `openssl rand -base64 64`
- `JWT_SECRET` - Generate with: `openssl rand -base64 48`
- `PHX_HOST` - Your domain name
- `POSTMARK_API_KEY` - Your email service API key

### 3. Update Nginx SSL Configuration

Edit `nginx/conf.d/default.conf` and replace `yourdomain.com` with your actual domain:

```nginx
ssl_certificate /etc/nginx/ssl/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/nginx/ssl/live/yourdomain.com/privkey.pem;
```

### 4. Deploy

```bash
sudo ./deploy.sh
```

The deployment script will:
- ✓ Validate environment variables  
- ✓ Build Docker images
- ✓ Start services (database, app, nginx)
- ✓ Run migrations automatically
- ✓ Verify application health

### 5. Verify Deployment

```bash
# Check running containers
docker compose ps

# View logs
docker compose logs -f app

# Check health endpoint
curl https://yourdomain.com/health
```

## Updating

When you have new code to deploy:

```bash
sudo ./scripts/update.sh
```

## Backups

Set up automated daily backups:

```bash
# Manual backup
sudo ./scripts/backup.sh

# Set up daily cron job
sudo crontab -e

# Add this line for daily 2 AM backups:
0 2 * * * /opt/easy-backend/scripts/backup.sh
```

## Monitoring

### View Logs
```bash
# All services
docker compose logs -f

# Just app
docker compose logs -f app

# Database
docker compose logs -f db
```

### Resource Usage
```bash
# Real-time stats
docker stats

# Disk usage
df -h

# PostgreSQL stats
docker compose exec db psql -U easy -d easy_prod -c "SELECT * FROM pg_stat_database WHERE datname = 'easy_prod';"
```

## Troubleshooting

### App Won't Start

**Check logs:**
```bash
docker compose logs app
```

**Common issues:**
- Missing environment variables → Check `.env` file
- Database connection failed → Verify `DATABASE_URL` and wait for db to be healthy
- Port already in use → Stop conflicting service or change port

### Out of Memory

**Check memory usage:**
```bash
free -h
docker stats
```

**Solutions:**
- Add swap space (if not already done)
- Restart services: `docker compose restart`
- Reduce Erlang VM settings in docker compose.yml

### Database Migration Failed

**Run manually:**
```bash
docker compose exec app /app/bin/easy eval "Easy.Release.migrate"
```

### SSL Certificate Issues

**Verify certificate paths:**
```bash
ls -la /etc/letsencrypt/live/yourdomain.com/
```

**Renew certificates:**
```bash
sudo certbot renew
docker compose restart nginx
```

## Maintenance

### Restart Services
```bash
# All services
docker compose restart

# Just app
docker compose restart app

# Just database
docker compose restart db
```

### Stop Services
```bash
docker compose down
```

### Full Reset (⚠️ Destroys data)
```bash
docker compose down -v
sudo ./deploy.sh
```

### Clean Up Docker
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune
```

## Security Checklist

- ✓ Change default passwords in `.env`
- ✓ Use strong `SECRET_KEY_BASE` and `JWT_SECRET`
- ✓ Database port not exposed externally (only internal Docker network)
- ✓ HTTPS enabled with valid SSL certificates
- ✓ HSTS header enabled
- ✓ Regular backups configured
- ✓ Keep Docker and system packages updated

## Performance Tips for 1GB Droplet

1. **Monitor memory regularly** - Run `free -h` and `docker stats`
2. **Keep connection pool small** - POOL_SIZE=5 is optimal
3. **Regular cleanup** - Remove old Docker images monthly
4. **Database maintenance** - Run VACUUM weekly
5. **Log rotation** - Configure logrotate for nginx/app logs

## Scaling Up

If you need more resources:

1. **Resize droplet** in Digital Ocean dashboard
2. **Update docker compose memory limits** to utilize new RAM
3. **Increase POOL_SIZE** for more database connections
4. **Restart services**: `docker compose restart`

## Support

- Check logs first: `docker compose logs -f`
- Review environment variables: `.env` file
- Verify SSL certificates are valid
- Ensure domain DNS is pointing to droplet
- Check firewall allows ports 80, 443
