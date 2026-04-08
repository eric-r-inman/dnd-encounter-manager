use axum::{
  extract::State,
  http::StatusCode,
  routing::{delete, get, post},
  Json, Router,
};
use serde_json::Value;
use std::sync::Arc;

use crate::store::{JsonStore, COLLECTIONS};

pub fn router() -> Router<Arc<JsonStore>> {
  Router::new()
    .route("/export", get(export_all))
    .route("/import", post(import_all))
    .route("/storage-info", get(storage_info))
    .route("/storage", delete(clear_all))
}

/// GET /api/export — export all data as a single JSON object
async fn export_all(
  State(store): State<Arc<JsonStore>>,
) -> Result<Json<Value>, (StatusCode, String)> {
  let creatures: Value = store.read_collection("creatures").await.unwrap_or_default();
  let encounters: Value = store.read_collection("encounters").await.unwrap_or_default();
  let preferences: Value = store.read_collection("preferences").await.unwrap_or_default();
  let templates: Value = store.read_collection("templates").await.unwrap_or_default();
  let recent_effects: Value = store.read_collection("recent-effects").await.unwrap_or_default();

  Ok(Json(serde_json::json!({
    "version": "2.0.0",
    "timestamp": chrono::Utc::now().to_rfc3339(),
    "creatures": creatures,
    "encounters": encounters,
    "preferences": preferences,
    "templates": templates,
    "recentEffects": recent_effects,
  })))
}

/// POST /api/import — import data from an export object
async fn import_all(
  State(store): State<Arc<JsonStore>>,
  Json(data): Json<Value>,
) -> Result<Json<Value>, (StatusCode, String)> {
  let err = |e: crate::store::StoreError| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string());

  if let Some(creatures) = data.get("creatures") {
    store.write_collection("creatures", creatures).await.map_err(err)?;
  }
  if let Some(encounters) = data.get("encounters") {
    store.write_collection("encounters", encounters).await.map_err(err)?;
  }
  if let Some(preferences) = data.get("preferences") {
    store.write_collection("preferences", preferences).await.map_err(err)?;
  }
  if let Some(templates) = data.get("templates") {
    store.write_collection("templates", templates).await.map_err(err)?;
  }
  if let Some(effects) = data.get("recentEffects") {
    store.write_collection("recent-effects", effects).await.map_err(err)?;
  }

  Ok(Json(serde_json::json!({ "success": true })))
}

/// GET /api/storage-info — file sizes for each collection
async fn storage_info(
  State(store): State<Arc<JsonStore>>,
) -> Result<Json<Value>, (StatusCode, String)> {
  let mut info = serde_json::Map::new();
  let mut total: u64 = 0;

  for &collection in COLLECTIONS {
    let size = store
      .collection_size(collection)
      .await
      .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    info.insert(collection.to_string(), serde_json::json!(size));
    total += size;
  }

  info.insert("total".to_string(), serde_json::json!(total));
  info.insert(
    "totalKB".to_string(),
    serde_json::json!(format!("{:.1}", total as f64 / 1024.0)),
  );

  Ok(Json(Value::Object(info)))
}

/// DELETE /api/storage — clear all data
async fn clear_all(
  State(store): State<Arc<JsonStore>>,
) -> Result<Json<Value>, (StatusCode, String)> {
  for &collection in COLLECTIONS {
    store
      .delete_collection(collection)
      .await
      .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
  }

  Ok(Json(serde_json::json!({ "success": true })))
}
