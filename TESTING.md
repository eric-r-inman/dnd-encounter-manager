# Testing Documentation

## Quick Start

```bash
# Run all Rust tests
cargo test --workspace

# Run all frontend tests
cd frontend && npm test

# Run specific frontend test suites
cd frontend && npx jest tests/unit/parsers
cd frontend && npx jest tests/unit/services/calculation-service.test.js
```

## Rust Tests

### Running

```bash
# All workspace tests (unit + integration)
cargo test --workspace

# Single crate
cargo test -p dnd-encounter-manager-server

# With output
cargo test --workspace -- --nocapture
```

### Test Structure

```
crates/server/tests/integration_test.rs   Server integration tests (healthz, metrics, OpenAPI, config)
crates/cli/tests/integration_test.rs      CLI integration tests (help, version, execution)
```

Server integration tests use `tempfile::tempdir()` for isolated data directories and construct `AppState` directly for `oneshot` request testing.

## Frontend Tests

### Running

```bash
cd frontend

npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report
npm run test:unit           # Unit tests only
```

### Test Structure

```
frontend/tests/
├── __mocks__/              Mock files for CSS and assets
├── unit/
│   ├── parsers/            Stat block parser tests
│   ├── services/           Service layer tests (calculation, storage)
│   └── events/             Event handler tests
├── setup.js                Jest setup and configuration
└── test-helpers.js         Shared test utilities (createMockCombatant, etc.)
```

### Framework

- **Jest** for test runner and assertions
- **@testing-library/jest-dom** for DOM assertions
- **jest-environment-jsdom** for browser environment simulation

## Adding Tests

### Rust integration test

Add tests to `crates/server/tests/integration_test.rs` using the existing `stub_state_no_auth()` helper to create test `AppState` with an isolated temp directory.

### Frontend unit test

Create a file under `frontend/tests/unit/` matching the source path. Import from `@jest/globals` and use `createMockCombatant()` from test-helpers for combatant fixtures.
