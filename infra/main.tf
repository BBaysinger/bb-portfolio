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

# Install Docker Compose (static binary)
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

# NOTE: We intentionally do NOT write a site-specific Nginx config here.
# The deploy orchestrator (or manual sync:nginx) manages /etc/nginx/conf.d/bb-portfolio.conf

# Disable default Nginx server block by commenting it out
sed -i '/^    server {/,/^    }/s/^/#/' /etc/nginx/nginx.conf

# Test and start Nginx
nginx -t && systemctl start nginx

# Certbot/cert issuance is handled by the deploy orchestrator (SSH step)


# Prepare application directories (orchestrator will populate)
mkdir -p /home/ec2-user/portfolio/backend
mkdir -p /home/ec2-user/portfolio/frontend
chown -R ec2-user:ec2-user /home/ec2-user/portfolio

# Note: Containers and Nginx config will be managed by the deployment orchestrator.
echo "Infrastructure baseline ready. Containers will be deployed via GitHub Actions." >> /var/log/bb-portfolio-startup.log

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

output "projects_bucket_website_urls" {
  value = {
    for access_level, bucket in aws_s3_bucket.projects :
    access_level => "http://${bucket.bucket}.s3-website-${var.region}.amazonaws.com"
  }
  description = "S3 website URLs for project buckets"
}

output "projects_bucket_names" {
  value = {
    for access_level, bucket in aws_s3_bucket.projects :
    access_level => bucket.bucket
  }
  description = "Names of the project S3 buckets"
}

resource "aws_eip_association" "bb_portfolio_assoc" {
  instance_id   = aws_instance.bb_portfolio.id
  allocation_id = aws_eip.bb_portfolio_ip.id
}

########################################
# S3 buckets - Media (dev/prod) and Projects (public/nda)
########################################

# Media buckets for Payload CMS (environment-based: dev/prod)
resource "aws_s3_bucket" "media" {
  for_each = toset(var.media_environments)

  # Bucket names must be globally unique across AWS
  bucket = lower(
    trim(
      join("-", compact([
        replace(var.project_name, "_", "-"),
        "media",
        each.value,
        var.bucket_suffix
      ])),
      "-"
    )
  )

  force_destroy = false

  tags = {
    Project     = var.project_name
    BucketType  = "media"
    Environment = each.value
  }
}

# Project buckets for static files (access-based: public/nda)
resource "aws_s3_bucket" "projects" {
  for_each = toset(var.project_access_levels)

  # Bucket names must be globally unique across AWS
  bucket = lower(
    trim(
      join("-", compact([
        replace(var.project_name, "_", "-"),
        "projects",
        each.value,
        var.bucket_suffix
      ])),
      "-"
    )
  )

  force_destroy = false

  tags = {
    Project     = var.project_name
    BucketType  = "projects"
    AccessLevel = each.value
  }
}

