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

usage() {
  cat <<USAGE
ECR image cleanup utility

Options:
  --retain <N>            Number of most recent tagged images to retain per repository (default: 5)
  --repositories <csv>    Comma-separated ECR repository names (default: ${REPOS_CSV})
  --region <region>       AWS region (default: ${REGION})
  --profile <name>        AWS CLI profile to use
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

IFS=',' read -r -a REPOS <<<"$REPOS_CSV"

echo "🔧 ECR cleanup starting"
echo "Region      : $REGION"
[[ -n "$PROFILE" ]] && echo "Profile     : $PROFILE"
echo "Repositories: ${REPOS[*]}"
echo "Retain      : $RETAIN_COUNT tagged images per repo"
$INCLUDE_UNTAGGED && echo "Include     : UNTAGGED images (will be deleted)" || true
$DRY_RUN && echo "Mode        : DRY RUN (no deletions)" || echo "Mode        : APPLY (deletions will be executed)"

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
    while IFS= read -r l; do
      [[ -n "$l" ]] && untagged+=("$l")
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
