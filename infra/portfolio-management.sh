#!/bin/bash
# Portfolio Container Management Script
# Usage: ./bb-portfolio-management.sh [command] [profile]
# Commands: start, stop, restart, logs, status
# Profiles: dev, prod

set -e

# Configuration - Get IP from Terraform output or use default
INSTANCE_IP=$(terraform output -raw bb_portfolio_elastic_ip 2>/dev/null || echo "54.70.138.1")
SSH_KEY="$HOME/.ssh/bb-portfolio-site-key.pem"
SSH_USER="ec2-user"
AWS_ACCOUNT_ID="778230822028"
ECR_REGION="us-west-2"

# Function to execute commands on the remote server
run_remote() {
    ssh -i "$SSH_KEY" "$SSH_USER@$INSTANCE_IP" "$1"
}

# Build a remote-safe compose command that works with either:
# - docker compose (v2 plugin) with --profile
# - docker-compose (v1) using COMPOSE_PROFILES and explicit -f path
# Usage: remote_compose_cmd <profile> "<compose args>"
remote_compose_cmd() {
        local PROFILE="$1"
        local COMPOSE_ARGS="$2"
        # Note: this string is evaluated on the remote host
        # shellcheck disable=SC2016
        echo 'if docker compose version >/dev/null 2>&1; then \
    AWS_ACCOUNT_ID='"$AWS_ACCOUNT_ID"' docker compose --profile '"$PROFILE"' '"$COMPOSE_ARGS"'; \
elif docker-compose version >/dev/null 2>&1; then \
    COMPOSE_PROFILES='"$PROFILE"' AWS_ACCOUNT_ID='"$AWS_ACCOUNT_ID"' docker-compose -f deploy/compose/docker-compose.yml '"$COMPOSE_ARGS"'; \
else \
    echo "❌ Neither 'docker compose' nor 'docker-compose' found" >&2; exit 1; \
fi'
}

# Ensure the EC2 host is authenticated to ECR before pulling prod images
ecr_login() {
    echo "🔐 Logging into ECR on remote host..."
    run_remote "aws ecr get-login-password --region $ECR_REGION | sudo docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$ECR_REGION.amazonaws.com"
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
    echo "Services: bb-portfolio-frontend-dev, bb-portfolio-backend-dev, bb-portfolio-frontend-prod, bb-portfolio-backend-prod"
    echo ""
    echo "Examples:"
    echo "  $0 start dev                    # Start development containers"
    echo "  $0 deploy-prod                  # Deploy production containers"
    echo "  $0 logs bb-portfolio-frontend-dev            # Show frontend dev logs"
    echo "  $0 status                       # Show all container status"
}

case "${1:-help}" in
    start)
        PROFILE=${2:-dev}
        echo "Starting $PROFILE containers..."
        if [ "$PROFILE" = "prod" ]; then
            ecr_login
        fi
        run_remote "cd portfolio && sudo bash -lc $(printf %q "$(remote_compose_cmd "$PROFILE" "up -d")")"
        echo "✅ $PROFILE containers started"
        ;;
    
    stop)
        PROFILE=${2:-"dev prod"}
        echo "Stopping containers..."
        for p in $PROFILE; do
            run_remote "cd portfolio && sudo bash -lc $(printf %q "$(remote_compose_cmd "$p" "down")")" || true
        done
        echo "✅ Containers stopped"
        ;;
    
    restart)
        PROFILE=${2:-dev}
        echo "Restarting $PROFILE containers..."
        run_remote "cd portfolio && sudo bash -lc $(printf %q "$(remote_compose_cmd "$PROFILE" "down")")"
        if [ "$PROFILE" = "prod" ]; then
            ecr_login
        fi
        run_remote "cd portfolio && sudo bash -lc $(printf %q "$(remote_compose_cmd "$PROFILE" "up -d")")"
        echo "✅ $PROFILE containers restarted"
        ;;
    
    logs)
        SERVICE=${2:-""}
        if [ -n "$SERVICE" ]; then
            echo "Showing logs for $SERVICE..."
            run_remote "cd portfolio && sudo docker logs $SERVICE --tail 50 -f"
        else
            echo "Showing logs for all containers..."
            # Use docker compose if available, otherwise fallback to docker-compose with explicit file
            run_remote "cd portfolio && if docker compose version >/dev/null 2>&1; then sudo docker compose logs --tail 50; else sudo docker-compose -f deploy/compose/docker-compose.yml logs --tail 50; fi"
        fi
        ;
    
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
        ecr_login
        run_remote "cd portfolio && sudo bash -lc $(printf %q "$(AWS_ACCOUNT_ID=778230822028 remote_compose_cmd "prod" "pull")")"
        
        echo "2. Stopping development containers..."
        run_remote "cd portfolio && sudo bash -lc $(printf %q "$(remote_compose_cmd "dev" "down")")" || true
        
        echo "3. Starting production containers..."
        run_remote "cd portfolio && sudo bash -lc $(printf %q "$(AWS_ACCOUNT_ID=778230822028 remote_compose_cmd "prod" "up -d")")"
        
        echo "4. Updating Nginx to point to production (port 3000)..."
        run_remote "sudo sed -i 's/localhost:4000/localhost:3000/g' /etc/nginx/conf.d/portfolio.conf && sudo nginx -t && sudo systemctl reload nginx"
        
        echo "✅ Production deployment complete"
        ;;
    
    switch-to-dev)
        echo "🔄 Switching to development containers..."
        echo "1. Stopping production containers..."
        run_remote "cd portfolio && sudo bash -lc $(printf %q "$(remote_compose_cmd "prod" "down")")" || true
        
        echo "2. Starting development containers..."
        run_remote "cd portfolio && sudo bash -lc $(printf %q "$(remote_compose_cmd "dev" "up -d")")"
        
        echo "3. Updating Nginx to point to development (port 4000)..."
        run_remote "sudo sed -i 's/localhost:3000/localhost:4000/g' /etc/nginx/conf.d/portfolio.conf && sudo nginx -t && sudo systemctl reload nginx"
        
        echo "✅ Switched to development containers"
        ;;
    
    switch-to-prod)
        echo "🔄 Switching to production containers..."
        echo "1. Stopping development containers..."
        run_remote "cd portfolio && sudo bash -lc $(printf %q "$(remote_compose_cmd "dev" "down")")" || true
        
        echo "2. Pulling and starting production containers..."
        ecr_login
        run_remote "cd portfolio && sudo bash -lc $(printf %q "$(AWS_ACCOUNT_ID=778230822028 remote_compose_cmd "prod" "pull")") && sudo bash -lc $(printf %q "$(AWS_ACCOUNT_ID=778230822028 remote_compose_cmd "prod" "up -d")")"
        
        echo "3. Updating Nginx to point to production (port 3000)..."
        run_remote "sudo sed -i 's/localhost:4000/localhost:3000/g' /etc/nginx/conf.d/portfolio.conf && sudo nginx -t && sudo systemctl reload nginx"
        
        echo "✅ Switched to production containers"
        ;
    
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