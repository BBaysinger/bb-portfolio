# BB-Portfolio Lagoon Promotion Lifecycle

_Renamed from prior Blue-Green lifecycle on 2025-11-18._

This document is the canonical runbook and reference for the instance lifecycle powering zero/near‑zero downtime deployments of BB-Portfolio using the Lagoon strategy. It describes roles, tagging, promotion, rollback, retention, and operational safety controls.

---

## 1. Goals

- Ship new versions without disrupting active traffic.
- Provide fast, deterministic rollback.
- Maintain bounded infrastructure cost via automated retention.
- Preserve forensic trace (tags, snapshots) for post‑mortems.
- Keep procedure scriptable & guardrailed.

---

## 2. Entities & Terminology

| Term                 | Meaning                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| Active Instance      | Serves production traffic (Elastic IP associated). Role tag `active`.                                   |
| Candidate Instance   | Freshly provisioned instance receiving new build prior to cutover. Role tag `candidate` until promoted. |
| Previous Instance    | Former active instance retained temporarily for rollback or analysis. Role tag `previous`.              |
| Promotion            | Controlled reassociation of Elastic IP from active -> candidate after health gates.                     |
| Retention            | Cleanup of surplus `previous` instances beyond count/age policy.                                        |
| Baseline Snapshot    | Optional snapshot prior to destructive operations (baseline reset, termination).                        |
| Version Tag          | Semantic or timestamp identifier (`Version`) set at provisioning for lineage tracking.                  |
| `LastDemoted`        | Epoch seconds recorded when an instance transitions from `active` to `previous`.                        |
| `PromotionTimestamp` | Epoch seconds recorded when a candidate becomes active (post‑cutover).                                  |

---

## 3. Tag Schema

Applied to each EC2 instance by Terraform or lifecycle scripts:

```
Project=bb-portfolio
Role=active|candidate|previous
Version=<timestamp-or-semver>
LastDemoted=<epoch_seconds_if_previous>
PromotionTimestamp=<epoch_seconds_if_active_after_promotion>
```

These tags drive discovery/selection in deployment and retention scripts. Do NOT edit manually unless performing emergency surgery.

---

## 4. Scripts & Responsibilities

| Script                                      | Purpose                                                                   | Key Flags                                                               |
| ------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deploy/scripts/deployment-orchestrator.sh` | End-to-end infra + container deployment, optional promotion & pruning.    | `--target=active                                                        | candidate`, `--promote`, `--prune-after-promotion`, `--retention-count`, `--retention-days`, `--handover-snapshot`, `--handover-no-rollback`, `--baseline-reset` |
| `scripts/eip-handover.sh`                   | Elastic IP swap w/ health gates & rollback.                               | `--promote`, `--snapshot-before`, `--rollback-on-fail`, `--dry-run`     |
| `scripts/instance-retention.sh`             | Enforces retention policy (snapshots + terminate old previous instances). | `--retain-count`, `--retain-days`, `--snapshot`, `--dry-run`, `--force` |
| `scripts/migrate-ec2-directory.sh`          | One-time path normalization (`/home/ec2-user/bb-portfolio`).              | N/A                                                                     |
| `scripts/publish-cloudwatch-metrics.sh`     | Custom metrics (SSH hardening, nginx limits, timeouts).                   | `METRIC_NAMESPACE` env                                                  |

---

## 5. End-to-End Lifecycle Flow

1. Provision Candidate
   - Terraform applies changes; a new instance with Role=`candidate` is created alongside current active.
   - Containers are deployed to candidate (`--target=candidate`).
2. Validation Phase
   - Health checks: HTTP 200 on frontend (`:3000/`), backend (`:3001/api/health`), container health states all `healthy`.
   - Optional synthetic traffic or smoke tests.
3. Promotion (Cutover)
   - Run orchestrator with `--promote` (optionally also `--prune-after-promotion`).
   - Internally invokes `eip-handover.sh`:
     - Pre-swap candidate health probe.
     - Elastic IP reassociation to candidate.
     - Post-swap probe against new active.
     - On failure: rollback (unless `--handover-no-rollback` specified) + optional snapshot.
   - Tags updated:
     - Old active: Role -> `previous`, `LastDemoted` set.
     - Candidate: Role -> `active`, `PromotionTimestamp` set.
4. Retention & Cleanup
   - If `--prune-after-promotion` used, `instance-retention.sh` runs automatically:
     - Builds sorted list of `previous` instances.
     - Keeps newest N (`--retention-count`), optionally filters out those younger than `--retention-days`.
     - Snapshots (if flag) then terminates surplus.
5. Steady State
   - Exactly one `active` instance (serving traffic), at most one `candidate` (pending next release), bounded `previous` backlog.
6. Baseline Reset (Optional)
   - `--baseline-reset` can snapshot current active before destructive refresh, ensuring restore point.

---

## 6. Command Examples

### 6.1 Deploy to Candidate Only

```
./deploy/scripts/deployment-orchestrator.sh \
  --target=candidate \
  --retention-count=3 \
  --retention-days=7
