# Deployment Guide

## Build for Production

```bash
# Build frontend assets
cd frontend && npm run build && cd ..

# Build Rust server (release mode)
cargo build --release -p dnd-encounter-manager-server
```

The server binary is at `target/release/dnd-encounter-manager-server`. The frontend assets are in `frontend/public/`.

## Running

```bash
./target/release/dnd-encounter-manager-server --listen 0.0.0.0:3001
```

The server serves the frontend from `frontend/public/` and the REST API on the same port. All data is stored in `data/` (JSON files, created automatically).

## Configuration

Create `config.toml` from `config.example.toml`:

```toml
listen = "0.0.0.0:3001"
frontend_path = "frontend/public"
data_dir = "data"
log_level = "info"
log_format = "text"
```

All settings can be overridden with CLI flags or environment variables (e.g., `LISTEN=0.0.0.0:8080`).

## Systemd

The server supports systemd integration out of the box:

- Sends `READY=1` after binding the listener
- Sends watchdog heartbeats if `WatchdogSec` is configured
- Listens for `SIGTERM` for graceful shutdown
- Supports socket activation with `--listen sd-listen`

## NixOS / nix-darwin

NixOS and Darwin modules are provided in `nix/modules/`. See those files for service configuration options.

## Data Backup

All persistent data lives in the `data/` directory as JSON files. To back up:

```bash
cp -r data/ data-backup-$(date +%Y%m%d)/
```

The app also supports export/import via the UI or the API (`GET /api/export`, `POST /api/import`).
