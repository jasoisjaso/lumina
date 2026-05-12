#!/bin/bash

# Lumina Raspberry Pi Deployment Script
# This script pulls pre-built Docker images and deploys Lumina

set -e

echo "=================================="
echo "Lumina Raspberry Pi Deployment"
echo "=================================="
echo ""

# Check if docker compose is available
if ! command -v docker &> /dev/null; then
    echo "Error: docker not found. Please install docker first."
    exit 1
fi

# Parse arguments
FRESH_INSTALL=false
if [[ "$1" == "--fresh" ]]; then
    FRESH_INSTALL=true
    echo "🆕 Fresh installation mode enabled"
    echo ""
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose -f docker-compose.ghcr.yml down

# Create data directory if it doesn't exist
mkdir -p backend/data

# Clean database if fresh install
if [[ "$FRESH_INSTALL" == true ]]; then
    echo "🧹 Cleaning database and data files..."

    # Clean using Docker (no sudo needed)
    docker run --rm -v "$(pwd)/backend/data:/data" alpine sh -c "rm -rf /data/*.db /data/*.sqlite* /data/*.log /data/uploads" || true

    echo "✅ Database cleaned"
    echo ""
fi

# Fix permissions for Docker container (backend runs as UID 1001)
echo "🔧 Setting correct permissions..."
# Set ownership to 1001:1001 (nodejs user), create .gitkeep, and set proper permissions
docker run --rm -v "$(pwd)/backend/data:/data" alpine sh -c "
    chown -R 1001:1001 /data
    chmod -R 700 /data
    touch /data/.gitkeep
    chown 1001:1001 /data/.gitkeep
"
echo "✅ Permissions fixed"
echo ""

# Pull latest images
echo "📥 Pulling latest Docker images from GitHub Container Registry..."
docker compose -f docker-compose.ghcr.yml pull

# Start containers
echo "🚀 Starting Lumina..."
docker compose -f docker-compose.ghcr.yml up -d

# Wait for backend to be healthy
echo ""
echo "⏳ Waiting for backend to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Backend is ready!"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "   Attempt $RETRY_COUNT/$MAX_RETRIES..."
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ Backend failed to start. Check logs:"
    echo "   docker compose -f docker-compose.ghcr.yml logs backend"
    exit 1
fi
echo ""

# Check if setup is needed
SETUP_STATUS=$(curl -s http://localhost:3001/api/v1/setup/status || echo '{"setupNeeded":true}')
if echo "$SETUP_STATUS" | grep -q '"setupNeeded":true'; then
    echo ""
    echo "=================================="
    echo "✅ Lumina is running!"
    echo "=================================="
    echo ""
    echo "🌐 Open your browser and go to:"
    echo "   http://localhost:3000/setup"
    echo ""
    echo "Follow the setup wizard to create your admin account."
else
    echo ""
    echo "=================================="
    echo "✅ Lumina is running!"
    echo "=================================="
    echo ""
    echo "🌐 Open your browser and go to:"
    echo "   http://localhost:3000"
    echo ""
    echo "Login with your existing credentials."
fi

echo ""
echo "📋 Useful commands:"
echo "   View logs:    docker compose -f docker-compose.ghcr.yml logs -f"
echo "   Stop:         docker compose -f docker-compose.ghcr.yml down"
echo "   Restart:      docker compose -f docker-compose.ghcr.yml restart"
echo ""
