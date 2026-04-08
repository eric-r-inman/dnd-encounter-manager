# Development Guide

Guide for developers working on the D&D Encounter Manager.

## D&D 5e Terminology Glossary

**For developers unfamiliar with D&D 5e**, here are the key game terms used in this codebase:

- **AC (Armor Class)**: Defense rating — higher AC = harder to hit (typically 10-20)
- **HP (Hit Points)**: Health/life total — reaches 0 = unconscious or dead
- **Temp HP (Temporary HP)**: Damage buffer that doesn't stack, absorbed before regular HP
- **CR (Challenge Rating)**: Monster difficulty level (CR 1 = challenge for 4 level-1 players)
- **Initiative**: Turn order number — rolled at combat start, higher goes first
- **XP (Experience Points)**: Reward for defeating creatures, based on CR
- **Bloodied**: D&D term for creature at ≤50% HP (visual indicator of health status)
- **Concentration**: Maintaining a spell effect — broken if damaged or lose focus
- **Condition**: Status effect from D&D 5e rules (Stunned, Poisoned, etc.)
- **Effect**: Custom status not in core rules (spell effects, abilities, house rules)
- **Round**: One full turn cycle where everyone acts once (typically 6 seconds in-game)
- **Saving Throw**: Die roll to resist effects (STR/DEX/CON/INT/WIS/CHA based)

## Getting Started

### Prerequisites

- **Rust** toolchain (rustc, cargo) — install via [rustup](https://rustup.rs/)
- **Node.js** 18+ and npm
- **Optional**: [Nix](https://nixos.org/download.html) with flakes — run `direnv allow` and everything is provided automatically

### Setup

```bash
git clone https://github.com/eric-r-inman/dnd-encounter-manager.git
cd dnd-encounter-manager

# Install frontend dependencies
cd frontend && npm install && cd ..

# Build everything
cargo build --workspace
cd frontend && npm run build && cd ..
```

### Running in Development

```bash
# Terminal 1: Rust server (from project root)
cargo run -p dnd-encounter-manager-server -- --listen 127.0.0.1:3001

# Terminal 2: Frontend with hot reload
cd frontend && npm run dev
```

Open http://localhost:3000. The Vite dev server proxies `/api/*` to the Rust server.

### Running in Production

```bash
cd frontend && npm run build
cargo run -p dnd-encounter-manager-server -- --listen 127.0.0.1:3001
```

Open http://localhost:3001. The Rust server serves everything.

## Project Structure

```
crates/
├── server/src/
│   ├── main.rs          Server entry point and graceful shutdown
│   ├── config.rs        Staged configuration (CliRaw → ConfigFileRaw → Config)
│   ├── web_base.rs      Base routes (healthz, metrics, OpenAPI), AppState
│   ├── store.rs         JSON file storage engine (atomic writes, per-collection locking)
│   ├── routes/          REST API endpoints
│   │   ├── creatures.rs   Creature database CRUD
│   │   ├── encounters.rs  Encounter save/load
│   │   ├── preferences.rs User preferences
│   │   ├── state.rs       Combat state, combatant instances, recent effects, templates
│   │   └── storage.rs     Import/export, storage info, clear all
│   ├── auth.rs          Optional OIDC authentication
│   ├── logging.rs       Structured logging setup
│   └── systemd.rs       Systemd notify/watchdog integration
├── lib/src/
│   ├── lib.rs           Shared exports
│   └── logging.rs       LogLevel, LogFormat enums
└── cli/src/
    ├── main.rs          CLI entry point
    └── config.rs        CLI configuration

frontend/
├── src/
│   ├── main.js                  Application entry point
│   ├── scripts/
│   │   ├── events/              Event handling (EventCoordinator + specialized handlers)
│   │   ├── services/            Business logic (storage, creature, combat, calculation, validation)
│   │   │   ├── api-client.js    Fetch wrapper for server API calls
│   │   │   ├── storage-service.js  Data persistence via REST API
│   │   │   └── creature-service.js Creature database management
│   │   ├── state/               State management (StateManager, PersistentState)
│   │   ├── parsers/             Stat block parser
│   │   └── utils/               Utilities (dice parser, validation, logging)
│   ├── components/              UI components (CombatantCard, DiceRoller, ModalSystem, Toast)
│   ├── templates/               HTML templates (main app shell, modals)
│   └── styles/                  CSS
├── tests/                       Jest tests
├── vite.config.js               Vite bundler config (proxy, build output)
└── package.json
```

## Data Flow

1. **Frontend** renders UI and manages in-memory state via `StateManager`
2. **Services** (`StorageService`, `CreatureService`, `PersistentState`) call the server REST API via `ApiClient`
3. **Rust server** handles CRUD operations and persists data as JSON files in `data/`
4. **On startup**, the server seeds `data/creatures.json` from the base creature database if not present

## Frontend Patterns

### Action-Based Event Routing

```html
<button data-action="damage" data-target="combatant-123">Damage</button>
```
```javascript
// EventCoordinator routes to handler based on data-action
handleAction(action, target, event) {
    switch (action) {
        case 'damage': HPEvents.handleDamage(target, event); break;
    }
}
```

### State Management

```javascript
StateManager.updateCombatant(id, 'currentHP', newHP);
```

### API Calls (data persistence)

```javascript
import { ApiClient } from './services/api-client.js';

const creatures = await ApiClient.get('/creatures');
await ApiClient.put('/state', combatState);
await ApiClient.post('/encounters', encounterData);
```

## Rust Patterns

### Adding a New API Endpoint

1. Add the handler function in the appropriate `crates/server/src/routes/*.rs` file
2. Register the route in that module's `router()` function
3. Use `State(store): State<Arc<JsonStore>>` to access the data store
4. Return `Result<Json<Value>, (StatusCode, String)>` for consistent error handling

### Configuration

Follow the staged pattern in `config.rs`: add the field to `CliRaw` (CLI arg), `ConfigFileRaw` (TOML), and `Config` (validated). CLI overrides file, file overrides default.

## File Quick Reference

**When you need to...** → **Edit this file...**

| Task | File |
|------|------|
| Add button click handler | `frontend/src/scripts/events/index.js` |
| Handle HP changes | `frontend/src/scripts/events/hp-events.js` |
| Handle modals | `frontend/src/scripts/events/modal-events.js` |
| Add business logic | `frontend/src/scripts/services/*.js` |
| Save/load data | `frontend/src/scripts/services/storage-service.js` |
| Change combatant rendering | `frontend/src/components/combatant-card/` |
| Change styling | `frontend/src/styles/*.css` |
| Add API endpoint | `crates/server/src/routes/*.rs` |
| Change server config | `crates/server/src/config.rs` |
| Change storage engine | `crates/server/src/store.rs` |

## Debugging

### Frontend (browser console)

```javascript
window.DnDApp          // App instance
window.DataServices    // Data services
```

### Server

The server logs structured output to stderr. Set `log_level = "debug"` in `config.toml` for verbose output. Check `http://localhost:3001/healthz` and `http://localhost:3001/metrics` for server health.

## Testing

```bash
# Rust tests (from project root)
cargo test --workspace

# Frontend tests
cd frontend && npm test

# Specific test suites
cd frontend && npx jest tests/unit/parsers
cd frontend && npx jest tests/unit/services/calculation-service.test.js
```
