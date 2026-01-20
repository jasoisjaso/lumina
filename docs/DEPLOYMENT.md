# Deployment Guide

Complete guide for deploying Lumina on various platforms - from local development to production servers.

## Table of Contents

- [Quick Start](#quick-start)
- [Docker Deployment](#docker-deployment)
- [Raspberry Pi](#raspberry-pi-deployment)
- [Cloud Platforms](#cloud-deployment)
- [Production Configuration](#production-configuration)
- [Maintenance](#maintenance)

## Quick Start

The fastest way to get Lumina running:

```bash
# 1. Clone repository
git clone https://github.com/yourusername/lumina.git
cd lumina

# 2. Start with Docker Compose
docker compose up -d

# 3. Access setup wizard
open http://localhost:3000
```

That's it! The setup wizard will guide you through the rest.

## Docker Deployment

### Prerequisites

- **Docker** 20.10+ ([Install Docker](https://docs.docker.com/get-docker/))
- **Docker Compose** 2.0+ (included with Docker Desktop)
- 2GB RAM minimum
- 1GB free disk space

### Standard Deployment

```bash
# Clone repository
git clone https://github.com/yourusername/lumina.git
cd lumina

# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### Custom Port Configuration

Edit `docker-compose.yml`:

```yaml
services:
  frontend:
    ports:
      - "8080:80"  # Change 8080 to your preferred port

  backend:
    ports:
      - "8081:3001"  # Change 8081 to your preferred port
```

### Production Deployment

Use the production compose file:

```bash
# Start with production configuration
docker compose -f docker-compose.prod.yml up -d
```

Key differences in production:
- Health checks enabled
- Resource limits configured
- Restart policies set
- Logging optimized
- Security hardening

### Behind a Reverse Proxy

#### Nginx Configuration

```nginx
server {
    listen 80;
    server_name lumina.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Traefik Configuration

```yaml
services:
  frontend:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.lumina.rule=Host(`lumina.yourdomain.com`)"
      - "traefik.http.services.lumina.loadbalancer.server.port=80"
```

### SSL/TLS Configuration

#### Using Let's Encrypt with Certbot

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d lumina.yourdomain.com

# Auto-renewal is configured automatically
```

#### Manual SSL Configuration

```yaml
services:
  frontend:
    volumes:
      - ./ssl/cert.pem:/etc/nginx/ssl/cert.pem
      - ./ssl/key.pem:/etc/nginx/ssl/key.pem
    environment:
      - SSL_ENABLED=true
```

## Raspberry Pi Deployment

Lumina runs perfectly on Raspberry Pi 4 or 5!

### Hardware Requirements

**Minimum:**
- Raspberry Pi 4 (2GB RAM)
- 8GB SD Card
- Power supply

**Recommended:**
- Raspberry Pi 5 (4GB+ RAM)
- 32GB SD Card or SSD
- Official power supply
- Case with cooling

### Setup Instructions

#### 1. Install Raspberry Pi OS

```bash
# Use Raspberry Pi Imager
# Select: Raspberry Pi OS Lite (64-bit)
# Configure WiFi and SSH in advanced options
```

#### 2. Update System

```bash
# SSH into your Pi
ssh pi@raspberrypi.local

# Update system
sudo apt update && sudo apt upgrade -y
```

#### 3. Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in
exit
```

#### 4. Deploy Lumina

```bash
# Clone repository
git clone https://github.com/yourusername/lumina.git
cd lumina

# Start services
docker compose up -d

# Access from any device on your network
# http://raspberrypi.local:3000
```

### Kiosk Mode (Touchscreen Display)

For a dedicated family display:

```bash
# Install Chromium
sudo apt install chromium-browser unclutter

# Create kiosk script
cat > ~/kiosk.sh << 'EOF'
#!/bin/bash
xset s noblank
xset s off
xset -dpms
unclutter -idle 0.5 -root &
chromium-browser --noerrdialogs --disable-infobars --kiosk \
  http://localhost:3000/kiosk
EOF

chmod +x ~/kiosk.sh

# Auto-start on boot
# Add to ~/.config/lxsession/LXDE-pi/autostart:
@/home/pi/kiosk.sh
```

### Performance Optimization for Pi

```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          memory: 512M

  frontend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
```

## Cloud Deployment

### AWS EC2

#### 1. Launch Instance

- AMI: Ubuntu Server 22.04 LTS
- Instance Type: t3.small or t3.medium
- Storage: 20GB gp3
- Security Group: Allow ports 80, 443, 22

#### 2. Configure Instance

```bash
# Connect via SSH
ssh ubuntu@your-ec2-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Deploy Lumina
git clone https://github.com/yourusername/lumina.git
cd lumina
docker compose -f docker-compose.prod.yml up -d
```

#### 3. Configure Domain

```bash
# Install Nginx
sudo apt install nginx certbot python3-certbot-nginx

# Configure reverse proxy
# (See Nginx configuration above)

# Get SSL certificate
sudo certbot --nginx -d lumina.yourdomain.com
```

### DigitalOcean Droplet

#### 1. Create Droplet

- Distribution: Ubuntu 22.04 LTS
- Plan: Basic ($12/month)
- Add your SSH key

#### 2. One-Click Setup

```bash
# SSH into droplet
ssh root@your-droplet-ip

# Run setup script
curl -fsSL https://raw.githubusercontent.com/yourusername/lumina/main/scripts/install.sh | bash
```

### Google Cloud Platform

#### Using Cloud Run

```bash
# Build and push images
docker build -t gcr.io/PROJECT_ID/lumina-frontend ./frontend
docker build -t gcr.io/PROJECT_ID/lumina-backend ./backend

docker push gcr.io/PROJECT_ID/lumina-frontend
docker push gcr.io/PROJECT_ID/lumina-backend

# Deploy to Cloud Run
gcloud run deploy lumina-frontend \
  --image gcr.io/PROJECT_ID/lumina-frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Azure Container Instances

```bash
# Create resource group
az group create --name lumina-rg --location eastus

# Deploy containers
az container create \
  --resource-group lumina-rg \
  --name lumina \
  --image yourusername/lumina:latest \
  --dns-name-label lumina \
  --ports 80 3001
```

## Production Configuration

### Environment Variables

#### Backend `.env`

```bash
# Server
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=sqlite:///app/data/lumina.db

# Security - CHANGE THESE!
JWT_SECRET=your-super-secure-random-string-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=https://lumina.yourdomain.com
```

#### Frontend `.env`

```bash
# API Configuration
REACT_APP_API_URL=https://lumina.yourdomain.com/api/v1

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=false
REACT_APP_ENABLE_SENTRY=true

# Build Optimization
GENERATE_SOURCEMAP=false
```

### Security Hardening

#### 1. Generate Secure Secrets

```bash
# JWT Secret (32+ characters)
openssl rand -base64 48

# Redis Password
openssl rand -base64 32
```

#### 2. Configure Firewall

```bash
# Ubuntu/Debian
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Deny direct access to backend
sudo ufw deny 3001/tcp
```

#### 3. Set Up Automatic Updates

```bash
# Ubuntu/Debian
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### Database Backups

#### Automated Backup Script

```bash
#!/bin/bash
# backup-lumina.sh

BACKUP_DIR="/var/backups/lumina"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_FILE="./backend/data/lumina.db"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
cp $DB_FILE "$BACKUP_DIR/lumina_$TIMESTAMP.db"

# Keep only last 7 days
find $BACKUP_DIR -name "lumina_*.db" -mtime +7 -delete

echo "Backup completed: lumina_$TIMESTAMP.db"
```

#### Schedule with Cron

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/backup-lumina.sh
```

### Monitoring

#### Health Check Endpoints

```bash
# Backend health
curl http://localhost:3001/health

# Database health
curl http://localhost:3001/api/v1/db/health

# Frontend health
curl http://localhost:3000
```

#### Docker Health Checks

```yaml
services:
  backend:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

#### Log Management

```bash
# View logs
docker compose logs -f

# Limit log size
docker compose logs --tail=100 backend

# Export logs
docker compose logs > lumina-logs-$(date +%Y%m%d).log
```

## Maintenance

### Updating Lumina

```bash
# Pull latest changes
cd lumina
git pull

# Rebuild and restart
docker compose up -d --build

# Verify update
docker compose ps
docker compose logs -f
```

### Database Maintenance

#### Backup

```bash
# Stop services
docker compose down

# Copy database
cp backend/data/lumina.db backups/lumina-$(date +%Y%m%d).db

# Restart services
docker compose up -d
```

#### Restore

```bash
# Stop services
docker compose down

# Restore database
cp backups/lumina-20260121.db backend/data/lumina.db

# Restart services
docker compose up -d
```

#### Optimize

```bash
# Connect to database
sqlite3 backend/data/lumina.db

# Run optimization
VACUUM;
ANALYZE;
.exit
```

### Troubleshooting

#### Services Won't Start

```bash
# Check logs
docker compose logs

# Check disk space
df -h

# Check permissions
ls -la backend/data/
```

#### Database Locked

```bash
# Stop all services
docker compose down

# Remove lock file
rm backend/data/lumina.db-shm
rm backend/data/lumina.db-wal

# Restart
docker compose up -d
```

#### High Memory Usage

```bash
# Check resource usage
docker stats

# Restart services
docker compose restart

# Set resource limits (see docker-compose.prod.yml)
```

### Performance Tuning

#### Redis Memory

```yaml
services:
  redis:
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

#### Database Optimization

```bash
# Indexes for frequently queried fields
sqlite3 backend/data/lumina.db
CREATE INDEX idx_events_start_time ON calendar_events(start_time);
CREATE INDEX idx_events_user ON calendar_events(user_id);
```

## Getting Help

- 📖 [Documentation](README.md)
- 🐛 [Report Issues](https://github.com/yourusername/lumina/issues)
- 💬 [Discussions](https://github.com/yourusername/lumina/discussions)
- 🔧 [Troubleshooting Guide](TROUBLESHOOTING.md)

---

**Next Steps:**
- Configure [SSL/TLS](#ssltls-configuration)
- Set up [Backups](#database-backups)
- Enable [Monitoring](#monitoring)
- Review [Security](#security-hardening)
