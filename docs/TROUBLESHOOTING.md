# Troubleshooting Guide

Common issues and solutions for Lumina deployment and usage.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Setup Wizard Problems](#setup-wizard-problems)
- [Login & Authentication](#login--authentication)
- [Calendar Integration](#calendar-integration)
- [WooCommerce Integration](#woocommerce-integration)
- [Database Issues](#database-issues)
- [Docker Problems](#docker-problems)
- [Performance Issues](#performance-issues)
- [Network & Connectivity](#network--connectivity)

## Installation Issues

### Docker Compose Fails to Start

**Symptoms:**
```
Error response from daemon: Conflict. The container name "/lumina-backend" is already in use
```

**Solution:**
```bash
# Stop and remove existing containers
docker compose down

# Remove containers and volumes
docker compose down -v

# Restart fresh
docker compose up -d
```

### Port Already in Use

**Symptoms:**
```
Error starting userland proxy: listen tcp4 0.0.0.0:3000: bind: address already in use
```

**Solution:**
```bash
# Find what's using the port
sudo lsof -i :3000
sudo lsof -i :3001

# Kill the process or change Lumina's port
# Edit docker-compose.yml:
services:
  frontend:
    ports:
      - "8080:80"  # Change 3000 to 8080
```

### Permission Denied Errors

**Symptoms:**
```
EACCES: permission denied, open '/app/data/lumina.db'
```

**Solution:**
```bash
# Fix ownership of data directory
sudo chown -R $USER:$USER backend/data

# Ensure directory exists
mkdir -p backend/data

# Restart containers
docker compose restart
```

### Docker Images Won't Build (Raspberry Pi)

**Symptoms:**
```
no matching manifest for linux/arm64/v8
```

**Solution:**
```bash
# Ensure you're using the latest Docker
sudo apt update && sudo apt upgrade docker.io

# Pull pre-built images instead of building
docker compose pull
docker compose up -d
```

## Setup Wizard Problems

### Setup Wizard Not Appearing

**Symptoms:**
- Browser shows login page instead of setup wizard
- "Welcome to Lumina" screen doesn't appear

**Causes & Solutions:**

1. **Database Already Exists**
   ```bash
   # Check if database exists
   ls -la backend/data/lumina.db

   # If it exists, reset to factory settings
   ./reset-database.sh

   # Or manually:
   docker compose down
   rm backend/data/lumina.db
   docker compose up -d
   ```

2. **Setup Endpoint Not Responding**
   ```bash
   # Check backend logs
   docker logs lumina-backend

   # Test setup endpoint
   curl http://localhost:3001/api/v1/setup/status

   # Should return: {"setupNeeded": true}
   ```

### Setup Wizard Stuck on Step

**Symptoms:**
- Wizard doesn't advance after clicking "Next"
- Error message appears but wizard doesn't proceed

**Solution:**
```bash
# Check browser console (F12) for errors
# Common issues:

# 1. API not reachable
curl http://localhost:3001/health

# 2. CORS errors - check frontend .env
REACT_APP_API_URL=http://localhost:3001/api/v1

# 3. Backend errors
docker logs lumina-backend
```

### "Email Already Exists" Error

**Symptoms:**
- Cannot create admin account in setup wizard
- Error: "A user with this email already exists"

**Solution:**
```bash
# The database already has data - reset it
docker compose down
rm backend/data/lumina.db
docker compose up -d

# Refresh browser and start setup again
```

## Login & Authentication

### Cannot Login - "Invalid credentials"

**Symptoms:**
- Correct password doesn't work
- Just completed setup but can't login

**Solutions:**

1. **Check Caps Lock**
   - Passwords are case-sensitive

2. **Reset Password**
   ```bash
   # Connect to database
   sqlite3 backend/data/lumina.db

   # Check user exists
   SELECT email, first_name FROM users;

   # If needed, reset via database
   # (Better to use password reset feature when implemented)
   ```

3. **Clear Browser Cache**
   ```bash
   # Clear localStorage
   # Browser Console (F12):
   localStorage.clear()
   sessionStorage.clear()

   # Refresh page
   ```

### "Token Expired" Errors

**Symptoms:**
- Logged out unexpectedly
- "Your session has expired" message

**Solutions:**

1. **Normal Behavior**
   - Access tokens expire after 15 minutes
   - Refresh should happen automatically
   - If it doesn't, try logging in again

2. **Redis Not Running**
   ```bash
   # Check Redis status
   docker compose ps redis

   # Restart Redis
   docker compose restart redis
   ```

3. **Clock Skew Issues**
   ```bash
   # Ensure system time is correct
   timedatectl status

   # Sync time
   sudo timedatectl set-ntp true
   ```

### Stuck on "Checking authentication..."

**Symptoms:**
- Login page shows loading spinner indefinitely
- Can't access any pages

**Solution:**
```bash
# Check if backend is running
docker compose ps

# Check backend logs
docker logs lumina-backend

# Test API directly
curl http://localhost:3001/health

# Clear browser data and reload
```

## Calendar Integration

### Google Calendar Not Syncing

**Symptoms:**
- Events don't appear after connecting
- "Sync failed" error

**Solutions:**

1. **Check OAuth Credentials**
   ```bash
   # Ensure Google OAuth is properly configured
   # User Profile → My Integrations → Google Calendar

   # Reconnect calendar:
   # - Disconnect
   # - Wait 30 seconds
   # - Reconnect and authorize
   ```

2. **Check Background Sync Job**
   ```bash
   # Backend logs should show sync activity
   docker logs lumina-backend | grep -i "calendar sync"

   # Sync runs every 5 minutes by default
   ```

3. **API Key Issues**
   - Verify API key is valid at [Google Console](https://console.cloud.google.com)
   - Check API quotas haven't been exceeded
   - Ensure Calendar API is enabled

### Events Showing Wrong Times

**Symptoms:**
- Event times are off by several hours
- Timezone appears incorrect

**Solution:**
```bash
# Set correct timezone in user profile
# Profile → My Account → Timezone

# For family-wide setting (admin only)
# Settings → Family Settings → General → Timezone

# Reconnect calendar after timezone change
```

### "Calendar Sharing" Not Working

**Symptoms:**
- Shared calendar doesn't appear for other users
- Can't see family member's events

**Solutions:**

1. **Check Sharing Settings**
   - Profile → Calendar Sharing
   - Ensure "Share my calendar with" is enabled for specific users
   - Verify visibility is set to "Family" or "Shared"

2. **Check Event Visibility**
   - Each event has visibility setting (Private/Family/Shared)
   - Private events never show to others

3. **Refresh Calendar**
   ```bash
   # Force resync by reconnecting calendar
   # Or wait 5 minutes for automatic sync
   ```

## WooCommerce Integration

### Orders Not Appearing

**Symptoms:**
- WooCommerce connected but no orders show
- Calendar doesn't display order events

**Solutions:**

1. **Verify API Credentials**
   ```bash
   # Test WooCommerce API
   curl https://yourstore.com/wp-json/wc/v3/orders \
     -u consumer_key:consumer_secret

   # Should return JSON with orders
   ```

2. **Check API Permissions**
   - WooCommerce API key needs Read/Write permissions
   - Ensure key is active in WooCommerce settings

3. **Order Status Filter**
   - By default, only certain order statuses sync
   - Check Settings → Integrations → WooCommerce → Order Statuses

4. **Background Sync**
   ```bash
   # Check sync logs
   docker logs lumina-backend | grep -i "woocommerce"

   # Sync happens every 10 minutes
   ```

### "Invalid API Key" Error

**Symptoms:**
- Cannot save WooCommerce settings
- "Authentication failed" message

**Solution:**
```bash
# Regenerate API keys in WooCommerce:
# WordPress Admin → WooCommerce → Settings → Advanced → REST API
# Create new key with Read/Write permissions

# Common issues:
# 1. Wrong URL format (must include https://)
# 2. Extra spaces in key/secret
# 3. Key expired or deleted
```

## Database Issues

### Database Locked

**Symptoms:**
```
Error: SQLITE_BUSY: database is locked
```

**Solution:**
```bash
# Stop all services
docker compose down

# Remove lock files
rm backend/data/lumina.db-shm
rm backend/data/lumina.db-wal

# Restart
docker compose up -d
```

### Database Corrupted

**Symptoms:**
- App won't start
- Errors about "malformed database"

**Solution:**
```bash
# Stop services
docker compose down

# Try to recover
sqlite3 backend/data/lumina.db ".recover" | sqlite3 backend/data/recovered.db

# If recovery works:
mv backend/data/lumina.db backend/data/lumina.db.corrupt
mv backend/data/recovered.db backend/data/lumina.db

# If recovery fails, restore from backup:
cp backups/lumina-YYYYMMDD.db backend/data/lumina.db

# Restart
docker compose up -d
```

### Migrations Failed

**Symptoms:**
```
Error: migration failed
Knex: migration file "XXX" failed
```

**Solution:**
```bash
# Check current migration state
cd backend
npm run migrate:status

# Rollback failed migration
npm run migrate:rollback

# Try again
npm run migrate:latest

# If still failing, check logs:
docker logs lumina-backend
```

## Docker Problems

### Container Keeps Restarting

**Symptoms:**
```
docker compose ps
# Shows container with status "Restarting"
```

**Solution:**
```bash
# Check container logs
docker logs lumina-backend
docker logs lumina-frontend

# Common causes:
# 1. Port conflict
# 2. Missing environment variables
# 3. Database connection failure

# Check environment files exist
ls -la backend/.env
ls -la frontend/.env

# Verify Docker has enough resources
docker system df
docker system prune  # Clean up if needed
```

### Out of Disk Space

**Symptoms:**
```
Error: no space left on device
```

**Solution:**
```bash
# Check disk usage
df -h

# Clean up Docker
docker system prune -a --volumes

# Remove old images
docker image prune -a

# Remove unused volumes
docker volume prune

# Check Docker's disk usage
docker system df
```

### Cannot Pull Images (Raspberry Pi)

**Symptoms:**
```
error pulling image configuration: download failed
```

**Solution:**
```bash
# Ensure correct platform
docker compose pull --platform linux/arm64

# If still failing, build locally:
docker compose build --no-cache

# Check network
ping -c 4 docker.io
```

## Performance Issues

### Slow Loading Times

**Symptoms:**
- Pages take long to load
- API requests are slow

**Solutions:**

1. **Check Resource Usage**
   ```bash
   # Monitor Docker stats
   docker stats

   # If memory is high, restart services
   docker compose restart
   ```

2. **Database Optimization**
   ```bash
   # Vacuum database
   sqlite3 backend/data/lumina.db "VACUUM;"
   sqlite3 backend/data/lumina.db "ANALYZE;"
   ```

3. **Redis Cache Issues**
   ```bash
   # Clear Redis cache
   docker compose exec redis redis-cli FLUSHALL

   # Restart Redis
   docker compose restart redis
   ```

4. **Too Many Events**
   - Archive old events (feature in development)
   - Limit calendar sync to recent months

### High Memory Usage

**Symptoms:**
- System becomes sluggish
- Docker containers use excessive RAM

**Solution:**
```bash
# Check which container is using memory
docker stats --no-stream

# Set resource limits in docker-compose.yml:
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G

# Restart with limits
docker compose down
docker compose up -d
```

### High CPU Usage

**Symptoms:**
- System fans running constantly
- CPU pegged at 100%

**Solution:**
```bash
# Check what's causing high CPU
docker stats

# Check backend logs for errors
docker logs lumina-backend | grep -i error

# Common causes:
# 1. Infinite sync loop - check logs
# 2. Too many concurrent API requests
# 3. Corrupted database - run VACUUM
```

## Network & Connectivity

### Cannot Access from Phone

**Symptoms:**
- Works on server but not on phone
- "Unable to connect" error on mobile

**Solutions:**

1. **Check Network**
   ```bash
   # Ensure phone on same WiFi network
   # Find server IP:
   ip addr show | grep inet
   # or
   hostname -I

   # Use IP address on phone:
   http://192.168.1.100:3000
   ```

2. **Firewall Issues**
   ```bash
   # Check firewall
   sudo ufw status

   # Allow ports
   sudo ufw allow 3000/tcp
   sudo ufw allow 3001/tcp
   ```

3. **Docker Network**
   ```bash
   # Ensure containers bind to 0.0.0.0, not 127.0.0.1
   # Check docker-compose.yml ports section
   ```

### CORS Errors in Browser

**Symptoms:**
```
Access to fetch at 'http://localhost:3001/api/v1/...' has been blocked by CORS policy
```

**Solution:**
```bash
# Check frontend .env
REACT_APP_API_URL=http://localhost:3001/api/v1

# Check backend CORS_ORIGIN in .env
CORS_ORIGIN=http://localhost:3000

# If accessing from different IP:
CORS_ORIGIN=http://192.168.1.100:3000

# Restart backend after changes
docker compose restart backend
```

### SSL/HTTPS Issues

**Symptoms:**
- "Your connection is not private" warning
- Certificate errors

**Solution:**
```bash
# If using self-signed certificates:
# Accept the warning (only for self-hosted)

# For production with Let's Encrypt:
# Check certificate renewal
sudo certbot renew --dry-run

# Check certificate expiry
sudo certbot certificates

# Renew if needed
sudo certbot renew
```

## General Debugging

### Enable Debug Logging

```bash
# Backend debug mode
# Edit backend/.env:
NODE_ENV=development
LOG_LEVEL=debug

# Restart
docker compose restart backend

# View detailed logs
docker logs -f lumina-backend
```

### Reset Everything to Factory Settings

```bash
# Nuclear option - resets everything
docker compose down -v
rm -rf backend/data/*
rm -rf redis_data/*
docker compose up -d

# Will show setup wizard again
```

### Export Debug Information

```bash
# Collect system info for support
cat > debug-info.txt << EOF
=== System Info ===
$(uname -a)
$(docker --version)
$(docker compose version)

=== Container Status ===
$(docker compose ps)

=== Backend Logs ===
$(docker logs --tail=50 lumina-backend)

=== Frontend Logs ===
$(docker logs --tail=50 lumina-frontend)

=== Redis Status ===
$(docker compose exec redis redis-cli PING)

=== Disk Space ===
$(df -h)
EOF

cat debug-info.txt
```

## Getting More Help

If your issue isn't listed here:

1. **Check Logs First**
   ```bash
   docker compose logs
   ```

2. **Search Existing Issues**
   - [GitHub Issues](https://github.com/yourusername/lumina/issues)

3. **Ask the Community**
   - [GitHub Discussions](https://github.com/yourusername/lumina/discussions)

4. **Report a Bug**
   - Include debug information (see above)
   - Describe steps to reproduce
   - Share relevant logs

---

**Remember**: Most issues can be resolved by:
1. Checking logs: `docker compose logs`
2. Restarting: `docker compose restart`
3. Clean restart: `docker compose down && docker compose up -d`
