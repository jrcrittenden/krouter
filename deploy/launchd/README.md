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
