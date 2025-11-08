variable "region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-west-2"
}

variable "aws_profile" {
  description = "AWS CLI profile to use for the provider (leave empty to use environment credentials)"
  type        = string
  default     = "bb-portfolio-user"
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

# Media bucket environments (for Payload CMS)
variable "media_environments" {
  description = "List of environments to create S3 media buckets for (dev/prod for Payload CMS uploads)."
  type        = list(string)
  default     = ["dev", "prod"]
}

# Project access levels (for static project files)
variable "project_access_levels" {
  description = "List of access levels to create S3 project buckets for (public for unrestricted access, nda for authenticated content)."
  type        = list(string)
  default     = ["public", "nda"]
}

# Optional suffix to ensure global uniqueness (e.g., your initials or short hash)
variable "bucket_suffix" {
  description = "Optional bucket name suffix to ensure global uniqueness (lowercase alphanumerics and hyphens)."
  type        = string
  default     = ""
}

# Allowed origins for S3 CORS (GET/HEAD)
variable "s3_cors_allowed_origins" {
  description = "Allowed origins for S3 CORS on all buckets."
  type        = list(string)
  default = [
    "http://localhost:8080",
    "http://localhost:8081",
    "http://localhost:3000",
    "https://bbinteractive.io",
    "https://www.bbinteractive.io",
    "https://bbaysinger.com",
    "https://www.bbaysinger.com",
    "https://dev.bbinteractive.io",
    "https://dev.bbaysinger.com",
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

variable "dev_s3_bucket" {
  description = "S3 bucket name for dev media (Payload CMS)"
  type        = string
}

variable "prod_s3_bucket" {
  description = "S3 bucket name for prod media (Payload CMS)"
  type        = string
}

variable "public_projects_bucket" {
  description = "S3 bucket name for public projects (static files)"
  type        = string
}

variable "nda_projects_bucket" {
  description = "S3 bucket name for NDA projects (static files)"
  type        = string
}

variable "prod_frontend_url" {
  description = "Frontend URL for production CORS"
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

# S3 bucket variables moved to public/protected access model above

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

# =============================================================================
# IAM MANAGEMENT TOGGLES
# =============================================================================

variable "manage_iam_user_policies" {
  description = "Whether this apply is allowed to create/modify IAM user inline policies (requires iam:PutUserPolicy)."
  type        = bool
  default     = false
}

variable "iam_user_name" {
  description = "IAM user name that should receive inline policies (used when manage_iam_user_policies=true)."
  type        = string
  default     = "bb-portfolio-user"
}

# Whether to attach the EC2 instance profile/role to instances.
# Set to false when the applying user lacks iam:PassRole; this allows
# instance creation without the role (SSM disabled). You can re-enable later
# after granting permissions.
variable "attach_instance_profile" {
  description = "Attach IAM instance profile to EC2 instances (requires iam:PassRole)"
  type        = bool
  default     = true
}

# =============================================================================
# HTTPS / ACME Configuration
# =============================================================================
# Email used for ACME (Let's Encrypt) registration and renewal notices.
# This is consumed by the EC2 user_data script to acquire certificates via certbot.
variable "acme_registration_email" {
  description = "Email address for Let's Encrypt/ACME certificate registration"
  type        = string
}