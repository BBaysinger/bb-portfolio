#!/usr/bin/env bash
# install-cloudwatch-agent.sh
# Idempotent installer/launcher for CloudWatch Agent on Amazon Linux (2023) EC2 host.
# Usage:
#   ./scripts/monitoring/install-cloudwatch-agent.sh --config ./scripts/monitoring/cloudwatch-agent-config.json
# Options:
#   --config <path>   Path to agent JSON config (default: scripts/monitoring/cloudwatch-agent-config.json)
#   --region <region> Override AWS region (in case instance metadata fails)
#
# Requires: sudo privileges, amazon-linux / yum or dnf, instance role with logs + PutMetricData.
set -euo pipefail
CFG_PATH="scripts/monitoring/cloudwatch-agent-config.json"
AWS_REGION=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --config) CFG_PATH="$2"; shift 2;;
    --region) AWS_REGION="$2"; shift 2;;
    -h|--help) grep '^# ' "$0" | sed 's/^# //'; exit 0;;
    *) echo "Unknown arg: $1" >&2; exit 1;;
  esac
done
if [[ ! -f "$CFG_PATH" ]]; then
  echo "Config file not found: $CFG_PATH" >&2; exit 1
fi
if ! command -v amazon-cloudwatch-agent >/dev/null 2>&1; then
  echo "Installing amazon-cloudwatch-agent..."
  sudo yum install -y amazon-cloudwatch-agent || sudo dnf install -y amazon-cloudwatch-agent || true
fi
DEST=/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
sudo mkdir -p /opt/aws/amazon-cloudwatch-agent/etc
sudo cp "$CFG_PATH" "$DEST"
CMD=(sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:"$DEST" -s)
if [[ -n "$AWS_REGION" ]]; then
  export AWS_REGION
fi
"${CMD[@]}" || { echo "Agent start failed" >&2; exit 1; }
systemctl status amazon-cloudwatch-agent --no-pager || true
echo "CloudWatch Agent installed & running with config: $DEST"
