#!/bin/bash
# EC2 Disk Space Cleanup Script
# This script cleans up Docker resources to free disk space

echo "🧹 Starting EC2 disk space cleanup..."

# Check current disk usage
echo "📊 Current disk usage:"
df -h

# Clean up Docker resources
echo "🐳 Cleaning up Docker resources..."

# Remove unused Docker images
echo "Removing unused Docker images..."
sudo docker image prune -a -f || echo "⚠️ Docker image cleanup failed"

# Remove unused Docker containers
echo "Removing stopped containers..."
sudo docker container prune -f || echo "⚠️ Docker container cleanup failed"

# Remove unused Docker volumes
echo "Removing unused Docker volumes..."
sudo docker volume prune -f || echo "⚠️ Docker volume cleanup failed"

# Remove unused Docker networks
echo "Removing unused Docker networks..."
sudo docker network prune -f || echo "⚠️ Docker network cleanup failed"

# Remove Docker build cache
echo "Removing Docker build cache..."
sudo docker builder prune -a -f || echo "⚠️ Docker builder cache cleanup failed"

# Clean up system logs if they're taking too much space
echo "🗂️ Cleaning up system logs..."
sudo journalctl --vacuum-size=100M || echo "⚠️ Journal cleanup failed"

# Clean up package cache
echo "📦 Cleaning up package cache..."
sudo yum clean all || echo "⚠️ Package cache cleanup failed"

# Clean up temporary files
echo "🗄️ Cleaning up temporary files..."
sudo find /tmp -type f -atime +1 -delete 2>/dev/null || echo "⚠️ Temp file cleanup failed"

# Check disk usage after cleanup
echo "📊 Disk usage after cleanup:"
df -h

echo "✅ EC2 disk cleanup completed!"