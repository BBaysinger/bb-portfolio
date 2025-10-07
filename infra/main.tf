provider "aws" {
  region = var.region
}

# Security Group for SSH, HTTP, HTTPS
resource "aws_security_group" "portfolio_sg" {
  name        = "portfolio-sg"
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

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# IAM Role for SSM (Session Manager)
resource "aws_iam_role" "ssm_role" {
  name = "portfolio-ssm-role"

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
  name = "portfolio-ssm-profile"
  role = aws_iam_role.ssm_role.name
}

# Elastic IP
resource "aws_eip" "portfolio_ip" {
  # Nothing else needed, defaults to VPC
}

# EC2 Instance
resource "aws_instance" "portfolio" {
  ami           = "ami-06a974f9b8a97ecf2" # Amazon Linux 2023 AMI ID for us-west-2 (2023.8.20250915.0)
  instance_type = "t3.medium"
  key_name      = "bb-portfolio-site-key" # must exist in AWS console

  vpc_security_group_ids = [aws_security_group.portfolio_sg.id]
  iam_instance_profile   = aws_iam_instance_profile.ssm_profile.name

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
    
    # Create Nginx configuration for portfolio
    cat > /etc/nginx/conf.d/portfolio.conf << NGINX_EOF
server {
    listen 80;
    server_name bbinteractive.io www.bbinteractive.io _;
    
    # Frontend proxy to development container (port 4000)
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
    
    # API proxy to development backend (port 4001)
    location /api/ {
        proxy_pass http://localhost:4001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX_EOF
    
    # Disable default Nginx server block by commenting it out
    sed -i '/^    server {/,/^    }/s/^/#/' /etc/nginx/nginx.conf
    
    # Test and start Nginx
    nginx -t && systemctl start nginx
    
    # Setup Docker deployment directory and files
    mkdir -p /home/ec2-user/portfolio
    cd /home/ec2-user/portfolio
    
    # Create docker-compose.yml for the portfolio application
    cat > /home/ec2-user/portfolio/docker-compose.yml << COMPOSE_EOF
services:
  # =============================================================================
  # PRODUCTION CONTAINERS (ECR images, for production deployment)
  # =============================================================================
  frontend-prod:
    container_name: portfolio-frontend-prod
    image: ${aws_ecr_repository.frontend.repository_url}:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - ENV_PROFILE=prod
    profiles:
      - prod
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend-prod:
    container_name: portfolio-backend-prod
    image: ${aws_ecr_repository.backend.repository_url}:latest
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=production
      - ENV_PROFILE=prod
    profiles:
      - prod
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # =============================================================================
  # DEVELOPMENT CONTAINERS (Docker Hub images, for fallback/development)
  # =============================================================================
  frontend-dev:
    container_name: portfolio-frontend-dev
    image: bhbaysinger/portfolio-frontend:dev
    ports:
      - "4000:3000"
    environment:
      - NODE_ENV=development
      - ENV_PROFILE=dev
    profiles:
      - dev
    restart: unless-stopped

  backend-dev:
    container_name: portfolio-backend-dev  
    image: bhbaysinger/portfolio-backend:dev
    ports:
      - "4001:3000"
    environment:
      - NODE_ENV=development
      - ENV_PROFILE=dev
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

# Install Docker Compose if not available
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Start development containers by default (they work reliably)
sudo docker-compose --profile dev up -d

# Log the startup
echo "\$$(date): Portfolio containers started" >> /var/log/portfolio-startup.log
SCRIPT_EOF

    chmod +x /home/ec2-user/portfolio/start-containers.sh
    
    # Create systemd service for automatic container startup
    cat > /etc/systemd/system/portfolio.service << SERVICE_EOF
[Unit]
Description=Portfolio Docker Containers
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

    # Enable and start the portfolio service
    systemctl daemon-reload
    systemctl enable portfolio.service
    
    # Start containers after a short delay to ensure Docker is fully ready
    sleep 10
    systemctl start portfolio.service
    
  EOF

  tags = {
    Name = "bb-portfolio"
  }
}

# Output the public IP and Elastic IP
output "portfolio_instance_ip" {
  value = aws_instance.portfolio.public_ip
}

output "portfolio_elastic_ip" {
  value = aws_eip.portfolio_ip.public_ip
  description = "The Elastic IP address assigned to the portfolio instance. Point your domain DNS A records to this IP."
}

output "portfolio_ssh_command" {
  value = "ssh -i ~/.ssh/bb-portfolio-site-key.pem ec2-user@${aws_eip.portfolio_ip.public_ip}"
  description = "SSH command to connect to the portfolio instance"
}

output "portfolio_website_url" {
  value = "http://${aws_eip.portfolio_ip.public_ip}"
  description = "Direct URL to access the portfolio website"
}



resource "aws_eip_association" "portfolio_assoc" {
  instance_id   = aws_instance.portfolio.id
  allocation_id = aws_eip.portfolio_ip.id
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
  name                 = "bb-portfolio-frontend"
  image_tag_mutability = "MUTABLE"
  force_delete        = true # Allow deletion even with images (for portfolio project)

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
  name                 = "bb-portfolio-backend"
  image_tag_mutability = "MUTABLE"
  force_delete        = true # Allow deletion even with images (for portfolio project)

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