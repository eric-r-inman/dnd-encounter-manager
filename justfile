# Start the TUI application
start:
    cargo run -p dnd-encounter-manager-server

# Build all workspace crates
build:
    cargo build --workspace

# Run all tests
test:
    cargo test --workspace

# Seed the creature database
seed:
    cargo run -p dnd-encounter-manager-cli -- seed

# Validate the creature database
validate:
    cargo run -p dnd-encounter-manager-cli -- validate
