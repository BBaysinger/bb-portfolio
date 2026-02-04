# Local override to enable secondary (candidate) instance
create_secondary_instance = true
secondary_instance_name   = "bb-portfolio-blue"
# Keep existing bucket names (account-id suffix) to avoid destructive replacements.
bucket_suffix             = "716742854727"
# Force Amazon Linux 2023 AMI to match user_data expectations (ec2-user, yum, amazon-ssm-agent)
ami_id                    = "ami-06a974f9b8a97ecf2"
# Optional version tag for traceability; update as desired
deployment_version        = "candidate-2025-11-14"
manage_iam_user_policies  = true
