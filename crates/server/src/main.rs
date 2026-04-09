//! dnd-encounter-manager-server — Terminal UI for D&D encounter management
//!
//! Runs a ratatui TUI as the primary interface, with an HTTP observability
//! server (healthz, metrics) in the background for compliance with the
//! rust-template server crate requirements.

mod app;
mod input;
mod logging;
mod systemd;
mod tui;
mod views;

use dnd_encounter_manager_server::{config, web_base};

use app::App;
use clap::Parser;
use config::{CliRaw, Config, ConfigError};
use crossterm::event::{self, Event};
use dnd_encounter_manager_lib::creature::CreatureDatabase;
use logging::init_logging;
use std::time::Duration;
use thiserror::Error;
use tracing::{error, info};
use web_base::AppState;

#[derive(Debug, Error)]
enum ApplicationError {
  #[error("Failed to load configuration during startup: {0}")]
  ConfigurationLoad(#[from] ConfigError),

  #[error("Failed to initialize application state: {0}")]
  StateInit(#[from] web_base::AppStateError),

  #[error("Failed to load creature database: {0}")]
  CreatureLoad(String),

  #[error("Terminal UI error: {0}")]
  Tui(#[from] tui::TuiError),

  #[error("IO error: {0}")]
  Io(#[from] std::io::Error),

  #[error("Failed to bind listener to {address}: {source}")]
  ListenerBind {
    address: String,
    source: std::io::Error,
  },
}

#[tokio::main]
async fn main() -> Result<(), ApplicationError> {
  let cli = CliRaw::parse();

  let config = Config::from_cli_and_file(cli).map_err(|e| {
    eprintln!("Configuration error: {}", e);
    ApplicationError::ConfigurationLoad(e)
  })?;

  init_logging(config.log_level, config.log_format);
  info!("Starting dnd-encounter-manager");

  // Initialize application state (metrics, store)
  let state = AppState::init(&config).await.map_err(|e| {
    error!("Failed to initialize application state: {}", e);
    ApplicationError::StateInit(e)
  })?;

  // Spawn HTTP observability server in the background
  let http_state = state.clone();
  let listen_address = config.listen_address.clone();
  tokio::spawn(async move {
    if let Err(e) = run_http_server(http_state, listen_address).await {
      error!("HTTP observability server error: {}", e);
    }
  });

  // Load creature database
  let creature_db: CreatureDatabase = state
    .store
    .read_collection("creatures")
    .await
    .map_err(|e| ApplicationError::CreatureLoad(e.to_string()))?;

  info!(
    "Loaded {} creatures",
    creature_db.creatures.len()
  );

  // Run TUI
  run_tui(creature_db)?;

  info!("Shutting down dnd-encounter-manager");
  Ok(())
}

fn run_tui(creature_db: CreatureDatabase) -> Result<(), ApplicationError> {
  let mut terminal = tui::setup()?;
  let mut app = App::new(creature_db);

  loop {
    app.clear_expired_status();
    terminal
      .draw(|frame| views::render(frame, &app))
      .map_err(tui::TuiError::Draw)?;

    if event::poll(Duration::from_millis(50))? {
      if let Event::Key(key) = event::read()? {
        input::handle_key(&mut app, key);
      }
    }

    if app.should_quit {
      break;
    }
  }

  tui::restore(&mut terminal)?;
  Ok(())
}

async fn run_http_server(
  state: AppState,
  listen_address: tokio_listener::ListenerAddress,
) -> Result<(), ApplicationError> {
  use axum::serve;
  use tower_http::trace::TraceLayer;

  let app = web_base::base_router(state)
    .layer(TraceLayer::new_for_http());

  let listener = tokio_listener::Listener::bind(
    &listen_address,
    &tokio_listener::SystemOptions::default(),
    &tokio_listener::UserOptions::default(),
  )
  .await
  .map_err(|source| ApplicationError::ListenerBind {
    address: listen_address.to_string(),
    source,
  })?;

  info!("HTTP observability server listening on {}", listen_address);

  systemd::notify_ready();
  systemd::spawn_watchdog();

  serve(listener, app.into_make_service())
    .await
    .map_err(|e| ApplicationError::Io(e))?;

  Ok(())
}
