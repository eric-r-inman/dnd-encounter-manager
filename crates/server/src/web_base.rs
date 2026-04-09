use axum::{
  http::StatusCode,
  response::{IntoResponse, Response},
  routing::get,
  Json, Router,
};
use prometheus::{Encoder, IntCounter, Registry, TextEncoder};
use serde::Serialize;
use serde_json::json;
use std::sync::Arc;
use thiserror::Error;
use tracing::info;

use crate::config::Config;
use crate::store::JsonStore;

// ── AppState ──────────────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct AppState {
  pub registry: Arc<Registry>,
  pub request_counter: IntCounter,
  pub store: Arc<JsonStore>,
}

#[derive(Debug, Error)]
pub enum AppStateError {
  #[error("Failed to initialize data store: {0}")]
  StoreInit(String),
}

impl AppState {
  /// Construct `AppState` from a validated `Config`.
  pub async fn init(config: &Config) -> Result<Self, AppStateError> {
    let registry = Registry::new();
    let request_counter =
      IntCounter::new("http_requests_total", "Total HTTP requests")
        .expect("Failed to create counter");
    registry
      .register(Box::new(request_counter.clone()))
      .expect("Failed to register counter");

    // Initialize the JSON file store
    let store = Arc::new(
      JsonStore::new(config.data_dir.clone())
        .map_err(|e| AppStateError::StoreInit(e.to_string()))?,
    );

    // Seed creature database from the base database if present
    let seed_path =
      std::path::Path::new("data/seed/creature-database.json");
    if seed_path.exists() {
      store
        .seed_if_empty("creatures", seed_path)
        .await
        .map_err(|e| AppStateError::StoreInit(e.to_string()))?;
    }

    info!("Application state initialized");

    Ok(Self {
      registry: Arc::new(registry),
      request_counter,
      store,
    })
  }
}

// ── base router ───────────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct HealthResponse {
  status: String,
}

async fn healthz() -> Json<HealthResponse> {
  Json(HealthResponse {
    status: "healthy".to_string(),
  })
}

/// Build the base router with healthz and metrics endpoints.
pub fn base_router(state: AppState) -> Router {
  Router::new()
    .route("/healthz", get(healthz))
    .route("/metrics", get(metrics_endpoint))
    .with_state(state)
}

async fn metrics_endpoint(
  axum::extract::State(state): axum::extract::State<AppState>,
) -> Response {
  let encoder = TextEncoder::new();
  let metric_families = state.registry.gather();
  let mut buffer = Vec::new();

  match encoder.encode(&metric_families, &mut buffer) {
    Ok(_) => {
      (StatusCode::OK, [("content-type", encoder.format_type())], buffer)
        .into_response()
    }
    Err(e) => (
      StatusCode::INTERNAL_SERVER_ERROR,
      Json(json!({
          "error": format!("Failed to encode metrics: {}", e)
      })),
    )
      .into_response(),
  }
}
