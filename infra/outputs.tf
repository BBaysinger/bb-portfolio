output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.portfolio.id
}

output "public_ip" {
  description = "Public IP of the instance"
  value       = aws_instance.portfolio.public_ip
}

output "elastic_ip" {
  description = "Elastic IP address"
  value       = aws_eip.portfolio_ip.public_ip
}

output "media_bucket_names" {
  description = "Map of env => S3 bucket name for media"
  value       = { for env, b in aws_s3_bucket.media : env => b.bucket }
}

output "media_bucket_arns" {
  description = "Map of env => S3 bucket ARN for media"
  value       = { for env, b in aws_s3_bucket.media : env => b.arn }
}

output "ecr_frontend_repository_url" {
  description = "URL of the frontend ECR repository"
  value       = aws_ecr_repository.frontend.repository_url
}

output "ecr_backend_repository_url" {
  description = "URL of the backend ECR repository"  
  value       = aws_ecr_repository.backend.repository_url
}