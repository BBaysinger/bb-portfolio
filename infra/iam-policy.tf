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

# IAM Policy for CloudWatch RUM and Cognito Identity Pool management
resource "aws_iam_user_policy" "bb_portfolio_rum_cognito" {
  count = var.manage_iam_user_policies ? 1 : 0

  name = "bb-portfolio-rum-cognito"
  user = var.iam_user_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rum:*"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "cognito-identity:*"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:GetRole",
          "iam:UpdateRole",
          "iam:PutRolePolicy",
          "iam:DeleteRolePolicy",
          "iam:GetRolePolicy",
          "iam:ListRolePolicies",
          "iam:TagRole",
          "iam:UntagRole",
          "iam:PassRole"
        ]
        Resource = "arn:aws:iam::778230822028:role/bb-portfolio-rum-*"
      }
    ]
  })
}