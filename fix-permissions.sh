#!/bin/bash

# Quick permissions fix script
# Use this if you're getting "unable to open database file" errors

echo "🔧 Fixing backend/data permissions..."

# Create directory if it doesn't exist
mkdir -p backend/data

# Fix permissions using Docker (no sudo needed)
# Backend runs as UID 1001 (nodejs user)
docker run --rm -v "$(pwd)/backend/data:/data" alpine sh -c "chown -R 1001:1001 /data && chmod -R 755 /data"

echo "✅ Permissions fixed!"
echo ""
echo "Now restart the backend:"
echo "  docker compose -f docker-compose.ghcr.yml restart backend"
