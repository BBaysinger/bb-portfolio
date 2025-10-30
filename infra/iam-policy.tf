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