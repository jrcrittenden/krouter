#!/bin/bash
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run with sudo: sudo bash /opt/services/krouter/deploy/launchd/install.sh" >&2
  exit 1
fi

app=/opt/services/krouter
source_data=${1:-/Users/midknight/.krouter}
plist=com.kodelyth.krouter.plist
label=com.kodelyth.krouter

/usr/bin/plutil -lint "$app/deploy/launchd/$plist"
test -x /usr/local/bin/node
test -f "$app/.next/standalone/server.js"
test -d "$app/.next/standalone/.next/static"
test -d "$app/.next/standalone/public"
/usr/bin/id svc-krouter >/dev/null

# Preserve the existing configuration; never overwrite an installed data directory.
if [[ ! -e "$app/data" ]]; then
  test -d "$source_data"
  /usr/bin/ditto "$source_data" "$app/data"
fi
/bin/mkdir -p "$app/logs"
/usr/sbin/chown -R svc-krouter:SDS "$app/data" "$app/logs"
/bin/chmod 700 "$app/data" "$app/logs"

/usr/bin/install -o root -g wheel -m 644 "$app/deploy/launchd/$plist" "/Library/LaunchDaemons/$plist"
if /bin/launchctl print "system/$label" >/dev/null 2>&1; then
  /bin/launchctl bootout "system/$label"
fi
/bin/launchctl enable "system/$label"
/bin/launchctl bootstrap system "/Library/LaunchDaemons/$plist"

for attempt in {1..30}; do
  if /usr/bin/curl --fail --silent --max-time 2 http://127.0.0.1:20128/api/health; then
    echo
    echo "kRouter is healthy; launchd will start it at boot and restart it on exit."
    exit 0
  fi
  /bin/sleep 1
done
echo "kRouter did not become healthy. Check $app/logs/service.error.log" >&2
exit 1
