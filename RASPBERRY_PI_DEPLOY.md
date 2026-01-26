# Lumina Raspberry Pi Deployment Guide

This guide shows you how to deploy Lumina on your Raspberry Pi using pre-built Docker images from GitHub Container Registry. **No building required** - just pull and run!

## Prerequisites

- Raspberry Pi (tested on Pi 4, should work on Pi 3B+)
- Raspberry Pi OS (64-bit recommended) or Ubuntu
- Docker and docker compose installed
- Git installed

### Install Docker (if not already installed)

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

Log out and log back in for the group changes to take effect.

### Install docker compose (if not already installed)

```bash
sudo apt-get update
sudo apt-get install -y docker compose
```

## Fresh Installation

### 1. Clone the repository

```bash
git clone https://github.com/jasoisjaso/lumina.git
cd lumina
```

### 2. Run the deployment script with fresh install flag

```bash
./deploy-pi.sh --fresh
```

This will:
- Pull the latest pre-built Docker images (no building!)
- Clean any existing database files
- Start all containers
- Create a fresh database

### 3. Open your browser

Go to **http://localhost:3000/setup** (or use your Pi's IP address)

Follow the setup wizard to create your admin account.

## Updating to Latest Version

When new updates are pushed to GitHub, simply run:

```bash
cd lumina
git pull
./deploy-pi.sh
```

This will pull the latest code and pre-built images, then restart the containers.

## Manual Commands

If you prefer manual control:

```bash
# Pull latest images
docker compose -f docker compose.ghcr.yml pull

# Start containers
docker compose -f docker compose.ghcr.yml up -d

# View logs
docker compose -f docker compose.ghcr.yml logs -f

# Stop containers
docker compose -f docker compose.ghcr.yml down

# Fresh database reset
docker run --rm -v $(pwd)/backend/data:/data alpine sh -c "rm -rf /data/*.db /data/*.log /data/uploads"
docker compose -f docker compose.ghcr.yml up -d
```

## Troubleshooting

### Still seeing login page instead of setup?

The database files might still exist. Clean them:

```bash
./deploy-pi.sh --fresh
```

### Can't pull images?

GitHub Container Registry images are public. If you get authentication errors:

```bash
# Make sure you're using the ghcr compose file
docker compose -f docker compose.ghcr.yml pull
```

### Check container status

```bash
docker compose -f docker compose.ghcr.yml ps
```

### View backend logs

```bash
docker compose -f docker compose.ghcr.yml logs backend
```

### Check if setup is needed

```bash
curl http://localhost:3001/api/v1/setup/status
```

Should return: `{"setupNeeded":true,"message":"Setup required"}`

## Images

Pre-built images are automatically published to GitHub Container Registry when code is pushed to the `main` branch:

- `ghcr.io/jasoisjaso/lumina-backend:latest` - Backend (Node.js + Express)
- `ghcr.io/jasoisjaso/lumina-frontend:latest` - Frontend (React + Nginx)

Both images support `linux/amd64` and `linux/arm64` platforms.

## Data Persistence

Your data is stored in `./backend/data/` on the Raspberry Pi:
- `lumina.db` - SQLite database
- `uploads/` - Photo uploads
- `backend.log` - Backend error logs

This directory is NOT tracked by git (protected by .gitignore).

## Port Configuration

Default ports:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

To change ports, edit `docker compose.ghcr.yml` and modify the `ports` section.

## Support

Having issues? Check:
1. Docker is running: `docker ps`
2. Images pulled successfully: `docker images | grep lumina`
3. Backend is healthy: `curl http://localhost:3001/health`
4. Setup status: `curl http://localhost:3001/api/v1/setup/status`

For more help, see the main [README.md](README.md) or open an issue on GitHub.
