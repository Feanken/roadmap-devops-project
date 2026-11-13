#!/bin/bash

# ==========================================
# Static Site Server - Deployment Script
# ==========================================

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configuration
SSH_KEY="$HOME/.ssh/devops_key2"
SSH_PORT=2222
SSH_USER="devops"
SSH_HOST="127.0.0.1"
REMOTE_DIR="/var/www/html/"
DOCKER_BIN="/mnt/wsl/docker-desktop/cli-tools/usr/bin/docker"
CONTAINER_NAME="ssh-server-lab"

# Prepare deployment logs
mkdir -p "$SCRIPT_DIR/logs"
exec > >(tee -a "$SCRIPT_DIR/logs/deployment.log") 2>&1

echo "Deployment started at: $(date '+%Y-%m-%d %H:%M:%S')"
echo "================================"
echo " Starting Website Deployment"
echo "================================"

# ==========================================
# Step 1 - Deploy Website using rsync
# ==========================================

echo "Deploying website files..."

rsync -avz --itemize-changes \
    -e "ssh -i $SSH_KEY -p $SSH_PORT -o IdentitiesOnly=yes" \
    "$SCRIPT_DIR/website/" \
    "$SSH_USER@$SSH_HOST:$REMOTE_DIR"

RSYNC_EXIT_CODE=$?

if [ "$RSYNC_EXIT_CODE" -ne 0 ]; then
    echo "Deployment FAILED! Exit code: $RSYNC_EXIT_CODE"
    exit "$RSYNC_EXIT_CODE"
fi

echo "File Transfer SUCCESS!"

# ==========================================
# Step 2 - HTTP Health Check
# ==========================================

echo "Checking website HTTP status..."

HTTP_STATUS=$(
    "$DOCKER_BIN" exec "$CONTAINER_NAME" \
    curl -s -o /dev/null -w "%{http_code}" \
    --max-time 10 http://127.0.0.1
)

CURL_EXIT_CODE=$?

echo "HTTP Status: $HTTP_STATUS"

if [ "$CURL_EXIT_CODE" -ne 0 ]; then
    echo "Health Check FAILED! curl or Docker error."
    exit 1
fi

if [ "$HTTP_STATUS" = "200" ]; then
    echo "Health Check SUCCESS!"
else
    echo "Health Check FAILED! HTTP Status: $HTTP_STATUS"
    exit 1
fi

# ==========================================
# Step 3 - Deployment Summary
# ==========================================

echo "================================"
echo " Deployment SUCCESS!"
echo " HTTP Status: $HTTP_STATUS"
echo " Completed at: $(date '+%Y-%m-%d %H:%M:%S')"
echo "================================"

exit 0
