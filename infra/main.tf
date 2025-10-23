# cSpell:disable
provider "aws" {
  region = var.region
  profile = var.aws_profile
}

# Security Group for SSH, HTTP, HTTPS
resource "aws_security_group" "bb_portfolio_sg" {
  name        = "bb-portfolio-sg"
  description = "Allow SSH, HTTP, HTTPS"

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Frontend App (Production)"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow all outbound traffic for package installs, container pulls, etc.
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# New EC2 instance for bb_portfolio to match references

# IAM Role for SSM (Session Manager)
resource "aws_iam_role" "ssm_role" {
  name = "bb-portfolio-ssm-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ssm_attach" {
  role       = aws_iam_role.ssm_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ssm_profile" {
  name = "bb-portfolio-ssm-profile"
  role = aws_iam_role.ssm_role.name
}

# Elastic IP
resource "aws_eip" "bb_portfolio_ip" {
  # Nothing else needed, defaults to VPC
  lifecycle {
    prevent_destroy = true
  }
}

# EC2 Instance
resource "aws_instance" "bb_portfolio" {
  ami           = "ami-06a974f9b8a97ecf2" # Amazon Linux 2023 AMI ID for us-west-2 (2023.8.20250915.0)
  instance_type = "t3.medium"
  key_name      = "bb-portfolio-site-key" # must exist in AWS console

  vpc_security_group_ids = [aws_security_group.bb_portfolio_sg.id]
  iam_instance_profile   = var.attach_instance_profile ? aws_iam_instance_profile.ssm_profile.name : null

  associate_public_ip_address = true

  # EBS Root Volume Configuration
  root_block_device {
    volume_type = "gp3" # General Purpose SSD v3 (latest generation)
    volume_size = 20    # 20GB storage
    encrypted   = true  # Encrypt the volume for security
    throughput  = 125   # MB/s (default for gp3)
    iops        = 3000  # IOPS (default for gp3)

    tags = {
      Name = "bb-portfolio-root-volume"
    }
  }

  user_data = <<-EOF
#!/bin/bash
yum update -y
yum install -y docker git nginx

# Install Docker Compose manually (Amazon Linux 2023 doesn't have docker-compose-plugin in standard repos)
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Configure Docker
systemctl enable docker
systemctl start docker

# Configure SSM Agent
systemctl enable amazon-ssm-agent
systemctl start amazon-ssm-agent

# Add ec2-user to docker group for easier management
usermod -aG docker ec2-user

# Configure Nginx
systemctl enable nginx

# Create Nginx configuration for portfolio (bb-prefixed)
cat > /etc/nginx/conf.d/bb-portfolio.conf << NGINX_EOF
# Production/Main domain server block
server {
    listen 80;
    server_name bbinteractive.io www.bbinteractive.io;
    
  # Admin interface proxy to production backend (port 3001)
  location /admin {
        proxy_pass http://localhost:3001/admin;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
    }
    
  # Admin assets (assetPrefix) — always from backend
  # Matches when backend Next.js emits /admin/_next/* assets
  location ^~ /admin/_next/ {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
    
    # API proxy to production backend (port 3001)
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Frontend proxy to production container (port 3000) - MUST be last
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}

# Development subdomain server block
server {
    listen 80;
    server_name dev.bbinteractive.io *.dev.bbinteractive.io;
    
  # Admin interface proxy to development backend (port 4001)
  location /admin {
        proxy_pass http://localhost:4001/admin;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
    }
    
  # Admin assets (assetPrefix) — always from backend
  # Matches when backend Next.js emits /admin/_next/* assets
  location ^~ /admin/_next/ {
    proxy_pass http://localhost:4001;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
    
    # API proxy to development backend (port 4001)
    location /api/ {
        proxy_pass http://localhost:4001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Frontend proxy to development container (port 4000) - MUST be last
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}

# Default server block for unknown domains
server {
    listen 80 default_server;
    server_name _;
    return 444; # Close connection without response for unknown domains
}
NGINX_EOF

# Disable default Nginx server block by commenting it out
sed -i '/^    server {/,/^    }/s/^/#/' /etc/nginx/nginx.conf

# Test and start Nginx
nginx -t && systemctl start nginx

# Setup Docker deployment directory and files
mkdir -p /home/ec2-user/portfolio
cd /home/ec2-user/portfolio
    
            # Create portfolio application directory structure
mkdir -p /home/ec2-user/portfolio/backend
mkdir -p /home/ec2-user/portfolio/frontend
chown -R ec2-user:ec2-user /home/ec2-user/portfolio

# Create script to generate environment files with correct IP
cat > /home/ec2-user/portfolio/generate-env-files.sh << 'GEN_SCRIPT_EOF'
#!/bin/bash
echo "Waiting for Elastic IP association..."

# Function to detect Elastic IP using multiple methods
detect_elastic_ip() {
    local ip=""
    
    # Method 1: Try metadata service (works after EIP association propagates)
    ip=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null)
    if [[ -n "$ip" && "$ip" != "169.254.169.254" ]]; then
        echo "$ip"
        return 0
    fi
    
    # Method 2: Try AWS CLI to get our instance's public IP
    local instance_id=$(curl -s http://169.254.169.254/latest/meta-data/instance-id 2>/dev/null)
    if [[ -n "$instance_id" ]]; then
        ip=$(aws ec2 describe-instances --region us-west-2 --instance-ids "$instance_id" --query 'Reservations[0].Instances[0].PublicIpAddress' --output text 2>/dev/null)
        if [[ -n "$ip" && "$ip" != "None" ]]; then
            echo "$ip"
            return 0
        fi
    fi
    
    return 1
}

# Wait for Elastic IP to be associated (max 10 minutes)
for i in {1..120}; do
    ELASTIC_IP=$(detect_elastic_ip)
    if [[ -n "$ELASTIC_IP" ]]; then
        echo "Elastic IP detected: $ELASTIC_IP (attempt $i/120)"
        break
    fi
    echo "Attempt $i/120: Waiting for Elastic IP association..."
    sleep 5
done

if [[ -z "$ELASTIC_IP" ]]; then
    echo "ERROR: Could not detect Elastic IP after 10 minutes"
    echo "Falling back to localhost for development"
    ELASTIC_IP="localhost"
fi

echo "Generating environment files with IP: $ELASTIC_IP"

# Create backend environment file with production configuration
cat > /home/ec2-user/portfolio/backend/.env.prod << BACKEND_ENV_EOF
NODE_ENV=production
ENV_PROFILE=prod

# AWS Configuration
AWS_ACCESS_KEY_ID=${var.aws_access_key_id}
AWS_SECRET_ACCESS_KEY=${var.aws_secret_access_key}
PROD_AWS_REGION=${var.prod_aws_region}

# Database Configuration
PROD_MONGODB_URI=${var.prod_mongodb_uri}

# Payload CMS Configuration
PROD_PAYLOAD_SECRET=${var.prod_payload_secret}

# S3 Media Configuration
PROD_S3_BUCKET=${var.prod_s3_bucket}
S3_AWS_ACCESS_KEY_ID=${var.aws_access_key_id}
S3_AWS_SECRET_ACCESS_KEY=${var.aws_secret_access_key}
S3_REGION=${var.prod_aws_region}

# Frontend Configuration (for SSR) - Using dynamic IP
PROD_FRONTEND_URL=https://bbinteractive.io,http://$ELASTIC_IP:3000
PROD_NEXT_PUBLIC_BACKEND_URL=http://$ELASTIC_IP:3001
PROD_BACKEND_INTERNAL_URL=${var.prod_backend_internal_url}

# Email Configuration
PROD_SES_FROM_EMAIL=${var.prod_ses_from_email}
PROD_SES_TO_EMAIL=${var.prod_ses_to_email}
BACKEND_ENV_EOF

# Frontend environment file
cat > /home/ec2-user/portfolio/frontend/.env.prod << FRONTEND_ENV_EOF
NODE_ENV=production
ENV_PROFILE=prod

# Frontend Configuration - Using dynamic IP
NEXT_PUBLIC_BACKEND_URL=http://$ELASTIC_IP:3001
FRONTEND_ENV_EOF

# Create dev environment files too
cat > /home/ec2-user/portfolio/backend/.env.dev << BACKEND_DEV_ENV_EOF
NODE_ENV=development
ENV_PROFILE=dev

# AWS Configuration
AWS_ACCESS_KEY_ID=${var.aws_access_key_id}
AWS_SECRET_ACCESS_KEY=${var.aws_secret_access_key}
DEV_AWS_REGION=${var.dev_aws_region}

# Database Configuration
DEV_MONGODB_URI=${var.dev_mongodb_uri}

# Payload CMS Configuration
DEV_PAYLOAD_SECRET=${var.dev_payload_secret}

# S3 Media Configuration
DEV_S3_BUCKET=${var.dev_s3_bucket}
S3_AWS_ACCESS_KEY_ID=${var.aws_access_key_id}
S3_AWS_SECRET_ACCESS_KEY=${var.aws_secret_access_key}
S3_REGION=${var.dev_aws_region}

# Frontend Configuration (for SSR) - Using dynamic IP
DEV_FRONTEND_URL=https://dev.bbinteractive.io,http://$ELASTIC_IP:4000
DEV_NEXT_PUBLIC_BACKEND_URL=http://$ELASTIC_IP:4001
DEV_BACKEND_INTERNAL_URL=${var.dev_backend_internal_url}

# Email Configuration
DEV_SES_FROM_EMAIL=${var.dev_ses_from_email}
DEV_SES_TO_EMAIL=${var.dev_ses_to_email}
BACKEND_DEV_ENV_EOF

cat > /home/ec2-user/portfolio/frontend/.env.dev << FRONTEND_DEV_ENV_EOF
NODE_ENV=development
ENV_PROFILE=dev

# Frontend Configuration - Using dynamic IP
NEXT_PUBLIC_BACKEND_URL=http://$ELASTIC_IP:4001
FRONTEND_DEV_ENV_EOF

echo "Environment files generated successfully with IP: $ELASTIC_IP"
GEN_SCRIPT_EOF

# Make the script executable
chmod +x /home/ec2-user/portfolio/generate-env-files.sh

# Run the script after a delay to allow Elastic IP association
nohup bash -c 'sleep 60 && /home/ec2-user/portfolio/generate-env-files.sh' &
            
            # Create docker-compose.yml for the portfolio application
            cat > /home/ec2-user/portfolio/docker-compose.yml << COMPOSE_EOF
            services:
              # =============================================================================
              # PRODUCTION CONTAINERS (ECR images, for production deployment)
              # =============================================================================
              bb-portfolio-frontend-prod:
                container_name: bb-portfolio-frontend-prod
                image: 778230822028.dkr.ecr.us-west-2.amazonaws.com/bb-portfolio-frontend-prod:latest
                ports:
                  - "3000:3000"
                env_file:
                  - ./frontend/.env.prod
                profiles:
                  - prod
                restart: unless-stopped
                depends_on:
                  - bb-portfolio-backend-prod
                healthcheck:
                  test: ["CMD", "node", "-e", "require('net').connect(3000,'127.0.0.1',()=>process.exit(0)).on('error',()=>process.exit(1))"]
                  interval: 30s
                  timeout: 10s
                  retries: 3
                  start_period: 60s
            
              bb-portfolio-backend-prod:
                container_name: bb-portfolio-backend-prod
                image: 778230822028.dkr.ecr.us-west-2.amazonaws.com/bb-portfolio-backend-prod:latest
                ports:
                  - "3001:3000"
                env_file:
                  - ./backend/.env.prod
                profiles:
                  - prod
                restart: unless-stopped
                healthcheck:
                  test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health',res=>process.exit(res.statusCode===200?0:1)).on('error',()=>process.exit(1))"]
                  interval: 30s
                  timeout: 10s
                  retries: 3
                  start_period: 30s

              # =============================================================================
              # DEVELOPMENT CONTAINERS (Docker Hub images, for fallback/development)
              # =============================================================================
              bb-portfolio-frontend-dev:
                container_name: bb-portfolio-frontend-dev
                image: bhbaysinger/bb-portfolio-frontend:dev
                ports:
                  - "4000:3000"
                environment:
                  - NODE_ENV=development
                  - ENV_PROFILE=dev
                profiles:
                  - dev
                restart: unless-stopped

              bb-portfolio-backend-dev:
                container_name: bb-portfolio-backend-dev  
                image: bhbaysinger/bb-portfolio-backend:dev
                ports:
                  - "4001:3000"
                environment:
                  - NODE_ENV=development
                  - ENV_PROFILE=dev
                  - PORT=3000
                profiles:
                  - dev
                restart: unless-stopped
COMPOSE_EOF

# Set proper ownership for ec2-user
chown -R ec2-user:ec2-user /home/ec2-user/portfolio

            # Create a startup script for the containers
            cat > /home/ec2-user/portfolio/start-containers.sh << SCRIPT_EOF
            #!/bin/bash
            cd /home/ec2-user/portfolio
            
            echo "\$(date): Starting portfolio container startup process" >> /var/log/bb-portfolio-startup.log
            
            # Wait for environment files to be generated (max 10 minutes)
            echo "Waiting for environment files to be generated..."
            for i in {1..120}; do
                if [[ -f "/home/ec2-user/portfolio/backend/.env.prod" && -f "/home/ec2-user/portfolio/frontend/.env.prod" ]]; then
                    echo "Environment files found, proceeding with container startup"
                    break
                fi
                echo "Attempt \$i/120: Waiting for environment files..."
                sleep 5
            done
            
            if [[ ! -f "/home/ec2-user/portfolio/backend/.env.prod" ]]; then
                echo "ERROR: Backend environment file not found after 10 minutes" >> /var/log/bb-portfolio-startup.log
                exit 1
            fi
            
            # Authenticate with ECR for production images
            aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin 778230822028.dkr.ecr.us-west-2.amazonaws.com
            
            # Pull latest production images
            docker pull 778230822028.dkr.ecr.us-west-2.amazonaws.com/bb-portfolio-frontend-dev:latest
            docker pull 778230822028.dkr.ecr.us-west-2.amazonaws.com/bb-portfolio-backend-dev:latest
            
            # Start production containers with environment file
            docker-compose --profile prod up -d
            
            # Log the successful startup
            echo "\$(date): Portfolio production containers started successfully" >> /var/log/bb-portfolio-startup.log
SCRIPT_EOF
            
            chmod +x /home/ec2-user/portfolio/start-containers.sh

# Create systemd service for automatic container startup
cat > /etc/systemd/system/portfolio.service << SERVICE_EOF
[Unit]
Description=BB-Portfolio Docker Containers
After=docker.service nginx.service
Requires=docker.service
BindsTo=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ec2-user/portfolio
ExecStart=/home/ec2-user/portfolio/start-containers.sh
User=root
Group=root

[Install]
WantedBy=multi-user.target
SERVICE_EOF

# Enable the portfolio service but don't start it automatically
# Let GitHub Actions handle container deployment with proper environment files
systemctl daemon-reload
systemctl enable portfolio.service

# Note: Containers will be started by GitHub Actions deployment
echo "Infrastructure ready. Containers will be deployed via GitHub Actions." >> /var/log/bb-portfolio-startup.log

EOF

  tags = {
    Name = "bb-portfolio"
  }
}

# Output the public IP and Elastic IP
output "bb_portfolio_instance_ip" {
  value = aws_instance.bb_portfolio.public_ip
}

output "bb_portfolio_elastic_ip" {
  value = aws_eip.bb_portfolio_ip.public_ip
  description = "The Elastic IP address assigned to the portfolio instance. Point your domain DNS A records to this IP."
}

output "bb_portfolio_ssh_command" {
  value = "ssh -i ~/.ssh/bb-portfolio-site-key.pem ec2-user@${aws_eip.bb_portfolio_ip.public_ip}"
  description = "SSH command to connect to the portfolio instance"
}

output "bb_portfolio_website_url" {
  value = "http://${aws_eip.bb_portfolio_ip.public_ip}"
  description = "Direct URL to access the portfolio website"
}



resource "aws_eip_association" "bb_portfolio_assoc" {
  instance_id   = aws_instance.bb_portfolio.id
  allocation_id = aws_eip.bb_portfolio_ip.id
}

########################################
# S3 media buckets (one per environment)
########################################

# Create a versioned, private bucket for each env in var.media_envs
resource "aws_s3_bucket" "media" {
  for_each = toset(var.media_envs)

  # Bucket names must be globally unique across AWS
  bucket = lower(
    trim(
      join("-", compact([
        replace(var.project_name, "_", "-"),
        "media",
        each.value,
        var.media_bucket_suffix
      ])),
      "-"
    )
  )

  force_destroy = false

  tags = {
    Project = var.project_name
    Env     = each.value
  }
}

resource "aws_s3_bucket_versioning" "media" {
  for_each = aws_s3_bucket.media
  bucket   = each.value.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "media" {
  for_each = aws_s3_bucket.media
  bucket   = each.value.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Default to SSE-S3 (AES256). Swap to KMS if needed later.
resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  for_each = aws_s3_bucket.media
  bucket   = each.value.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Simple CORS for GET/HEAD. Tighten allowed_origins in terraform.tfvars if needed.
resource "aws_s3_bucket_cors_configuration" "media" {
  for_each = aws_s3_bucket.media
  bucket   = each.value.id

  cors_rule {
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = var.media_cors_allowed_origins
    allowed_headers = ["*"]
    expose_headers  = []
    max_age_seconds = 300
  }
}

# IAM: Grant EC2 role access to read/write objects in media buckets
resource "aws_iam_policy" "media_access" {
  name        = "${var.project_name}-media-access"
  description = "Allow EC2 backend to access media S3 buckets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ListMediaBuckets"
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = [for b in aws_s3_bucket.media : b.arn]
      },
      {
        Sid    = "RWMediaObjects"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:AbortMultipartUpload",
          "s3:ListBucketMultipartUploads",
          "s3:ListMultipartUploadParts"
        ]
        Resource = [for b in aws_s3_bucket.media : "${b.arn}/*"]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "media_access_attach" {
  role       = aws_iam_role.ssm_role.name
  policy_arn = aws_iam_policy.media_access.arn
}

# =============================================================================
# ECR REPOSITORIES
# =============================================================================
# Private container registries for frontend and backend images
# Used by CI/CD pipeline for production deployments
# =============================================================================

resource "aws_ecr_repository" "frontend" {
  name                 = "bb-portfolio-frontend-dev"
  image_tag_mutability = "MUTABLE"
  force_delete        = true # Allow deletion even with images (for portfolio project)

  lifecycle {
    prevent_destroy = true # Protect repository from terraform destroy
  }

  image_scanning_configuration {
    scan_on_push = true # Automatic vulnerability scanning
  }

  tags = {
    Name        = "BB Portfolio Frontend"
    Environment = "production"
    Project     = "bb-portfolio"
  }
}

resource "aws_ecr_repository" "backend" {
  name                 = "bb-portfolio-backend-prod"
  image_tag_mutability = "MUTABLE"
  force_delete        = true # Allow deletion even with images (for portfolio project)

  lifecycle {
    prevent_destroy = true # Protect repository from terraform destroy
  }

  image_scanning_configuration {
    scan_on_push = true # Automatic vulnerability scanning
  }

  tags = {
    Name        = "BB Portfolio Backend"
    Environment = "production"
    Project     = "bb-portfolio"
  }
}

# ECR Lifecycle Policy - Keep only latest 10 images to manage storage costs
resource "aws_ecr_lifecycle_policy" "frontend_policy" {
  repository = aws_ecr_repository.frontend.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep only 10 most recent images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = {
        type = "expire"
      }
    }]
  })
}

resource "aws_ecr_lifecycle_policy" "backend_policy" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep only 10 most recent images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = {
        type = "expire"
      }
    }]
  })
}

