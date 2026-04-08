# Architecture

## Overview

The D&D Encounter Manager is a Rust workspace with three crates and a JavaScript frontend:

- **Server** (`crates/server/`) — Axum HTTP server that serves the frontend and provides a REST API for data persistence
- **Lib** (`crates/lib/`) — Shared library (logging infrastructure)
- **CLI** (`crates/cli/`) — Command-line tools for data management
- **Frontend** (`frontend/`) — Vanilla JavaScript SPA built with Vite

## Data Flow

```
Browser (JavaScript)
    │
    ├── StateManager          In-memory combat state (combatants, initiative, UI)
    ├── EventCoordinator      DOM event delegation → handler dispatch
    └── ApiClient (fetch)     REST calls for persistence
          │
          ▼
Rust Server (Axum)
    │
    ├── routes/*              CRUD handlers for each resource
    └── store.rs (JsonStore)  Read/write JSON files with atomic writes + RwLock
          │
          ▼
data/*.json                   Creatures, encounters, preferences, state, etc.
```

## Server Architecture

The server follows the rust-template patterns:

- **`main.rs`** — Orchestrator only: loads config, initializes state, binds listener, wires routes, handles graceful shutdown (SIGINT/SIGTERM)
- **`config.rs`** — Staged configuration: `CliRaw` (CLI args) → `ConfigFileRaw` (TOML) → `Config` (validated)
- **`web_base.rs`** — Infrastructure routes (`/healthz`, `/metrics`, `/scalar`), `AppState` struct, SPA fallback file serving
- **`store.rs`** — `JsonStore` with atomic writes (temp file + rename) and per-collection `RwLock` for concurrency safety
- **`routes/`** — REST API handlers, one module per resource domain
- **`auth.rs`** — Optional OIDC authentication (gracefully disabled when not configured)
- **`systemd.rs`** — `notify_ready()` and `spawn_watchdog()` for systemd integration

### AppState

```rust
pub struct AppState {
    pub registry: Arc<Registry>,        // Prometheus metrics
    pub request_counter: IntCounter,    // http_requests_total
    pub frontend_path: PathBuf,         // Static file serving root
    pub oidc_client: Option<Arc<CoreClient>>,
    pub store: Arc<JsonStore>,          // JSON file storage engine
}
```

### Storage Engine

`JsonStore` manages a `data/` directory with one JSON file per collection. Key properties:

- **Atomic writes**: Data is written to a `.tmp` file, then renamed to the final path — prevents partial reads
- **Concurrency**: Each collection has its own `tokio::sync::RwLock` — concurrent reads, exclusive writes
- **Seeding**: On first startup, `creatures.json` is seeded from the base creature database shipped with the frontend

## Frontend Architecture

The frontend is a vanilla JavaScript SPA (no framework) with these core systems:

### Event System

A single delegated click listener on the document routes actions via `data-action` attributes:

```
DOM click → EventCoordinator.handleAction() → specialized handler (HPEvents, CombatEvents, etc.)
```

### State Management

`StateManager` holds in-memory combat state (combatants, round, turn). Changes notify observers for reactive UI updates. `PersistentState` periodically saves state to the server via the API.

### Service Layer

- **`ApiClient`** — Thin fetch wrapper for all server communication
- **`StorageService`** — High-level CRUD for encounters, preferences, templates, effects
- **`CreatureService`** — Creature database management (working copy pattern: base → working → save to server)
- **`CombatService`** / **`CombatantService`** — Combat and combatant business logic
- **`CalculationService`** — Damage, healing, temp HP math
- **`ValidationService`** — Input validation

### Components

- **`CombatantCard`** / **`CombatantManager`** — Combat queue rendering and lifecycle
- **`ModalSystem`** / **`ModalLoader`** — Lazy-loaded modal dialogs
- **`ToastSystem`** — Notification toasts
- **`DiceRoller`** — Dice rolling with D&D notation parsing