# Bucket versioning for both media and projects
resource "aws_s3_bucket_versioning" "media" {
  for_each = aws_s3_bucket.media
  bucket   = each.value.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "projects" {
  for_each = aws_s3_bucket.projects
  bucket   = each.value.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Public access block for both bucket types
resource "aws_s3_bucket_public_access_block" "media" {
  for_each = aws_s3_bucket.media
  bucket   = each.value.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "projects" {
  for_each = aws_s3_bucket.projects
  bucket   = each.value.id

  # Allow public policies for website hosting
  block_public_acls       = true
  block_public_policy     = false  # Changed to false for website hosting
  ignore_public_acls      = true
  restrict_public_buckets = false  # Changed to false for website hosting
}

# Server-side encryption for both bucket types
resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  for_each = aws_s3_bucket.media
  bucket   = each.value.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "projects" {
  for_each = aws_s3_bucket.projects
  bucket   = each.value.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# CORS configuration for both bucket types
resource "aws_s3_bucket_cors_configuration" "media" {
  for_each = aws_s3_bucket.media
  bucket   = each.value.id

  cors_rule {
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = var.s3_cors_allowed_origins
    allowed_headers = ["*"]
    expose_headers  = []
    max_age_seconds = 300
  }
}

resource "aws_s3_bucket_cors_configuration" "projects" {
  for_each = aws_s3_bucket.projects
  bucket   = each.value.id

  cors_rule {
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = var.s3_cors_allowed_origins
    allowed_headers = ["*"]
    expose_headers  = []
    max_age_seconds = 300
  }
}

# Website hosting configuration for project buckets
resource "aws_s3_bucket_website_configuration" "projects" {
  for_each = aws_s3_bucket.projects
  bucket   = each.value.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "error.html"
  }
}

# Bucket policies for public website access
resource "aws_s3_bucket_policy" "projects_public_read" {
  for_each = aws_s3_bucket.projects
  bucket   = each.value.id

  # Wait for public access block to be configured
  depends_on = [aws_s3_bucket_public_access_block.projects]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${each.value.arn}/*"
      }
    ]
  })
}

# IAM: Grant EC2 role access to read/write objects in all S3 buckets
resource "aws_iam_policy" "s3_access" {
  name        = "${var.project_name}-s3-access"
  description = "Allow EC2 backend to access media and project S3 buckets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ListAllBuckets"
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = concat(
          [for b in aws_s3_bucket.media : b.arn],
          [for b in aws_s3_bucket.projects : b.arn]
        )
      },
      {
        Sid    = "RWAllObjects"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:AbortMultipartUpload",
          "s3:ListBucketMultipartUploads",
          "s3:ListMultipartUploadParts"
        ]
        Resource = concat(
          [for b in aws_s3_bucket.media : "${b.arn}/*"],
          [for b in aws_s3_bucket.projects : "${b.arn}/*"]
        )
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "s3_access_attach" {
  role       = aws_iam_role.ssm_role.name
  policy_arn = aws_iam_policy.s3_access.arn
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
        countNumber = 6
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
        countNumber = 6
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

# IAM Policy for SES send access (least privilege)
resource "aws_iam_policy" "ses_send" {
  name        = "bb-portfolio-ses-send"
  description = "Allow sending emails via Amazon SES"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "*" # Optionally scope to verified identity ARNs
      }
    ]
  })
}

# Attach SES policy to EC2 instance role so backend containers can send email without static keys
resource "aws_iam_role_policy_attachment" "ses_send_attach" {
  role       = aws_iam_role.ssm_role.name
  policy_arn = aws_iam_policy.ses_send.arn
}

# IAM Policy for CloudWatch Agent (logs + custom metrics)
resource "aws_iam_policy" "cloudwatch_agent" {
  name        = "${var.project_name}-cloudwatch-agent"
  description = "Allow EC2 instance to publish logs and custom metrics to CloudWatch"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:DescribeLogStreams",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "cloudwatch_agent_attach" {
  role       = aws_iam_role.ssm_role.name
  policy_arn = aws_iam_policy.cloudwatch_agent.arn
}

# =============================================================================
# CloudWatch RUM (Real User Monitoring)
# =============================================================================

# Cognito Identity Pool for RUM (unauthenticated access)
resource "aws_cognito_identity_pool" "rum" {
  identity_pool_name               = "${var.project_name}-rum-identity-pool"
  allow_unauthenticated_identities = true
  allow_classic_flow               = true
}

# IAM role for unauthenticated RUM users
resource "aws_iam_role" "rum_unauthenticated" {
  name = "${var.project_name}-rum-unauth-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.rum.id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "unauthenticated"
          }
        }
      }
    ]
  })
}

# Policy allowing RUM to send data
resource "aws_iam_role_policy" "rum_put_events" {
  name = "${var.project_name}-rum-put-events"
  role = aws_iam_role.rum_unauthenticated.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rum:PutRumEvents"
        ]
        Resource = [
          "arn:aws:rum:${var.region}:${data.aws_caller_identity.current.account_id}:appmonitor/${var.project_name}",
          "arn:aws:rum:${var.region}:${data.aws_caller_identity.current.account_id}:appmonitor/${var.project_name}/*"
        ]
      }
    ]
  })
}

# Attach the unauthenticated role to the identity pool
resource "aws_cognito_identity_pool_roles_attachment" "rum" {
  identity_pool_id = aws_cognito_identity_pool.rum.id

  roles = {
    unauthenticated = aws_iam_role.rum_unauthenticated.arn
  }
}

# CloudWatch RUM App Monitor
resource "aws_rum_app_monitor" "main" {
  name   = var.project_name
  domain = "bbaysinger.com"

  app_monitor_configuration {
    allow_cookies        = true
    enable_xray          = false
    session_sample_rate  = 1.0
    telemetries          = ["errors", "performance", "http"]

    # Optional: Configure which URLs to track
    # included_pages = ["https://bbaysinger.com/*"]
    # excluded_pages = ["https://bbaysinger.com/admin/*"]
  }

  cw_log_enabled = true
}

# Data source to get current AWS account ID
data "aws_caller_identity" "current" {}

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

########################################
# Local Development Environment Files
########################################

# Generate local .env.local for development
resource "local_file" "local_env" {
  filename = "../.env.local"
  content = <<-EOF
# Generated by Terraform - DO NOT EDIT MANUALLY
# Local development environment variables

# S3 Projects Configuration (static files)
PUBLIC_PROJECTS_BUCKET=${var.public_projects_bucket}
NDA_PROJECTS_BUCKET=${var.nda_projects_bucket}

# AWS Configuration for development
AWS_REGION=${var.region}
EOF

  depends_on = [
    aws_s3_bucket.projects
  ]
}