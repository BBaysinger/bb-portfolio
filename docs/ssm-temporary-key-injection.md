# Temporary SSM Key Injection (Least Privilege)

You discovered that the local private key `~/.ssh/bb-portfolio-site-key.pem` does **not** match the key pair actually embedded in the EC2 instance(s). To avoid rebuilding the candidate instance, you can temporarily grant *scoped* SSM permissions, inject your current public key, and then revoke the permission.

## 1. Rationale
Using SSM `SendCommand` lets you append a new authorized key without exposing broad SSH or full administrator privileges. We constrain allowed actions:
- Action: `ssm:SendCommand` only
- Resource: specific instance ARN
- Condition: allowed SSM documents = `AWS-RunShellScript`

## 2. IAM Policy JSON (Inline or Managed)
Replace ACCOUNT_ID and INSTANCE_ID with your values.

The earlier example used a `Condition` with `ssm:DocumentName`, but AWS IAM does **not** support that as a condition key; instead you must scope the document explicitly in the `Resource` list. For `ssm:SendCommand`, valid resource types include the target instance *and* the SSM document. We restrict to the single instance ARN plus the AWS provided `AWS-RunShellScript` document ARN.

```jsonc
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowScopedRunShellScriptOnCandidate",
      "Effect": "Allow",
      "Action": "ssm:SendCommand",
      "Resource": [
        "arn:aws:ec2:us-west-2:ACCOUNT_ID:instance/INSTANCE_ID",
        "arn:aws:ssm:us-west-2:*:document/AWS-RunShellScript"
      ]
    },
    {
      "Sid": "AllowListGetForShellScriptDoc",
      "Effect": "Allow",
      "Action": [
        "ssm:ListCommands",
        "ssm:ListCommandInvocations",
        "ssm:GetCommandInvocation"
      ],
      "Resource": "*"
    }
  ]
}
```
Optional: If the role currently lacks `iam:PassRole` constraints for SSM association, verify the instance profile already has SSM core permissions (usually `AmazonSSMManagedInstanceCore`). You do **not** need to add that here; it's instance-side.

## 3. Attach Policy
1. Create a managed policy (or inline on your IAM user) with the JSON above.
2. Substitute:
   - `ACCOUNT_ID` → Your AWS account ID
   - `INSTANCE_ID` → Candidate instance id (e.g. `i-06148a1e16a2d1851`)

## 4. Inject Public Key
From your local machine (ensure `AWS_PROFILE` set):
```zsh
PUB=$(ssh-keygen -y -f ~/.ssh/bb-portfolio-site-key.pem)
aws ssm send-command \
  --region us-west-2 \
  --profile bb-portfolio-user \
  --document-name AWS-RunShellScript \
  --instance-ids i-06148a1e16a2d1851 \
  --comment 'Append missing public key for ec2-user' \
  --parameters commands="[ 'mkdir -p /home/ec2-user/.ssh', 'chmod 700 /home/ec2-user/.ssh', 'grep -qxF \"'$PUB'\" /home/ec2-user/.ssh/authorized_keys || echo \"'$PUB'\" >> /home/ec2-user/.ssh/authorized_keys', 'chmod 600 /home/ec2-user/.ssh/authorized_keys' ]" \
  --query 'Command.CommandId' --output text
```
This is idempotent: it checks if the key already exists before appending.

> Default user differences: If your AMI uses a different primary login user (e.g. `ubuntu`, `admin`, `al2023`, `centos`, `fedora`, `opc`), substitute that username anywhere `ec2-user` appears (home directory path and SSH target). For example, on an Ubuntu-based image:
> ```zsh
> PUB=$(ssh-keygen -y -f ~/.ssh/bb-portfolio-site-key.pem)
> aws ssm send-command \
>   --region us-west-2 \
>   --profile bb-portfolio-user \
>   --document-name AWS-RunShellScript \
>   --instance-ids i-06148a1e16a2d1851 \
>   --comment 'Append missing public key for ubuntu' \
>   --parameters commands="[ 'mkdir -p /home/ubuntu/.ssh', 'chmod 700 /home/ubuntu/.ssh', 'grep -qxF \"'$PUB'\" /home/ubuntu/.ssh/authorized_keys || echo \"'$PUB'\" >> /home/ubuntu/.ssh/authorized_keys', 'chmod 600 /home/ubuntu/.ssh/authorized_keys' ]" \
>   --query 'Command.CommandId' --output text
> ```
> Then SSH with: `ssh -i ~/.ssh/bb-portfolio-site-key.pem ubuntu@CANDIDATE_PUBLIC_IP`

## 5. Verify & SSH
Wait a few seconds, then:
```zsh
aws ssm list-command-invocations \
  --region us-west-2 \
  --profile bb-portfolio-user \
  --details \
  --command-id YOUR_COMMAND_ID

ssh -i ~/.ssh/bb-portfolio-site-key.pem ec2-user@CANDIDATE_PUBLIC_IP
```
If it still fails, confirm:
- Instance has SSM agent (Amazon Linux 2023 AMI includes it).
- Instance IAM role includes `AmazonSSMManagedInstanceCore`.
- Security group allows outbound HTTPS (443) for SSM.

## 6. Revoke Permission
Immediately detach / delete the temporary policy once SSH works.

## 7. Next Steps After Access
1. Deploy containers to candidate (mirror active).
2. Run promotion script (`scripts/eip-handover.sh`).
3. Apply retention logic if configured.

## 8. Alternate Path (Recreate Instance)
If SSM cannot be used (policy restrictions or agent unreachable), recreate candidate with a fresh known key pair:
- Create new key pair: `aws ec2 create-key-pair --key-name bb-portfolio-fresh-key --query 'KeyMaterial' --output text > ~/.ssh/bb-portfolio-fresh-key.pem`
- Update `key_name` in `infra/terraform.tfvars` (or source secret file) and `terraform apply -target aws_instance.secondary`.

## 9. Security Notes
- Limiting by `ssm:DocumentName` prevents arbitrary script documents.
- Using grep guard avoids duplicate entries.
- Revocation reduces blast radius window.

## 10. Cleanup Checklist
- [ ] Confirm key appears once in authorized_keys
- [ ] Remove temporary IAM policy
- [ ] Rotate local private key storage permissions (`chmod 400`)
- [ ] Log time of injection for auditing
