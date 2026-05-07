# Keep existing bucket names (account-id suffix) to avoid destructive replacements.
bucket_suffix             = "716742854727"
# Force Amazon Linux 2023 AMI to match user_data expectations (ec2-user, yum, amazon-ssm-agent)
ami_id                    = "ami-06a974f9b8a97ecf2"
manage_iam_user_policies  = true
