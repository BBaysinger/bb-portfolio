resource "aws_iam_user_policy" "bb_portfolio_passrole" {
  count = var.manage_iam_user_policies ? 1 : 0

  name = "bb-portfolio-passrole"
  user = var.iam_user_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "iam:PassRole"
        Resource = "arn:aws:iam::778230822028:role/bb-portfolio-ssm-role"
      },
      {
        Effect = "Allow"
        Action = [
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy",
          "iam:ListAttachedRolePolicies"
        ]
        Resource = "arn:aws:iam::778230822028:role/bb-portfolio-ssm-role"
      }
    ]
  })
}

# When allowed, attach the SES send policy to the IAM user used for env-injected credentials
resource "aws_iam_user_policy_attachment" "bb_portfolio_ses_send_attach" {
  count      = var.manage_iam_user_policies ? 1 : 0
  user       = var.iam_user_name
  policy_arn = aws_iam_policy.ses_send.arn
}

# Optional: Allow operator to use AWS Systems Manager Run Command for on-box fixes
resource "aws_iam_user_policy" "bb_portfolio_ssm_send" {
  count = var.manage_iam_user_policies ? 1 : 0

  name = "bb-portfolio-ssm-send-command"
  user = var.iam_user_name

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "ssm:SendCommand"
        ],
        Resource = [
          "arn:aws:ec2:${var.region}:778230822028:instance/*",
          "arn:aws:ssm:${var.region}::document/AWS-RunShellScript"
        ]
      },
      {
        Effect = "Allow",
        Action = [
          "ssm:ListCommandInvocations",
          "ssm:GetCommandInvocation"
        ],
        Resource = "*"
      }
    ]
  })
}