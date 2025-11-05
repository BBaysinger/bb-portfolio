#!/usr/bin/env bash
# ECR image cleanup utility (provider-specific)
#
# Prunes older images in one or more Amazon ECR repositories, keeping the most recent N images by push time.
# Optionally deletes all untagged images.
#
# Requirements:
# - aws CLI v2 configured with appropriate permissions (ecr:DescribeImages, ecr:ListImages, ecr:BatchDeleteImage)
# - bash, coreutils
#
# Usage examples:
#   ./scripts/image-cleanup-ecr.sh --retain 5
#   ./scripts/image-cleanup-ecr.sh --retain 10 --repositories bb-portfolio-backend-prod,bb-portfolio-frontend-prod --region us-west-2
#   ./scripts/image-cleanup-ecr.sh --retain 5 --include-untagged --dry-run
#   ./scripts/image-cleanup-ecr.sh --profile my-aws --region us-west-2
set -euo pipefail

RETAIN_COUNT=5
REGION="us-west-2"
PROFILE=""
REPOS_CSV="bb-portfolio-backend-prod,bb-portfolio-frontend-prod"
INCLUDE_UNTAGGED=false
DRY_RUN=false
AUTO_LOGIN=false

usage() {
  cat <<USAGE
ECR image cleanup utility

Options:
  --retain <N>            Number of most recent tagged images to retain per repository (default: 5)
  --repositories <csv>    Comma-separated ECR repository names (default: ${REPOS_CSV})
  --region <region>       AWS region (default: ${REGION})
  --profile <name>        AWS CLI profile to use
  --login                 Attempt AWS SSO login (if needed) and Docker login to ECR automatically
  --include-untagged      Also delete all UNTAGGED images
  --dry-run               Show what would be deleted without deleting
  --help, -h              Show this help message

Examples:
  ./scripts/image-cleanup-ecr.sh --retain 5
  ./scripts/image-cleanup-ecr.sh --retain 10 --repositories bb-portfolio-backend-prod,bb-portfolio-frontend-prod --region us-west-2
  ./scripts/image-cleanup-ecr.sh --retain 5 --include-untagged --dry-run
USAGE
}

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --retain)
      RETAIN_COUNT=${2:-}; shift 2 ;;
    --repositories)
      REPOS_CSV=${2:-}; shift 2 ;;
    --region)
      REGION=${2:-}; shift 2 ;;
    --profile)
      PROFILE=${2:-}; shift 2 ;;
    --login|--auto-login)
      AUTO_LOGIN=true; shift ;;
    --include-untagged)
      INCLUDE_UNTAGGED=true; shift ;;
    --dry-run)
      DRY_RUN=true; shift ;;
    --help|-h)
      usage; exit 0 ;;
    *)
      echo "Unknown argument: $1" >&2
      usage; exit 1 ;;
  esac
done

# Validate retain count is integer >= 0
if ! [[ "$RETAIN_COUNT" =~ ^[0-9]+$ ]]; then
  echo "--retain must be a non-negative integer" >&2
  exit 1
fi

# Build base AWS args
AWS_ARGS=("--region" "$REGION")
if [[ -n "$PROFILE" ]]; then
  AWS_ARGS+=("--profile" "$PROFILE")
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "aws CLI not found. Please install and configure AWS CLI v2." >&2
  exit 1
fi

have_docker() { command -v docker >/dev/null 2>&1; }

ensure_aws_login() {
  # Attempts AWS SSO login (if needed) and ECR Docker login. Never exits the script.
  # Returns 0 if authenticated to STS after attempts else 1.
  local ok=1
  local profile_msg="${PROFILE:-default}"

  if aws sts get-caller-identity "${AWS_ARGS[@]}" >/dev/null 2>&1; then
    echo "(auth) AWS already authenticated for profile: ${profile_msg}"
    ok=0
  else
    echo "(auth) AWS not authenticated. Attempting 'aws sso login' for profile: ${profile_msg}"
    if [[ -n "$PROFILE" ]]; then
      if aws sso login --profile "$PROFILE"; then ok=0; else ok=1; fi
    else
      if aws sso login; then ok=0; else ok=1; fi
    fi
    if [[ $ok -ne 0 ]] || ! aws sts get-caller-identity "${AWS_ARGS[@]}" >/dev/null 2>&1; then
      echo "(warn) Unable to authenticate with AWS STS after SSO attempt; continuing without Docker login"
      return 1
    fi
  fi

  if have_docker; then
    local account
    account=$(aws sts get-caller-identity --query Account --output text "${AWS_ARGS[@]}" 2>/dev/null || true)
    if [[ -n "$account" ]]; then
      local registry="${account}.dkr.ecr.${REGION}.amazonaws.com"
      echo "(auth) Logging Docker into ECR: ${registry}"
      if aws ecr get-login-password "${AWS_ARGS[@]}" | docker login --username AWS --password-stdin "$registry" >/dev/null 2>&1; then
        echo "(auth) Docker login to ECR succeeded"
      else
        echo "(warn) Docker login to ECR failed; continuing"
      fi
    else
      echo "(warn) Could not resolve AWS account ID for ECR login"
    fi
  else
    echo "(skip) Docker CLI not available; skipping ECR docker login"
  fi
  return 0
}

