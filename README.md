# D&D Encounter Manager

A combat encounter manager for D&D 5e, built with a Rust (Axum) server backend and vanilla JavaScript frontend.

## Features

- Creature compendium with full 5e stat blocks
- Import creatures from D&D Beyond stat blocks (paste and parse)
- Combat encounter management with initiative tracking
- HP tracking with temp HP, damage resistance/immunity/vulnerability
- Conditions and effects with duration tracking
- Dice roller with standard D&D notation
- Save/load encounters
- Import/export creature databases
- Keyboard shortcuts for common actions

## Architecture

```
dnd-encounter-manager/
├── crates/
│   ├── server/        Axum HTTP server — serves frontend + REST API
│   ├── lib/           Shared library (logging infrastructure)
│   └── cli/           CLI tools (data management)
├── frontend/
│   ├── src/           JavaScript source, HTML templates, CSS
│   ├── public/        Vite build output (served by Rust in production)
│   └── package.json
├── data/              Runtime JSON file storage (gitignored)
├── Cargo.toml         Rust workspace root
└── flake.nix          Nix dev environment
```

The server persists all data (creatures, encounters, preferences, combat state) as JSON files in `data/`, replacing the original localStorage approach.

## Quick Start

### Prerequisites

- Rust toolchain (rustc, cargo)
- Node.js 18+
- Optional: [Nix](https://nixos.org/download.html) with flakes (provides everything automatically)

### Development (two terminals)

```bash
# Terminal 1: Rust server (from project root)
cargo run -p dnd-encounter-manager-server -- --listen 127.0.0.1:3001

# Terminal 2: Frontend with hot reload
cd frontend && npm install && npm run dev
```

Open http://localhost:3000. Vite proxies API calls to the Rust server.

### Production (single process)

```bash
cd frontend && npm run build
cargo run -p dnd-encounter-manager-server -- --listen 127.0.0.1:3001
```

Open http://localhost:3001.

## Testing

```bash
# Rust tests
cargo test --workspace

# Frontend tests
cd frontend && npm test
```

## Configuration

Copy `config.example.toml` to `config.toml` to customize server settings (listen address, data directory, log level). CLI flags and environment variables override the config file.

## Documentation

- [DEVELOPMENT.md](DEVELOPMENT.md) — Development workflow and code patterns
- [TESTING.md](TESTING.md) — Test infrastructure
- [docs/API.md](docs/API.md) — REST API reference
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — System architecture
- [docs/CREATURE.md](docs/CREATURE.md) — Creature data model
- [CHANGELOG.md](CHANGELOG.md) — Version history
