#!/bin/bash

# Lumina Build and Test Script
# This script rebuilds the Docker containers and verifies they work correctly

set -e  # Exit on error

echo "=== Lumina Build and Test Script ==="
echo ""

# Step 1: Clean up old containers and images
echo "Step 1: Cleaning up old containers..."
docker compose down -v 2>/dev/null || true
docker rmi lumina-backend lumina-frontend 2>/dev/null || true
echo "✓ Cleanup complete"
echo ""

# Step 2: Create necessary directories
echo "Step 2: Creating data directories..."
mkdir -p backend/data
chmod 777 backend/data
echo "✓ Directories created"
echo ""

# Step 3: Build and start services
echo "Step 3: Building and starting services..."
docker compose build --no-cache
echo "✓ Build complete"
echo ""

echo "Step 4: Starting containers..."
docker compose up -d
echo "✓ Containers started"
echo ""

# Step 5: Wait for services to be ready
echo "Step 5: Waiting for services to start..."
sleep 5

# Step 6: Check container status
echo "Step 6: Checking container status..."
docker compose ps
echo ""

# Step 7: Check backend logs
echo "Step 7: Backend logs (last 20 lines)..."
docker compose logs --tail=20 backend
echo ""

# Step 8: Run migrations
echo "Step 8: Running database migrations..."
docker compose exec -T backend npm run migrate:latest || echo "⚠ Migrations may have already run"
echo ""

# Step 9: Test endpoints
echo "Step 9: Testing endpoints..."
sleep 3

echo -n "Testing /health endpoint... "
if curl -sf http://localhost:3001/health > /dev/null; then
    echo "✓ SUCCESS"
    curl -s http://localhost:3001/health | jq . || cat
else
    echo "✗ FAILED"
fi
echo ""

echo -n "Testing /api/v1/health endpoint... "
if curl -sf http://localhost:3001/api/v1/health > /dev/null; then
    echo "✓ SUCCESS"
    curl -s http://localhost:3001/api/v1/health | jq . || cat
else
    echo "✗ FAILED"
fi
echo ""

echo -n "Testing /api/v1/db/health endpoint... "
if curl -sf http://localhost:3001/api/v1/db/health > /dev/null; then
    echo "✓ SUCCESS"
    curl -s http://localhost:3001/api/v1/db/health | jq . || cat
else
    echo "✗ FAILED (database may need initialization)"
fi
echo ""

# Step 10: Final status
echo "=== Build and Test Complete ==="
echo ""
echo "Services running:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend: http://localhost:3001"
echo "  - Redis: localhost:6379 (internal)"
echo ""
echo "Useful commands:"
echo "  - View logs: docker compose logs -f [service]"
echo "  - Stop services: docker compose down"
echo "  - Restart services: docker compose restart [service]"
echo "  - Run migrations: docker compose exec backend npm run migrate:latest"
echo ""
