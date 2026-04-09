use axum::{
  body::Body,
  http::{Request, StatusCode},
};
use prometheus::{IntCounter, Registry};
use dnd_encounter_manager_server::store::JsonStore;
use dnd_encounter_manager_server::web_base::{base_router, AppState};
use std::sync::Arc;
use tower::ServiceExt;

// ── state helpers ────────────────────────────────────────────────────────────

fn test_state() -> AppState {
  let registry = Registry::new();
  let request_counter =
    IntCounter::new("http_requests_total", "Total HTTP requests")
      .expect("counter creation");
  registry
    .register(Box::new(request_counter.clone()))
    .expect("counter registration");
  let tmp = tempfile::tempdir().expect("temp dir");
  let store =
    Arc::new(JsonStore::new(tmp.path().to_path_buf()).expect("store init"));

  AppState {
    registry: Arc::new(registry),
    request_counter,
    store,
  }
}

// ── tests ────────────────────────────────────────────────────────────────────

#[tokio::test]
async fn test_healthz_endpoint() {
  let app = base_router(test_state());

  let response = app
    .oneshot(
      Request::builder()
        .uri("/healthz")
        .body(Body::empty())
        .unwrap(),
    )
    .await
    .unwrap();

  assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_metrics_endpoint() {
  let app = base_router(test_state());

  let response = app
    .oneshot(
      Request::builder()
        .uri("/metrics")
        .body(Body::empty())
        .unwrap(),
    )
    .await
    .unwrap();

  assert_eq!(response.status(), StatusCode::OK);
  let content_type = response
    .headers()
    .get("content-type")
    .unwrap()
    .to_str()
    .unwrap();
  assert!(
    content_type.contains("text/plain"),
    "metrics should be text/plain, got: {content_type}"
  );
}

#[tokio::test]
async fn test_config_defaults() {
  use dnd_encounter_manager_server::config::{CliRaw, Config};

  let cli = CliRaw {
    log_level: None,
    log_format: None,
    config: None,
    listen: None,
    data_dir: None,
  };

  let config = Config::from_cli_and_file(cli).unwrap();
  assert_eq!(config.data_dir.to_str().unwrap(), "data");
}

#[tokio::test]
async fn test_config_overrides() {
  use dnd_encounter_manager_server::config::{CliRaw, Config};

  let cli = CliRaw {
    log_level: Some("debug".to_string()),
    log_format: Some("json".to_string()),
    config: None,
    listen: Some("127.0.0.1:9090".to_string()),
    data_dir: Some(std::path::PathBuf::from("/tmp/test-data")),
  };

  let config = Config::from_cli_and_file(cli).unwrap();
  assert_eq!(config.data_dir.to_str().unwrap(), "/tmp/test-data");
}
