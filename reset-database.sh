#!/bin/bash

# Lumina Database Reset Script
# Use this to start fresh with a clean setup wizard

echo "🧹 Lumina Database & Application Reset"
echo "======================================"
echo ""
echo "This will:"
echo "  - Stop all containers"
echo "  - Remove all associated volumes (database, redis, etc.)"
echo "  - Remove the local database file"
echo "  - Rebuild the application images"
echo "  - Restart the application"
echo "  - You'll be redirected to the setup wizard"
echo ""
read -p "Continue? This is a destructive operation. (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 0
fi

echo ""
echo "🛑 Stopping containers and removing volumes..."
docker compose down -v

echo "🗑️  Removing local database file..."
rm -f backend/data/lumina.db

echo "🏗️  Rebuilding images..."
docker compose build

echo "🚀 Starting application..."
docker compose up -d

echo ""
echo "✅ Done! Application reset complete."
echo ""
echo "📱 Open http://localhost:3000 to access the setup wizard"
echo ""
