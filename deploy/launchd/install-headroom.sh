#!/bin/bash
# Install the Headroom compression proxy as a launch daemon on 127.0.0.1:8787.
# kRouter's Token Saver calls its /v1/compress endpoint (settings.headroomUrl,
# default http://localhost:8787). Re-run to upgrade headroom-ai in place.
#
#   sudo bash /opt/services/krouter/deploy/launchd/install-headroom.sh
#
# HEADROOM_EXTRAS overrides the pip extras (default "proxy,code"). The "ml"
# extra (Kompress model, pulls torch) is opt-in: HEADROOM_EXTRAS=proxy,code,ml
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run with sudo: sudo bash /opt/services/krouter/deploy/launchd/install-headroom.sh" >&2
  exit 1
fi

app=/opt/services/krouter
root=/opt/services/headroom
python=/usr/local/opt/python@3.12/bin/python3.12
extras=${HEADROOM_EXTRAS:-proxy,code}
plist=com.kodelyth.headroom.plist
label=com.kodelyth.headroom
port=8787

/usr/bin/plutil -lint "$app/deploy/launchd/$plist"
test -x "$python"
/usr/bin/id svc-krouter >/dev/null

if /usr/sbin/lsof -nP -iTCP:$port -sTCP:LISTEN >/dev/null 2>&1 \
   && ! /bin/launchctl print "system/$label" >/dev/null 2>&1; then
  echo "Port $port is already in use by something other than $label:" >&2
  /usr/sbin/lsof -nP -iTCP:$port -sTCP:LISTEN >&2
  exit 1
fi

/bin/mkdir -p "$root/home" "$root/logs"
/usr/sbin/chown svc-krouter:SDS "$root" "$root/home" "$root/logs"
/bin/chmod 750 "$root" "$root/home" "$root/logs"

# Build the venv as the service user so it owns every file it may write.
if [[ ! -x "$root/venv/bin/python" ]]; then
  /usr/bin/sudo -u svc-krouter -H "$python" -m venv "$root/venv"
fi
/usr/bin/sudo -u svc-krouter -H "$root/venv/bin/python" -m pip install --quiet --upgrade pip
/usr/bin/sudo -u svc-krouter -H "$root/venv/bin/python" -m pip install --quiet --upgrade "headroom-ai[$extras]"
"$root/venv/bin/headroom" --version

/usr/bin/install -o root -g wheel -m 644 "$app/deploy/launchd/$plist" "/Library/LaunchDaemons/$plist"
if /bin/launchctl print "system/$label" >/dev/null 2>&1; then
  /bin/launchctl bootout "system/$label"
fi
/bin/launchctl enable "system/$label"
/bin/launchctl bootstrap system "/Library/LaunchDaemons/$plist"

for attempt in {1..60}; do
  if /usr/bin/curl --fail --silent --max-time 2 "http://127.0.0.1:$port/health" >/dev/null; then
    echo "Headroom is healthy on 127.0.0.1:$port; launchd will start it at boot and restart it on exit."
    echo "Enable it in kRouter: Dashboard → Token Saver → Headroom (URL http://localhost:$port)."
    exit 0
  fi
  /bin/sleep 1
done
echo "Headroom did not become healthy. Check $root/logs/service.error.log" >&2
exit 1
