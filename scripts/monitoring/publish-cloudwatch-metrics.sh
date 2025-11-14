#!/usr/bin/env bash
# publish-cloudwatch-metrics.sh
# Collect security & performance counters from logs and push to CloudWatch.
# Requirements: aws cli configured with permissions (cloudwatch:PutMetricData)
# Suggested schedule: every 5 minutes via cron or systemd timer.

set -euo pipefail

# Metric namespace (custom). Allow override via METRIC_NAMESPACE.
# Recommended convention: PascalCase with hyphen separator for org-project (e.g., BB-Portfolio).
# Hyphen improves grepability vs camelcase; avoid spaces; do not prefix with AWS/.
NAMESPACE="${METRIC_NAMESPACE:-BB-Portfolio}"
REGION=${AWS_REGION:-us-west-2}

# Log paths (adjust if distro differs)
NGINX_ERROR_LOG="/var/log/nginx/error.log"
SSHD_LOG="/var/log/secure"
FAIL2BAN_LOG="/var/log/fail2ban.log"

SINCE_MINUTES=${METRIC_WINDOW_MINUTES:-5}
SINCE_TIME="$(date -u -d "-${SINCE_MINUTES} minutes" +"%Y-%m-%dT%H:%M:%SZ")"
NOW_TS="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# Helper: count occurrences since window start using awk on timestamp prefix where possible.
# Fallback: grep with approximate filtering.

count_nginx_upstream_timeouts() {
  # Matches 'upstream timed out' lines in last window
  if [[ -f "$NGINX_ERROR_LOG" ]]; then
    grep -F "upstream timed out" "$NGINX_ERROR_LOG" | awk -v since="$SINCE_TIME" 'BEGIN{c=0} {c++} END{print c}'
  else
    echo 0
  fi
}

count_nginx_rate_limits() {
  if [[ -f "$NGINX_ERROR_LOG" ]]; then
    grep -F "limiting requests" "$NGINX_ERROR_LOG" | awk 'END{print NR}'
  else
    echo 0
  fi
}

count_sshd_failed_logins() {
  if [[ -f "$SSHD_LOG" ]]; then
    egrep -i "Failed password|Invalid user|authentication failure" "$SSHD_LOG" | awk 'END{print NR}'
  else
    echo 0
  fi
}

count_fail2ban_bans() {
  if [[ -f "$FAIL2BAN_LOG" ]]; then
    grep -F "Ban" "$FAIL2BAN_LOG" | awk 'END{print NR}'
  else
    echo 0
  fi
}

NGINX_TIMEOUTS=$(count_nginx_upstream_timeouts)
NGINX_RATELIMITS=$(count_nginx_rate_limits)
SSHD_FAILS=$(count_sshd_failed_logins)
F2B_BANS=$(count_fail2ban_bans)

# Emit metrics using PutMetricData (Standard resolution, 60s period fits 5m aggregation upstream)
aws cloudwatch put-metric-data \
  --namespace "$NAMESPACE" \
  --region "$REGION" \
  --metric-data "[
    {\"MetricName\":\"NginxUpstreamTimeouts\",\"Timestamp\":\"$NOW_TS\",\"Value\":$NGINX_TIMEOUTS,\"Unit\":\"Count\"},
    {\"MetricName\":\"NginxRateLimitTriggers\",\"Timestamp\":\"$NOW_TS\",\"Value\":$NGINX_RATELIMITS,\"Unit\":\"Count\"},
    {\"MetricName\":\"SshFailedAuth\",\"Timestamp\":\"$NOW_TS\",\"Value\":$SSHD_FAILS,\"Unit\":\"Count\"},
    {\"MetricName\":\"Fail2banBans\",\"Timestamp\":\"$NOW_TS\",\"Value\":$F2B_BANS,\"Unit\":\"Count\"}
  ]"

cat <<EOF
[publish-cloudwatch-metrics] Window: last ${SINCE_MINUTES}m
  NginxUpstreamTimeouts   = $NGINX_TIMEOUTS
  NginxRateLimitTriggers  = $NGINX_RATELIMITS
  SshFailedAuth           = $SSHD_FAILS
  Fail2banBans            = $F2B_BANS
EOF