```

### 6.2 Promote After Successful Candidate Validation

```
./deploy/scripts/deployment-orchestrator.sh \
  --promote \
  --prune-after-promotion \
  --handover-snapshot \
  --retention-count=3 \
  --retention-days=14
```

### 6.3 Dry-Run Elastic IP Handover (Manual)

```
./scripts/eip-handover.sh --dry-run --promote
```

### 6.4 Manual Retention Prune Only

```
./scripts/instance-retention.sh --retain-count=3 --retain-days=14 --dry-run
# Remove --dry-run once satisfied
```

---

## 7. Health Gates

| Check              | Rationale                                | Failure Action         |
| ------------------ | ---------------------------------------- | ---------------------- |
| Candidate HTTP 200 | Confirms new build serving requests.     | Abort promotion.       |
| Post-swap HTTP 200 | Confirms Elastic IP swap success.        | Rollback (if enabled). |
| Container Health   | Detects failing service before exposure. | Abort / rollback.      |
| EC2 Status (2/2)   | Ensures hardware/network stable.         | Delay promotion.       |

---

## 8. Rollback Procedures

### Automatic Rollback

- Triggered if post-swap health fails and rollback flag is active.
- Elastic IP returns to previous active; candidate remains for inspection (still tagged `candidate`).

### Manual Emergency Rollback

1. Identify last `previous` instance: query tags.
2. Verify it's healthy (SSH or application endpoints).
3. Run `eip-handover.sh --promote --rollback-on-fail --snapshot-before` targeting that instance explicitly (override discovery logic if needed).
4. Confirm traffic restored; begin root cause analysis.

### Disaster Recovery (Active Corruption)

- Use most recent snapshot (baseline or pre-termination) to launch replacement; adjust tags; optionally re-run handover.

---

## 9. Retention Policy Guidelines

| Parameter                   | Recommended Default                        | Notes                                        |
| --------------------------- | ------------------------------------------ | -------------------------------------------- |
| Count (`--retention-count`) | 3                                          | Keeps 2 rollback options + current previous. |
| Age (`--retention-days`)    | 14                                         | Balances cost & forensic window.             |
| Snapshot on prune           | Enabled for first N terminations per cycle | Evaluate storage cost monthly.               |

Instances younger than age threshold are never pruned even if over count (ensures fresh rollback set).

---

## 10. Safety Controls

- Snapshots: Pre-promotion (optional) + pre-termination (optional) ensure point-in-time restore.
- Dry-run flags on handover and retention scripts provide non-destructive preview.
- Health probes prevent exposing unhealthy candidate.
- Tag immutability for audit trail.
- Baseline reset snapshot before destructive refresh.

---

## 11. Observability & Metrics

Custom CloudWatch metrics emitted every 5 minutes:
| Metric | Source | Purpose |
|--------|--------|---------|
| SSHFailedAuthCount | `/var/log/secure` | Detect brute force. |
| NginxRateLimitHits | Nginx error log | Identify abusive patterns. |
| NginxUpstreamTimeouts | Nginx error log | Surface backend latency/regressions. |
| Fail2BanBanCount | fail2ban log | Track ban activity. |

Add alarms after baseline collection (e.g., rate limit surge > threshold, upstream timeouts spike). Tie alarms to promotion readiness for progressive delivery.

---

## 12. Operational Checklist (Release Manager)

1. Deploy candidate: orchestrator `--target=candidate`.
2. Run smoke tests (frontend + backend endpoints, synthetic user journey).
3. Examine metrics & logs (no spike in errors/timeouts).
4. Promote with `--promote --prune-after-promotion` (include snapshot if critical release).
5. Verify post-cutover health & metrics stability.
6. Confirm retention output; ensure only expected previous instances remain.
7. Tag release in VCS referencing `Version` tag.
8. Update post‑mortem doc if incident-driven release.

---

## 13. Troubleshooting Matrix

| Symptom                        | Likely Cause                                       | Action                                                         |
| ------------------------------ | -------------------------------------------------- | -------------------------------------------------------------- |
| Promotion aborts pre-swap      | Candidate health failing                           | Inspect container logs; re-deploy candidate.                   |
| Promotion aborts post-swap     | Service regression only visible under real traffic | Automatic rollback (if enabled); diff configs; re-run tests.   |
| Retention skipped instances    | Age threshold protecting young previous            | Adjust `--retention-days` or run manual prune.                 |
| Elastic IP not reassigned      | AWS API error / rate limit                         | Retry handover script; check AWS limits.                       |
| Old active still tagged active | Tag update failure                                 | Manually adjust Role tag + run retention (ensure correctness). |

---

## 14. Extensibility / Future Enhancements

- Multi-candidate staging.
- Weighted traffic shifting (ALB target groups instead of direct EIP swap).
- Automated chaos pre-promotion (simulate failures to validate resiliency).
- GitHub Actions workflow integration for parameterized promotion.
- Metrics-driven auto‑rollback (threshold breaches).

---

## 15. Minimal API for Automation

If external tooling needs to orchestrate lifecycle:

- Discover active instance: filter EC2 by `Project=bb-portfolio` & `Role=active`.
- Discover candidate: filter by `Role=candidate`.
- Handover: invoke `scripts/eip-handover.sh --promote`.
- Retention: invoke `scripts/instance-retention.sh --retain-count <N> --retain-days <D>`.

Ensure IAM role has: `ec2:DescribeInstances`, `ec2:CreateTags`, `ec2:AssociateAddress`, `ec2:DisassociateAddress`, `ec2:CreateSnapshot`, `ec2:TerminateInstances`, `ec2:DescribeVolumes`.

---

## 16. Audit & Compliance

Maintain monthly report:

- List promotions (timestamp + Version).
- Snapshot inventory (age, size, associated instance ID).
- Retention actions (instance IDs terminated, rationale).
- Rollbacks (automatic/manual), root cause summaries.

---

## 17. Quick Reference (TL;DR)

```
# Deploy candidate
orchestrator --target=candidate
# Test & inspect
curl http://<candidate_ip>:3000/ ; curl http://<candidate_ip>:3001/api/health
# Promote + prune
orchestrator --promote --prune-after-promotion --retention-count=3 --retention-days=14
# Manual retention (dry-run)
instance-retention --retain-count=3 --retain-days=14 --dry-run
```

---

## 18. Change Log

- 2025-11-14: Initial version capturing promotion + retention integration (as Blue-Green).
- 2025-11-18: Renamed strategy references to Lagoon.

---

## 19. Cost & Optimization Strategy

Running simultaneous active + candidate instances increases monthly spend. Approximate on‑demand costs in `us-west-2` (730h/month):

| Resource              | t3.small | t3.medium |
| --------------------- | -------- | --------- |
| EC2 compute           | ~$15     | ~$30      |
| 20GB gp3 root volume  | ~$1.60   | ~$1.60    |
| Elastic IP (attached) | ~$3.65   | ~$3.65    |
| Total per instance    | ~$20.3   | ~$35.3    |

Incremental cost of keeping a candidate running full time: `$~20` (small) to `$~35` (medium) per month. Additional minor costs: ECR storage (<$1), S3 storage (depends on assets), occasional snapshots (~$0.05/GB‑mo effective).

### Recommended Practices

1. Auto‑destroy previous instance immediately after successful promotion in typical releases (new workflow `destroy_previous=true`).
2. Retain previous instances only when:
   - High‑risk release needing short rollback window.
   - Forensic / debugging period post‑incident.
3. Prefer termination over stop for simplicity (stopped instances still incur EBS + EIP charges if EIP remains allocated).
4. Release (disassociate & delete) secondary Elastic IP when not actively validating a candidate to save ~$3.65/mo.
5. If retention needed, keep `retain-count=3` and prune older ones; consider lowering to `1` for very frequent releases.
6. Periodically audit snapshot inventory; delete obsolete snapshots (after verifying no compliance requirement).

### Workflow Toggle Interaction

| Toggle                                                | Effect                                                                                           |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `destroy_previous=true`                               | Immediately terminates the just-demoted previous instance (retain-count forced to 0).            |
| `prune_after_policy=true` & `destroy_previous=false`  | Executes retention policy: keeps newest retain-count, prunes only older/aged previous instances. |
| `prune_after_policy=false` & `destroy_previous=false` | Leaves previous instance intact (manual or later scheduled prune).                               |

If both `destroy_previous=true` and `prune_after_policy=true` are supplied, the destroy semantics override and only immediate termination occurs (no retention pass).

### Future Cost Enhancements

- Reserved Instances / Savings Plans once usage stabilizes.
- ALB target groups to scale candidates down to smaller burstable type until final validation.
- Automated idle candidate shutdown with scheduled lambda + tag guard.
- Metrics-based promotion triggers.

---

## 20. Ownership

Lifecycle steward: Platform Engineering (contact: TODO insert).

---

## 21. Related Docs

- `deployment-orchestrator.md` (if present)
- `deployment-orchestrator.sh` inline comments
- `engineering-standards.md`
- `environment-variables.md`
- Post-mortem docs (when created)

---

_End of document._
