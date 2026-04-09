# D&D Encounter Manager

A terminal-based combat encounter manager for D&D 5e, built entirely in Rust.

## Features

- Creature compendium with full 5e stat blocks
- Combat encounter management with initiative tracking
- HP tracking with temp HP, damage resistance/immunity/vulnerability
- Conditions and effects with duration tracking
- Dice roller with standard D&D notation
- Save/load encounters
- Import/export creature databases via CLI

## Quick Start

```bash
cargo run -p dnd-encounter-manager-server
```

Or with `just`:

```bash
just start
```

The TUI opens in your terminal. Use number keys (1-4) or Tab to switch between views: Combat, Compendium, Dice, Encounters. Press `q` to quit.

## Architecture

```
crates/
├── server/    TUI application (ratatui) + background HTTP observability
├── lib/       Domain logic (types, combat, dice, calculations, storage)
└── cli/       Data management tools (seed, import, export, validate)
```

Data is stored as JSON files in `data/`. The creature database is seeded from `data/seed/creature-database.json` on first run.

## CLI Tools

```bash
# Seed creature database
cargo run -p dnd-encounter-manager-cli -- seed

# Export creatures to file
cargo run -p dnd-encounter-manager-cli -- export creatures-backup.json

# Import creatures from file
cargo run -p dnd-encounter-manager-cli -- import creatures.json

# Validate data files
cargo run -p dnd-encounter-manager-cli -- validate
```

## Testing

```bash
cargo test --workspace
```

## Prerequisites

- Rust toolchain (rustc, cargo)
- Optional: [Nix](https://nixos.org/download.html) with flakes (`direnv allow` provides everything)

## Configuration

Copy `config.example.toml` to `config.toml` to customize data directory, log level, and HTTP observability port.
