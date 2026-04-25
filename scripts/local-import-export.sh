#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat >&2 <<EOF
Usage: $(basename "$0") /path/to/perfume-collection.zip

Publishes the exported constants.csv and any new images to origin/main, even
when this repository is currently checked out on another branch.

Environment:
  REMOTE        Git remote to push to. Defaults to origin.
  TARGET_BRANCH Branch used by GitHub Pages. Defaults to main.
EOF
}

if [[ $# -ne 1 ]]; then
  usage
  exit 1
fi

ZIP_PATH="$1"
REMOTE="${REMOTE:-origin}"
TARGET_BRANCH="${TARGET_BRANCH:-main}"
COMMIT_MESSAGE="Update constants.csv and images from export"

normalize_windows_path() {
  local input="$1"

  if [[ "$input" =~ ^[A-Za-z]:\\ ]]; then
    local drive="${input:0:1}"
    local rest="${input:2}"
    rest="${rest//\\//}"
    drive="${drive,,}"
    printf "/mnt/%s%s" "$drive" "$rest"
    return 0
  fi

  printf "%s" "$input"
}

ZIP_PATH=$(normalize_windows_path "$ZIP_PATH")

if [[ ! -f "$ZIP_PATH" ]]; then
  echo "Zip not found: $ZIP_PATH" >&2
  exit 1
fi

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || true)
if [[ -z "$REPO_ROOT" ]]; then
  echo "Not inside a git repository." >&2
  exit 1
fi

TMP_DIR=$(mktemp -d)
WORKTREE_DIR=$(mktemp -d)
trap 'git -C "$REPO_ROOT" worktree remove --force "$WORKTREE_DIR" >/dev/null 2>&1 || true; rm -rf "$TMP_DIR" "$WORKTREE_DIR"' EXIT

unzip -q "$ZIP_PATH" -d "$TMP_DIR"

CSV_SRC=$(find "$TMP_DIR" -type f -name "constants.csv" | head -n 1 || true)
IMAGES_SRC=$(find "$TMP_DIR" -type d -name "images" | head -n 1 || true)

if [[ -z "$CSV_SRC" || ! -f "$CSV_SRC" ]]; then
  echo "constants.csv not found in zip." >&2
  exit 1
fi

if [[ -z "$IMAGES_SRC" || ! -d "$IMAGES_SRC" ]]; then
  echo "images folder not found in zip." >&2
  exit 1
fi

echo "Fetching $REMOTE/$TARGET_BRANCH..."
git -C "$REPO_ROOT" fetch "$REMOTE" "$TARGET_BRANCH"

echo "Preparing temporary worktree from $REMOTE/$TARGET_BRANCH..."
rmdir "$WORKTREE_DIR"
git -C "$REPO_ROOT" worktree add --detach "$WORKTREE_DIR" "$REMOTE/$TARGET_BRANCH" >/dev/null

TARGET_CSV="$WORKTREE_DIR/public/constants.csv"
TARGET_IMAGES="$WORKTREE_DIR/public/images"

mkdir -p "$TARGET_IMAGES"
cp "$CSV_SRC" "$TARGET_CSV"

new_count=0
skip_count=0

while IFS= read -r -d '' file; do
  base=$(basename "$file")
  target="$TARGET_IMAGES/$base"

  if [[ -e "$target" ]]; then
    skip_count=$((skip_count + 1))
    continue
  fi

  cp "$file" "$target"
  new_count=$((new_count + 1))
done < <(find "$IMAGES_SRC" -maxdepth 1 -type f -print0)

echo "Copied constants.csv"
echo "Images added: $new_count"
echo "Images skipped (already exist): $skip_count"

git -C "$WORKTREE_DIR" add "public/constants.csv" "public/images"

if git -C "$WORKTREE_DIR" diff --cached --quiet; then
  echo "No changes to publish on $TARGET_BRANCH."
  exit 0
fi

git -C "$WORKTREE_DIR" commit -m "$COMMIT_MESSAGE"

echo "Pushing data update to $REMOTE/$TARGET_BRANCH..."
if ! git -C "$WORKTREE_DIR" push "$REMOTE" "HEAD:refs/heads/$TARGET_BRANCH"; then
  echo "Push failed; rebasing onto latest $REMOTE/$TARGET_BRANCH and retrying..."
  git -C "$REPO_ROOT" fetch "$REMOTE" "$TARGET_BRANCH"
  git -C "$WORKTREE_DIR" rebase "$REMOTE/$TARGET_BRANCH"
  git -C "$WORKTREE_DIR" push "$REMOTE" "HEAD:refs/heads/$TARGET_BRANCH"
fi

echo "Pushed to $REMOTE/$TARGET_BRANCH."
echo "GitHub Actions will rebuild Pages and refresh public/history.json."
