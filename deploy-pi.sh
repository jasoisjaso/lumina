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

# Clean database if fresh install
if [[ "$FRESH_INSTALL" == true ]]; then
    echo "🧹 Cleaning database and data files..."

    # Create data directory if it doesn't exist
    mkdir -p backend/data

    # Clean using Docker (no sudo needed)
    docker run --rm -v "$(pwd)/backend/data:/data" alpine sh -c "rm -rf /data/*.db /data/*.sqlite* /data/*.log /data/uploads" || true

    # Verify .gitkeep exists
    touch backend/data/.gitkeep

    echo "✅ Database cleaned"
    echo ""
fi

# Pull latest images
echo "📥 Pulling latest Docker images from GitHub Container Registry..."
docker compose -f docker-compose.ghcr.yml pull

# Start containers
echo "🚀 Starting Lumina..."
docker compose -f docker-compose.ghcr.yml up -d

# Wait for backend to be healthy
echo ""
echo "⏳ Waiting for backend to be ready..."
sleep 10

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