IFS=',' read -r -a REPOS <<<"$REPOS_CSV"

echo "🔧 ECR cleanup starting"
echo "Region      : $REGION"
[[ -n "$PROFILE" ]] && echo "Profile     : $PROFILE"
echo "Repositories: ${REPOS[*]}"
echo "Retain      : $RETAIN_COUNT tagged images per repo"
$INCLUDE_UNTAGGED && echo "Include     : UNTAGGED images (will be deleted)" || true
$DRY_RUN && echo "Mode        : DRY RUN (no deletions)" || echo "Mode        : APPLY (deletions will be executed)"

# Ensure login if requested
if [[ "$AUTO_LOGIN" == "true" ]]; then
  ensure_aws_login || true
fi

# Helper: delete images by digests
_delete_digests() {
  local repo="$1"; shift
  local -a digests=("$@")
  [[ ${#digests[@]} -eq 0 ]] && return 0

  # Convert to --image-ids imageDigest=...
  local -a args=()
  for d in "${digests[@]}"; do
    args+=("imageDigest=$d")
  done

  if $DRY_RUN; then
    echo "🧪 [dry-run] Would delete ${#digests[@]} image(s) from $repo"
    printf '  - %s\n' "${digests[@]}"
  else
    echo "🗑️  Deleting ${#digests[@]} image(s) from $repo"
    aws ecr batch-delete-image --repository-name "$repo" --image-ids "${args[@]}" "${AWS_ARGS[@]}" >/dev/null
  fi
}

for repo in "${REPOS[@]}"; do
  echo "\n📦 Repository: $repo"

  # 1) Get tagged images sorted by push time DESC (newest first)
  #    Use JMESPath to filter to tagged-only and sort by imagePushedAt
  #    Output as TAB-separated: pushedAt\timageDigest\tfirstTag
  tagged=()
  while IFS= read -r line; do
    tagged+=("$line")
  done < <(aws ecr describe-images \
    --repository-name "$repo" \
    --query 'reverse(sort_by(imageDetails[?imageTags!=`null`], &imagePushedAt))[*].[imagePushedAt, imageDigest, imageTags[0]]' \
    --output text \
    "${AWS_ARGS[@]}" || true)

  total_tagged=${#tagged[@]}
  echo "  Tagged images found : $total_tagged"

  # Determine which tagged images to delete (beyond RETAIN_COUNT)
  if (( total_tagged > RETAIN_COUNT )); then
    delete_count=$(( total_tagged - RETAIN_COUNT ))
    echo "  Will delete oldest  : $delete_count tagged image(s)"
    # Collect digests to delete
    digests_to_delete=()
    for (( i=RETAIN_COUNT; i<total_tagged; i++ )); do
      # Each line: "<pushedAt>\t<digest>\t<tag>"
      line="${tagged[$i]}"
      digest=$(echo "$line" | awk '{print $2}')
      [[ -n "$digest" ]] && digests_to_delete+=("$digest")
    done
    _delete_digests "$repo" "${digests_to_delete[@]}"
  else
    echo "  Nothing to delete among tagged images (<= retain count)"
  fi

  # 2) Optionally delete all UNTAGGED images
  if $INCLUDE_UNTAGGED; then
    untagged=()
    # AWS CLI --output text may print multiple digests on a single line separated by whitespace.
    # Split each line into individual digests to ensure proper deletion.
    while IFS= read -r l; do
      for d in $l; do
        [[ -n "$d" ]] && untagged+=("$d")
      done
    done < <(aws ecr list-images \
      --repository-name "$repo" \
      --filter tagStatus=UNTAGGED \
      --query 'imageIds[*].imageDigest' \
      --output text \
      "${AWS_ARGS[@]}" || true)
    if (( ${#untagged[@]} > 0 )); then
      echo "  Untagged images     : ${#untagged[@]} (will delete all)"
      _delete_digests "$repo" "${untagged[@]}"
    else
      echo "  Untagged images     : none"
    fi
  else
    echo "  Untagged images     : skipped (use --include-untagged)"
  fi

echo "  ✅ Repo complete"
done

echo "\n🎉 ECR cleanup finished"
