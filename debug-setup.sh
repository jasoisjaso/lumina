#!/bin/bash

echo "=================================="
echo "Lumina Setup Debugger"
echo "=================================="
echo ""

echo "1. Checking Docker containers..."
docker compose -f docker-compose.ghcr.yml ps
echo ""

echo "2. Checking if backend is running..."
BACKEND_HEALTH=$(curl -s http://localhost:3001/health || echo "FAILED")
echo "Backend health: $BACKEND_HEALTH"
echo ""

echo "3. Checking setup status from backend..."
SETUP_STATUS=$(curl -s http://localhost:3001/api/v1/setup/status || echo "FAILED")
echo "Setup status: $SETUP_STATUS"
echo ""

echo "4. Checking database file..."
if [ -f "backend/data/lumina.db" ]; then
    echo "Database exists:"
    ls -lh backend/data/lumina.db
    echo ""
    echo "5. Checking families table in database..."
    docker run --rm -v "$(pwd)/backend/data:/data" alpine sh -c "apk add --no-cache sqlite && sqlite3 /data/lumina.db 'SELECT COUNT(*) FROM families;'" 2>&1 || echo "Could not query database"
else
    echo "❌ Database file does not exist!"
fi
echo ""

echo "6. Checking backend logs (last 20 lines)..."
docker compose -f docker-compose.ghcr.yml logs --tail=20 backend
echo ""

echo "7. Testing frontend access..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "FAILED")
echo "Frontend HTTP status: $FRONTEND_STATUS"
echo ""

echo "=================================="
echo "Summary:"
echo "=================================="
if echo "$SETUP_STATUS" | grep -q '"setupNeeded":true'; then
    echo "✅ Backend says setup is needed"
    echo "🌐 Go to: http://localhost:3000/setup"
    echo ""
    echo "If you're still seeing login page, try:"
    echo "  - Clear browser cache/cookies"
    echo "  - Use incognito/private window"
    echo "  - Open browser console (F12) and check for errors"
elif echo "$SETUP_STATUS" | grep -q '"setupNeeded":false'; then
    echo "❌ Backend says setup is already complete"
    echo "Database has existing family data. To reset:"
    echo "  ./deploy-pi.sh --fresh"
else
    echo "❌ Cannot reach backend setup endpoint"
    echo "Check if containers are running:"
    echo "  docker compose -f docker-compose.ghcr.yml ps"
fi
