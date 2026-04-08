# REST API Reference

The Rust server exposes a REST API under `/api/` for all data persistence. The frontend communicates with these endpoints via `ApiClient` (fetch wrapper).

## Creatures

The creature database uses an array-based structure: `{ creatures: [...], metadata: {...} }`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/creatures` | Return the full creature database |
| GET | `/api/creatures/base` | Return the read-only seed database |
| GET | `/api/creatures/:id` | Return a single creature by ID |
| POST | `/api/creatures` | Add a creature to the database |
| PUT | `/api/creatures/:id` | Update a creature (merge fields) |
| PUT | `/api/creatures` | Replace the entire creature database |
| DELETE | `/api/creatures/:id` | Remove a creature |

## Encounters

Encounters are stored as a map keyed by encounter ID.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/encounters` | Return all encounters |
| GET | `/api/encounters/:id` | Return a single encounter |
| POST | `/api/encounters` | Create an encounter (must include `id` field) |
| PUT | `/api/encounters/:id` | Update an encounter |
| DELETE | `/api/encounters/:id` | Delete an encounter |

## Preferences

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/preferences` | Get user preferences |
| PUT | `/api/preferences` | Merge incoming preferences with existing |

## Combat State

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/state` | Get saved combat state |
| PUT | `/api/state` | Save combat state |
| GET | `/api/state/combatant-instances` | Get saved combatant instances |
| PUT | `/api/state/combatant-instances` | Save combatant instances |

## Recent Effects

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/state/recent-effects` | Get recent effects list |
| POST | `/api/state/recent-effects` | Add an effect (`{ "effect": "name" }`), auto-deduplicates, max 10 |

## Templates

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/state/templates` | Get all templates |
| POST | `/api/state/templates` | Save a template (must include `id` field) |

## Import / Export

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/export` | Export all data as a single JSON object |
| POST | `/api/import` | Import data from an export object |
| GET | `/api/storage-info` | File sizes per collection (bytes) |
| DELETE | `/api/storage` | Delete all data files |

## Infrastructure

| Method | Path | Description |
|--------|------|-------------|
| GET | `/healthz` | Health check (`{"status":"healthy"}`) |
| GET | `/metrics` | Prometheus metrics (text format) |
| GET | `/api-docs/openapi.json` | OpenAPI spec |
| GET | `/scalar` | Interactive API docs UI |

## Error Responses

All API errors return an HTTP status code with a plain-text error message in the response body. Common codes:

- `400` — Bad request (missing required field)
- `404` — Resource not found
- `500` — Server error (storage read/write failure)

## Frontend Usage

```javascript
import { ApiClient } from './services/api-client.js';

// GET
const creatures = await ApiClient.get('/creatures');

// POST
await ApiClient.post('/encounters', { id: 'enc-123', name: 'Goblin Ambush', ... });

// PUT
await ApiClient.put('/preferences', { theme: 'dark' });

// DELETE
await ApiClient.delete('/encounters/enc-123');

// Fire-and-forget (beforeunload saves)
ApiClient.beacon('/state', stateData);
```
