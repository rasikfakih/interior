#!/usr/bin/env bash
# push.sh - one-shot push on a terminal where you have GitHub creds.
# Run from the repo root (same folder this file lives in):
#     ./push.sh
# It will:
#   1. Confirm git identity
#   2. Add the GitHub remote
#   3. Force-push the local `main` branch to the remote's `main`
#
# You need ONE of:
#   - GitHub CLI logged in (`gh auth status` shows your account)
#   - SSH key registered on github.com/rasikfakih
#   - `GITHUB_TOKEN` env var with repo:push scope
#
set -e

REPO="https://github.com/rasikfakih/interior.git"
BRANCH="main"

echo "[1/4] Confirm identity:"
git config user.name || git config --global user.name "rasikfakih"
git config user.email || git config --global user.email "rasikfakih@users.noreply.github.com"
echo "  name:  $(git config user.name)"
echo "  email: $(git config user.email)"
echo

echo "[2/4] Remote setup:"
if git remote get-url origin >/dev/null 2>&1; then
  echo "  origin already set -> $(git remote get-url origin)"
else
  git remote add origin "$REPO"
  echo "  origin -> $REPO"
fi
echo

echo "[3/4] Push branch:"
git branch --show-current
git push -u origin "$BRANCH":"$BRANCH" --force-with-lease
echo

echo "[4/4] Verify:"
gh repo view rasikfakih/interior --json name,defaultBranchRef 2>/dev/null || git ls-remote --exit-code origin "$BRANCH"
echo
echo "Done. Check https://github.com/rasikfakih/interior on the web."
