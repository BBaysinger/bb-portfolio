output "instance_id" {
  description = "ID of the green (active) EC2 instance"
  value       = var.create_green_instance ? aws_instance.bb_portfolio_green[0].id : null
}

output "public_ip" {
  description = "Public IP of the green (active) instance"
  value       = var.create_green_instance ? aws_instance.bb_portfolio_green[0].public_ip : null
}

output "elastic_ip" {
  description = "Elastic IP address"
  value       = aws_eip.bb_portfolio_ip.public_ip
}

# ===============================
# Blue (Candidate) Outputs
# ===============================
output "blue_instance_id" {
  description = "ID of blue (candidate) EC2 instance"
  value       = aws_instance.bb_portfolio_blue.id
}

output "blue_instance_public_ip" {
  description = "Public IP of blue (candidate) instance"
  value       = aws_instance.bb_portfolio_blue.public_ip
}

output "blue_elastic_ip" {
  description = "Elastic IP attached to blue (candidate) instance"
  value       = aws_eip.bb_portfolio_blue_ip.public_ip
}

output "blue_ssh_command" {
  description = "SSH command for blue (candidate) instance"
  value       = "ssh -i ~/.ssh/${var.key_name}.pem ec2-user@${aws_eip.bb_portfolio_blue_ip.public_ip}"
}

output "blue_website_url" {
  description = "HTTP URL for blue (candidate) instance for testing"
  value       = "http://${aws_eip.bb_portfolio_blue_ip.public_ip}"
}

output "deployment_version" {
  description = "Version string applied to instances for rollout lineage"
  value       = var.deployment_version
}

output "media_bucket_names" {
  description = "Map of access_level => S3 bucket name for media"
  value       = { for access_level, b in aws_s3_bucket.media : access_level => b.bucket }
}

output "media_bucket_arns" {
  description = "Map of access_level => S3 bucket ARN for media"
  value       = { for access_level, b in aws_s3_bucket.media : access_level => b.arn }
}

output "ecr_frontend_repository_url" {
  description = "URL of the frontend ECR repository"
  value       = aws_ecr_repository.frontend.repository_url
}

output "ecr_backend_repository_url" {
  description = "URL of the backend ECR repository"  
  value       = aws_ecr_repository.backend.repository_url
}