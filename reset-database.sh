#!/bin/bash

# Lumina Database Reset Script
# Use this to start fresh with a clean setup wizard

echo "🧹 Lumina Database Reset"
echo "========================"
echo ""
echo "This will:"
echo "  - Stop all containers"
echo "  - Remove the database file"
echo "  - Restart the application"
echo "  - You'll be redirected to the setup wizard"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 0
fi

echo ""
echo "🛑 Stopping containers..."
docker compose down

echo "🗑️  Removing database..."
rm -f backend/data/lumina.db backend/data/lumina.sqlite

echo "🚀 Starting application..."
docker compose up -d

echo ""
echo "✅ Done! Database reset complete."
echo ""
echo "📱 Open http://localhost:3000 to access the setup wizard"
echo ""
