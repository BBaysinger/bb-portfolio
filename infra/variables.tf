variable "region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-west-2"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.small"
}

variable "key_name" {
  description = "Name of the AWS key pair to use"
  type        = string
}

variable "ami_id" {
  description = "Amazon Linux 2023 AMI ID for the region"
  type        = string
}

variable "project_name" {
  description = "Tag prefix for resources"
  type        = string
  default     = "bb-portfolio"
}

# Environments to provision media buckets for
variable "media_envs" {
  description = "List of environment names to create S3 media buckets for (e.g., [\"dev\", \"stg\", \"prod\"])."
  type        = list(string)
  default     = ["dev", "prod"]
}

# Optional suffix to ensure global uniqueness (e.g., your initials or short hash)
variable "media_bucket_suffix" {
  description = "Optional bucket name suffix to ensure global uniqueness (lowercase alphanumerics and hyphens)."
  type        = string
  default     = ""
}

# Allowed origins for S3 CORS (GET/HEAD)
variable "media_cors_allowed_origins" {
  description = "Allowed origins for S3 CORS on media buckets."
  type        = list(string)
  default = [
    "http://localhost:8080",
    "http://localhost:8081",
    "http://localhost:3000",
  ]
}

# =============================================================================
# ENVIRONMENT VARIABLES FOR CONTAINERS
# =============================================================================

variable "aws_access_key_id" {
  description = "AWS access key ID for services"
  type        = string
  sensitive   = true
}

variable "aws_secret_access_key" {
  description = "AWS secret access key for services"
  type        = string
  sensitive   = true
}

variable "prod_aws_region" {
  description = "AWS region for production environment"
  type        = string
  default     = "us-west-2"
}

variable "prod_mongodb_uri" {
  description = "MongoDB connection string for production"
  type        = string
  sensitive   = true
}

variable "prod_payload_secret" {
  description = "Payload CMS secret for production"
  type        = string
  sensitive   = true
}

variable "prod_s3_bucket" {
  description = "S3 bucket name for production media"
  type        = string
}

variable "prod_frontend_url" {
  description = "Frontend URL for production CORS"
  type        = string
}

variable "prod_next_public_backend_url" {
  description = "Backend URL for frontend client-side requests"
  type        = string
}

variable "prod_backend_internal_url" {
  description = "Backend URL for container-to-container communication"
  type        = string
}

variable "prod_ses_from_email" {
  description = "SES from email for production"
  type        = string
}

variable "prod_ses_to_email" {
  description = "SES to email for production"
  type        = string
}

# =============================================================================
# DEVELOPMENT ENVIRONMENT VARIABLES
# =============================================================================

variable "dev_aws_region" {
  description = "AWS region for development environment"
  type        = string
  default     = "us-west-2"
}

variable "dev_mongodb_uri" {
  description = "MongoDB connection string for development"
  type        = string
  sensitive   = true
}

variable "dev_payload_secret" {
  description = "Payload CMS secret for development"
  type        = string
  sensitive   = true
}

variable "dev_s3_bucket" {
  description = "S3 bucket name for development media"
  type        = string
}

variable "dev_backend_internal_url" {
  description = "Backend URL for dev container-to-container communication"
  type        = string
}

variable "dev_ses_from_email" {
  description = "SES from email for development"
  type        = string
}

variable "dev_ses_to_email" {
  description = "SES to email for development"
  type        = string
}