# IAM Policy for ECR access from EC2 instance
resource "aws_iam_policy" "ecr_access" {
  name        = "bb-portfolio-ecr-access"
  description = "Allow EC2 instance to pull from ECR repositories"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecr_access_attach" {
  role       = aws_iam_role.ssm_role.name
  policy_arn = aws_iam_policy.ecr_access.arn
}

# SSH connection helper - use standard automation practices
# Each instance gets fresh host keys (security best practice)
# Automation disables host key checking (standard for IaC)

# Infrastructure as Code Validation
# Test the complete deployment after everything is set up
resource "null_resource" "iac_validation" {
  # Trigger this whenever the instance changes
  triggers = {
    instance_id = aws_instance.bb_portfolio.id
  }

  # Wait for user_data to complete and test the deployment
  provisioner "local-exec" {
    command = <<-EOT
      echo "=== Infrastructure as Code Validation ==="
      echo "Waiting for user_data script to complete..."
      sleep 180  # Give user_data time to complete
      
      echo "Testing SSH connection and deployment..."
      ssh -i ~/.ssh/bb-portfolio-site-key.pem -o ConnectTimeout=10 -o StrictHostKeyChecking=no ec2-user@${aws_eip.bb_portfolio_ip.public_ip} '
        echo "=== Pure IaC Test Results ==="
        echo "Instance ID: $(curl -s http://169.254.169.254/latest/meta-data/instance-id)"
        echo "Uptime: $(uptime)"
        
        echo -e "\n=== Files created by Terraform user_data ==="
        ls -la /home/ec2-user/portfolio/ 2>/dev/null || echo "Portfolio directory not ready yet"
        
        echo -e "\n=== Environment file check ==="
        if [ -f /home/ec2-user/portfolio/backend/.env.prod ] && [ -f /home/ec2-user/portfolio/frontend/.env.prod ]; then
          echo "✅ backend/.env.prod and frontend/.env.prod created by Terraform"
          echo "Backend env vars: $(grep -c "=" /home/ec2-user/portfolio/backend/.env.prod)"
          echo "Frontend env vars: $(grep -c "=" /home/ec2-user/portfolio/frontend/.env.prod)"
        else
          echo "❌ One or both env files not found (backend/frontend)"
        fi
        
        echo -e "\n=== Docker Compose check ==="
        if grep -q "env_file:" /home/ec2-user/portfolio/docker-compose.yml 2>/dev/null; then
          echo "✅ docker-compose.yml uses env_file (proper IaC config)"
        else
          echo "❌ docker-compose.yml does not use env_file"
        fi
        
        echo -e "\n=== Services status ==="
        echo "Docker: $(systemctl is-active docker)"
        echo "Nginx: $(systemctl is-active nginx)"
        
        echo -e "\n=== Container status ==="
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "No containers running yet"
        
        echo -e "\n=== Site accessibility test ==="
        if curl -s -I http://localhost:3000 | head -1 | grep -q "200 OK"; then
          echo "✅ Frontend responding"
        else
          echo "❌ Frontend not responding"
        fi
        
        if curl -s -I http://localhost:3001/api/health | head -1 | grep -q "200 OK"; then
          echo "✅ Backend responding"
        else
          echo "❌ Backend not responding"
        fi
      '
      
      echo -e "\n=== External accessibility test ==="
      if curl -s -I http://${aws_eip.bb_portfolio_ip.public_ip} | head -1 | grep -q "200 OK"; then
        echo "✅ Site accessible externally at http://${aws_eip.bb_portfolio_ip.public_ip}"
      else
        echo "❌ Site not accessible externally"
      fi
      
      echo -e "\n=== Infrastructure as Code validation complete ==="
    EOT
  }

  depends_on = [aws_eip_association.bb_portfolio_assoc]
}