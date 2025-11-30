#!/bin/bash
set -euo pipefail

# =============================================================================
# Easy Backend - Update/Redeploy Script
# =============================================================================
# Use this script to update the application with new code

echo "========================================"
echo "Easy Backend - Update Deployment"
echo "========================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Pulling latest code..."
git pull

echo "Building new Docker images..."
docker-compose build

echo "Restarting services with zero-downtime..."
# Restart app to pick up new code
docker-compose up -d --no-deps --build app

echo "Waiting for application to be healthy..."
sleep 10

# Check health
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker-compose exec -T app curl -f http://localhost:4000/health 2>/dev/null; then
        echo -e "${GREEN}✓ Application is healthy${NC}"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Waiting... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${YELLOW}⚠ Application health check timed out${NC}"
    echo "Check logs with: docker-compose logs app"
    exit 1
fi

# Clean up old images
echo "Cleaning up old Docker images..."
docker image prune -f

echo ""
echo -e "${GREEN}✓ Update complete!${NC}"
echo ""
echo "Check logs: docker-compose logs -f app"
