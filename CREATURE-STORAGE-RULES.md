# Creature Storage Rules

## How It Works

1. **Base Database** — Shipped with the app at `frontend/src/data/creatures/creature-database.json` (read-only seed data)
2. **Server Storage** — Working database persisted as `data/creatures.json` by the Rust server
3. **First Run** — Server seeds `data/creatures.json` from the base database automatically
4. **User Changes** — All add/edit/delete operations go through the REST API and are saved to `data/creatures.json`
5. **Export** — User can download the working database as a JSON file
6. **Import** — User can upload a database JSON file (replaces working database)
7. **Reset** — User can reset to the base database (discard all changes)

## Data Flow

```
CreatureService (JavaScript, in-memory working copy)
    │
    ├── loadWorkingDatabase()  →  GET  /api/creatures
    ├── saveWorkingDatabase()  →  PUT  /api/creatures
    ├── addCreature()          →  modifies in-memory, then saves
    ├── updateCreature()       →  modifies in-memory, then saves
    ├── deleteCreature()       →  modifies in-memory, then saves
    └── loadBaseDatabase()     →  GET  /api/creatures/base
          │
          ▼
Rust Server (store.rs)
    │
    └── data/creatures.json    (atomic writes, RwLock concurrency)
```

## Correct Usage

Use `CreatureService` for all creature operations:

```javascript
import { CreatureService } from './services/creature-service.js';

await CreatureService.initialize();
const creatures = await CreatureService.loadCreatures();
await CreatureService.addCreature(creatureData);
await CreatureService.updateCreature(id, updates);
await CreatureService.deleteCreature(id);
```

## Database Structure

```json
{
  "creatures": [
    {
      "id": "ancient-red-dragon",
      "name": "Ancient Red Dragon",
      "type": "enemy",
      "ac": 22,
      "maxHP": 507,
      "cr": "24",
      "size": "Gargantuan",
      "race": "Dragon",
      "hasFullStatBlock": true,
      "statBlock": { ... }
    }
  ],
  "metadata": {
    "version": "2.0.0",
    "lastUpdated": "2025-01-01",
    "totalCreatures": 10
  }
}
```

## Rules

- Never access `data/creatures.json` directly from the frontend — always go through `CreatureService` → `ApiClient` → REST API
- The server is the single source of truth for persisted data
- `CreatureService` maintains an in-memory working copy for performance; it syncs to the server on every mutation
