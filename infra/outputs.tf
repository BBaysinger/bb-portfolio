output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.bb_portfolio.id
}

output "public_ip" {
  description = "Public IP of the instance"
  value       = aws_instance.bb_portfolio.public_ip
}

output "elastic_ip" {
  description = "Elastic IP address"
  value       = aws_eip.bb_portfolio_ip.public_ip
}

# ===============================
# Secondary (Blue/Canary) Outputs
# ===============================
output "secondary_instance_id" {
  description = "ID of secondary EC2 instance (null if not created)"
  value       = var.create_secondary_instance ? aws_instance.bb_portfolio_blue[0].id : null
}

output "secondary_instance_public_ip" {
  description = "Public IP of secondary instance (ephemeral ENI address; may differ from Elastic IP)"
  value       = var.create_secondary_instance ? aws_instance.bb_portfolio_blue[0].public_ip : null
}

output "secondary_elastic_ip" {
  description = "Elastic IP attached to secondary instance (null if disabled)"
  value       = var.create_secondary_instance ? aws_eip.bb_portfolio_blue_ip[0].public_ip : null
}

output "secondary_ssh_command" {
  description = "SSH command for secondary instance (null if disabled)"
  value       = var.create_secondary_instance ? "ssh -i ~/.ssh/${var.key_name}.pem ec2-user@${aws_eip.bb_portfolio_blue_ip[0].public_ip}" : null
}

output "secondary_website_url" {
  description = "HTTP URL for secondary instance for test/canary access (null if disabled)"
  value       = var.create_secondary_instance ? "http://${aws_eip.bb_portfolio_blue_ip[0].public_ip}" : null
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