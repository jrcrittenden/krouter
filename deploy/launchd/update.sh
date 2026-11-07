#!/bin/bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: bash deploy/launchd/update.sh [--local]

Default: require a clean checkout, pull with --ff-only, install dependencies,
rebuild production, restart launchd, and check local and Tailscale health.
--local: build the current checkout, including local edits, without pulling.

Run as your normal user; sudo is used only to control the daemon.
The service is stopped during the update. Data and logs are preserved.
EOF
}

local_build=false
case "${1:-}" in
  --local) local_build=true ;;
  -h|--help) usage; exit 0 ;;
  '') ;;
  *) usage >&2; exit 2 ;;
esac
[[ $# -le 1 ]] || { usage >&2; exit 2; }
[[ $EUID -ne 0 ]] || { echo 'Run without sudo; the script requests it when needed.' >&2; exit 1; }

app=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
label=com.kodelyth.krouter
plist=/Library/LaunchDaemons/$label.plist
cd "$app"

for command in git npm node sudo; do
  command -v "$command" >/dev/null
done
[[ -f "$plist" ]] || { echo 'Install the launch daemon first.' >&2; exit 1; }
if ! "$local_build" && [[ -n "$(git status --porcelain --untracked-files=normal)" ]]; then
  echo 'Checkout has local changes. Commit or stash them, or use --local to build them without pulling.' >&2
  git status --short
  exit 1
fi
if ! "$local_build"; then
  git rev-parse --abbrev-ref '@{upstream}' >/dev/null
  # Fetch before taking the running service offline.
  git fetch
  if ! git merge-base --is-ancestor HEAD '@{upstream}' &&
     ! git merge-base --is-ancestor '@{upstream}' HEAD; then
    echo 'Local and upstream history have diverged. Reconcile them before updating; the service is still running.' >&2
    exit 1
  fi
fi

sudo -v
sudo /bin/launchctl print "system/$label" >/dev/null
stopped=false
on_exit() {
  result=$?
  if [[ $result -ne 0 ]] && "$stopped"; then
    echo 'Update failed; the daemon remains stopped to avoid running a partial build.' >&2
    echo "Fix the error, run npm ci and npm run build:deploy, then:" >&2
    echo "sudo /bin/launchctl bootstrap system $plist" >&2
  fi
}
trap on_exit EXIT

echo 'Stopping kRouter for the update...'
sudo /bin/launchctl bootout "system/$label"
stopped=true
if ! "$local_build"; then
  git merge --ff-only '@{upstream}'
fi
npm ci --include=dev
npm run build:deploy

test -f .next/standalone/server.js
test -d .next/standalone/.next/static
test -d .next/standalone/public
sudo /bin/launchctl bootstrap system "$plist"
stopped=false

healthy=false
for attempt in {1..30}; do
  if curl --fail --silent --max-time 2 http://127.0.0.1:20128/api/health; then
    healthy=true
    break
  fi
  sleep 1
done
if ! "$healthy"; then
  echo "Local health check failed. Check $app/logs/service.error.log" >&2
  exit 1
fi
echo
echo 'Checking Tailscale...'
curl --fail --show-error --silent --max-time 15 https://krouter.phoenix-mora.ts.net/api/health
echo
echo "kRouter updated successfully ($(git rev-parse --short HEAD))."
