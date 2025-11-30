#!/bin/bash
set -euo pipefail

# =============================================================================
# Easy Backend - Simple Deployment Script for Digital Ocean
# =============================================================================
# This script deploys the application to a 1GB Digital Ocean droplet

echo "========================================"
echo "Easy Backend - Deployment"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}✗ This script must be run as root${NC}" 
   echo "  Run: sudo ./deploy.sh"
   exit 1
fi

# Check for required commands
for cmd in docker docker compose; do
    if ! command -v $cmd &> /dev/null; then
        echo -e "${RED}✗ $cmd is not installed${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✓ Prerequisites check passed${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ No .env file found${NC}"
    echo "  Creating from template..."
    
    if [ -f .env.production ]; then
        cp .env.production .env
    elif [ -f .env.example ]; then
        cp .env.example .env
    else
        echo -e "${RED}✗ No environment template found${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}⚠ Please edit .env file with your production values${NC}"
    echo "  Required variables:"
    echo "    - POSTGRES_PASSWORD"
    echo "    - SECRET_KEY_BASE (generate with: openssl rand -base64 64)"
    echo "    - JWT_SECRET (generate with: openssl rand -base64 48)"
    echo "    - PHX_HOST (your domain name)"
    echo "    - POSTMARK_API_KEY or other email service"
    echo ""
    read -p "Press Enter after you've updated .env file..."
fi

# Check critical environment variables
source .env
REQUIRED_VARS=("POSTGRES_PASSWORD" "SECRET_KEY_BASE" "JWT_SECRET" "PHX_HOST")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var:-}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${RED}✗ Missing required environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

echo -e "${GREEN}✓ Environment variables validated${NC}"

# Stop existing containers
echo "Stopping existing containers..."
docker compose down 2>/dev/null || true

# Build and start services
echo "Building Docker images..."
docker compose build --no-cache

echo "Starting services..."
docker compose up -d

# Wait for services to be healthy
echo "Waiting for services to start..."
sleep 10

# Check if app is healthy
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker compose exec -T app curl -f http://localhost:4000/health 2>/dev/null; then
        echo -e "${GREEN}✓ Application is healthy${NC}"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Waiting for application... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}✗ Application failed to start${NC}"
    echo "Check logs with: docker compose logs app"
    exit 1
fi

# Show running containers
echo ""
echo "========================================"
echo "Deployment Complete!"
echo "========================================"
docker compose ps

echo ""
echo -e "${GREEN}✓ Deployment successful${NC}"
echo ""
echo "Next steps:"
echo "  - Check logs: docker compose logs -f app"
echo "  - Visit: https://${PHX_HOST}"
echo "  - Monitor: docker stats"
