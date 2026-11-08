# kRouter launch daemon

Install once with administrator privileges:

```bash
sudo bash /opt/services/krouter/deploy/launchd/install.sh
```

The installer copies the existing `/Users/midknight/.krouter` configuration
into `/opt/services/krouter/data` only if that destination does not exist.
The daemon runs as `svc-krouter`, starts at boot, and restarts on exit.
Logs are in `/opt/services/krouter/logs/service{,.error}.log`.

Update from the configured Git upstream as your normal user:

```bash
bash /opt/services/krouter/deploy/launchd/update.sh
```

The checkout must be clean, including untracked files. Commit or stash local
work first. To deploy your current local checkout without fetching or merging:

```bash
bash /opt/services/krouter/deploy/launchd/update.sh --local
```

The script fetches updates and checks for diverged history before downtime,
stops the daemon, fast-forwards
the checkout, installs dependencies with `npm ci`, rebuilds with
`npm run build:deploy`, and starts the daemon. It checks both local and
Tailscale health. It preserves data and logs and does not rebuild as root.

Updates cause downtime during dependency installation and compilation.
If an update fails before restart, the daemon remains stopped; the script
prints recovery commands. It does not automatically roll back code or data.
If health checks fail after restart, inspect the logs and daemon status:

```bash
sudo launchctl print system/com.kodelyth.krouter
sudo tail -n 80 /opt/services/krouter/logs/service.error.log
```

Restart without rebuilding:

```bash
sudo launchctl kickstart -k system/com.kodelyth.krouter
```

## Headroom compression proxy (optional)

The Token Saver's Headroom option sends each conversation to a local
[Headroom](https://github.com/headroomlabs-ai/headroom) proxy's `/v1/compress`
endpoint before dispatch, and fails open if the proxy is down. Run it as its own
daemon instead of a dashboard-spawned child, so it survives kRouter restarts:

```bash
sudo bash /opt/services/krouter/deploy/launchd/install-headroom.sh
```

This creates a venv at `/opt/services/headroom/venv` (Homebrew Python 3.12)
and installs `headroom-ai[proxy,code]`. It then runs `headroom proxy` on
`127.0.0.1:8787` as `svc-krouter`, with Headroom's usage telemetry turned off.
Re-run the script to upgrade. Set `HEADROOM_EXTRAS=proxy,code,ml` to add the
Kompress ML model, which pulls in torch. Logs are in
`/opt/services/headroom/logs/`.

Then go to Dashboard → Token Saver, turn on Headroom, and leave the URL as
`http://localhost:8787`. Do not use the card's Start/Stop buttons. They manage
a separate child process and would conflict with the daemon on the same port.

```bash
sudo launchctl kickstart -k system/com.kodelyth.headroom   # restart
curl -s http://127.0.0.1:8787/health                       # health
```
