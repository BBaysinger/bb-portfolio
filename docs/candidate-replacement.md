# Candidate Instance Replacement Procedure

This document describes the recommended process to replace a failing *candidate* (blue / canary) EC2 instance in the blue‑green deployment model without disrupting the *active* instance.

## When to Replace
Replace the candidate when ANY of the following are true:
- SSH is unreachable (handshake stalls) after confirming network & key correctness.
- SSM SendCommand invocations consistently return `Failed` with empty output.
- Health endpoints never serve despite containers reporting started.
- User data or baseline bootstrap failed and logs are inaccessible.

## Prefer Recreation Over Manual Repair
Ephemeral candidate instances should be disposable. Recreation is faster and produces a clean baseline you can validate. Avoid time‑consuming volume surgery unless you need data recovery.

## High-Level Steps
1. **Decide Strategy**: Use Terraform taint to force recreation (recommended) OR manually terminate via AWS console (avoids drift only if instance tracked outside Terraform).
2. **Taint Resource** (Terraform-managed candidate):
   ```bash
   terraform taint aws_instance.bb_portfolio_blue[0]
   ```
3. **Apply Plan**:
   ```bash
   terraform apply -auto-approve
   ```
   Ensure `create_secondary_instance = true` remains set. A new instance + EIP association will appear.
4. **Capture Outputs**:
   - New public IP & Elastic IP via `terraform output`.
   - Update any local scripts (`curler.sh`: `CANDIDATE_IP=`).
5. **Immediate SSH Validation**:
   ```bash
   ssh -i ~/.ssh/bb-portfolio-site-key.pem ec2-user@<candidate_elastic_ip>
   ```
   If AMI user differs (Ubuntu AMI), use `ubuntu@` instead of `ec2-user@`.
6. **SSM Check (Optional)**:
   ```bash
   aws ssm send-command \
     --region us-west-2 \
     --profile bb-portfolio-user \
     --document-name AWS-RunShellScript \
     --instance-ids <new_instance_id> \
     --parameters 'commands=["whoami"]' \
     --query 'Command.CommandId' --output text
   ```
7. **Deploy Containers**:
   - Run orchestrator or manual `docker compose pull` + `docker compose up -d` (prod + dev profiles).
8. **Health Verification**:
   ```bash
   curl -m5 -s -o /dev/null -w '%{http_code}\n' http://<candidate_ip>:3000/
   curl -m5 -s -o /dev/null -w '%{http_code}\n' http://<candidate_ip>:3001/api/health
   ```
   Expect `200` for both before promotion.
9. **Promotion**: Run handover script with health-only, then `--promote --rollback-on-fail`.
10. **Retention**: Prune previous instance(s) per retention policy after stable promotion.

## Console Termination vs Terraform Taint
| Method | Pros | Cons |
|--------|------|------|
| Terraform taint + apply | Keeps state consistent; preserves EIP association logic; automated rebuild | Requires apply cycle & permissions |
| Console terminate only | Quick point-and-click | Creates state drift; Terraform may try to recreate unexpectedly / lose track of status |

If the instance is defined in Terraform (it is: `aws_instance.bb_portfolio_blue`), **do NOT terminate solely in the console**—use taint + apply to avoid drift.

## Safe Rollback Considerations
- Active instance retains Elastic IP; candidate recreation has separate Elastic IP (prevent_destroy), enabling parallel validation.
- Promotion occurs only after health gate passes.
- If new candidate fails after promotion attempt, rollback logic re-associates EIP to previous active instance (script responsibility).

## AMI / User Reminders
- Amazon Linux 2023 default user: `ec2-user`
- Ubuntu AMIs default user: `ubuntu`
- Confirm AMI ID aligns with expected user; mismatch leads to false SSH failure diagnosis.

## Required IAM For Smooth Replacement
Ensure the applying identity has:
- `ec2:Describe*`, `ec2:CreateTags`, `ec2:AssociateAddress` (handled by Terraform provider).
- `iam:PassRole` if `attach_instance_profile = true`.

If `attach_instance_profile` must be false due to permission restrictions, SSM will be disabled—plan container deployment strictly via SSH.

## Troubleshooting New Candidate
| Symptom | Action |
|---------|--------|
| SSH banner missing | Check security group; verify AMI boots; try `ec2-user` vs `ubuntu`; recreate again if stuck. |
| SSM send-command fails | Confirm instance profile + AmazonSSMManagedInstanceCore attached; wait 2–3 minutes post boot. |
| Health endpoint 000/timeout | Inspect container logs, verify process binds `0.0.0.0` not `127.0.0.1`; check compose env vars. |
| Promotion script aborts | Re-run health-only, capture curl timings, ensure backend returns JSON quickly. |

## Clean-Up After Successful Replacement
- Remove any temporary IAM policies used for emergency key injection.
- Update documentation references to previous candidate instance ID.
- Rotate any instance-specific secrets if exposed during debugging.

---
**Checklist (Quick):**
- [ ] Taint old candidate
- [ ] Apply Terraform
- [ ] SSH new candidate
- [ ] Deploy containers
- [ ] Health 200/200
- [ ] Promote
- [ ] Retention prune
- [ ] Revoke temporary policies

This procedure keeps blue‑green flow reliable and minimizes downtime.
