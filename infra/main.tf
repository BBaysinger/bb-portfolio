provider "aws" {
  region = "us-west-2"
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
  instance_type = "t3.small"
  key_name      = "bb-portfolio-site-key" # must exist in AWS console

  vpc_security_group_ids = [aws_security_group.portfolio_sg.id]
  iam_instance_profile   = aws_iam_instance_profile.ssm_profile.name

  associate_public_ip_address = true

  user_data = <<-EOF
    #!/bin/bash
    yum update -y
    yum install -y docker git
    systemctl enable docker
    systemctl start docker
    systemctl enable amazon-ssm-agent
    systemctl start amazon-ssm-agent
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
}

resource "aws_eip_association" "portfolio_assoc" {
  instance_id   = aws_instance.portfolio.id
  allocation_id = aws_eip.portfolio_ip.id
}