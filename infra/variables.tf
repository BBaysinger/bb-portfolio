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