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
    "http://localhost:3000",
    "http://localhost:3001",
  ]
}