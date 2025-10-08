#!/bin/bash
# Portfolio Container Management Script
# Usage: ./portfolio-management.sh [command] [profile]
# Commands: start, stop, restart, logs, status
# Profiles: dev, prod

set -e

# Configuration - Get IP from Terraform output or use default
INSTANCE_IP=$(terraform output -raw portfolio_elastic_ip 2>/dev/null || echo "44.250.92.40")
SSH_KEY="~/.ssh/bb-portfolio-site-key.pem"
SSH_USER="ec2-user"

# Function to execute commands on the remote server
run_remote() {
    ssh -i "$SSH_KEY" "$SSH_USER@$INSTANCE_IP" "$1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [command] [profile]"
    echo ""
    echo "Commands:"
    echo "  start [profile]   - Start containers (default: dev)"
    echo "  stop [profile]    - Stop containers (default: both)"
    echo "  restart [profile] - Restart containers (default: dev)"
    echo "  logs [service]    - Show container logs"
    echo "  status            - Show container status"
    echo "  deploy-prod       - Deploy production containers from ECR"
    echo "  switch-to-dev     - Switch to development containers"
    echo "  switch-to-prod    - Switch to production containers"
    echo ""
    echo "Profiles: dev, prod"
    echo "Services: frontend-dev, backend-dev, frontend-prod, backend-prod"
    echo ""
    echo "Examples:"
    echo "  $0 start dev                    # Start development containers"
    echo "  $0 deploy-prod                  # Deploy production containers"
    echo "  $0 logs frontend-dev            # Show frontend dev logs"
    echo "  $0 status                       # Show all container status"
}

case "${1:-help}" in
    start)
        PROFILE=${2:-dev}
        echo "Starting $PROFILE containers..."
        run_remote "cd portfolio && sudo docker compose --profile $PROFILE up -d"
        echo "✅ $PROFILE containers started"
        ;;
    
    stop)
        PROFILE=${2:-"dev prod"}
        echo "Stopping containers..."
        for p in $PROFILE; do
            run_remote "cd portfolio && sudo docker compose --profile $p down" || true
        done
        echo "✅ Containers stopped"
        ;;
    
    restart)
        PROFILE=${2:-dev}
        echo "Restarting $PROFILE containers..."
        run_remote "cd portfolio && sudo docker compose --profile $PROFILE down && sudo docker compose --profile $PROFILE up -d"
        echo "✅ $PROFILE containers restarted"
        ;;
    
    logs)
        SERVICE=${2:-""}
        if [ -n "$SERVICE" ]; then
            echo "Showing logs for $SERVICE..."
            run_remote "cd portfolio && sudo docker logs $SERVICE --tail 50 -f"
        else
            echo "Showing logs for all containers..."
            run_remote "cd portfolio && sudo docker compose logs --tail 50"
        fi
        ;;
    
    status)
        echo "Portfolio container status:"
        run_remote "sudo docker ps --filter 'name=portfolio-' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
        echo ""
        echo "Nginx status:"
        run_remote "sudo systemctl status nginx --no-pager -l" || true
        ;;
    
    deploy-prod)
        echo "🚀 Deploying production containers..."
        echo "1. Pulling latest ECR images..."
        run_remote "cd portfolio && sudo AWS_ACCOUNT_ID=778230822028 docker compose --profile prod pull"
        
        echo "2. Stopping development containers..."
        run_remote "cd portfolio && sudo docker compose --profile dev down" || true
        
        echo "3. Starting production containers..."
        run_remote "cd portfolio && sudo AWS_ACCOUNT_ID=778230822028 docker compose --profile prod up -d"
        
        echo "4. Updating Nginx to point to production (port 3000)..."
        run_remote "sudo sed -i 's/localhost:4000/localhost:3000/g' /etc/nginx/conf.d/portfolio.conf && sudo nginx -t && sudo systemctl reload nginx"
        
        echo "✅ Production deployment complete"
        ;;
    
    switch-to-dev)
        echo "🔄 Switching to development containers..."
        echo "1. Stopping production containers..."
        run_remote "cd portfolio && sudo docker compose --profile prod down" || true
        
        echo "2. Starting development containers..."
        run_remote "cd portfolio && sudo docker compose --profile dev up -d"
        
        echo "3. Updating Nginx to point to development (port 4000)..."
        run_remote "sudo sed -i 's/localhost:3000/localhost:4000/g' /etc/nginx/conf.d/portfolio.conf && sudo nginx -t && sudo systemctl reload nginx"
        
        echo "✅ Switched to development containers"
        ;;
    
    switch-to-prod)
        echo "🔄 Switching to production containers..."
        echo "1. Stopping development containers..."
        run_remote "cd portfolio && sudo docker compose --profile dev down" || true
        
        echo "2. Pulling and starting production containers..."
        run_remote "cd portfolio && sudo AWS_ACCOUNT_ID=778230822028 docker compose --profile prod pull && sudo AWS_ACCOUNT_ID=778230822028 docker compose --profile prod up -d"
        
        echo "3. Updating Nginx to point to production (port 3000)..."
        run_remote "sudo sed -i 's/localhost:4000/localhost:3000/g' /etc/nginx/conf.d/portfolio.conf && sudo nginx -t && sudo systemctl reload nginx"
        
        echo "✅ Switched to production containers"
        ;;
    
    help|--help|-h)
        show_usage
        ;;
    
    *)
        echo "❌ Unknown command: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac