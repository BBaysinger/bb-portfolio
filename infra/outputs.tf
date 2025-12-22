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

# CloudWatch RUM outputs
output "rum_app_monitor_id" {
  description = "CloudWatch RUM App Monitor ID"
  # NOTE: RUM PutRumEvents requires the UUID app monitor ID (not the monitor name).
  # Terraform exposes this as `app_monitor_id`. The resource `id` is the monitor name.
  value = aws_rum_app_monitor.main.app_monitor_id
}

output "rum_app_monitor_name" {
  description = "CloudWatch RUM App Monitor name"
  value       = aws_rum_app_monitor.main.name
}

output "rum_identity_pool_id" {
  description = "Cognito Identity Pool ID for RUM"
  value       = aws_cognito_identity_pool.rum.id
}

output "rum_guest_role_arn" {
  description = "IAM Role ARN for unauthenticated RUM access"
  value       = aws_iam_role.rum_unauthenticated.arn
}

output "rum_region" {
  description = "AWS region for RUM"
  value       = var.region
}