use axum::{
  extract::State,
  http::StatusCode,
  routing::get,
  Json, Router,
};
use serde_json::Value;
use std::sync::Arc;

use crate::store::JsonStore;

const COLLECTION: &str = "preferences";

pub fn router() -> Router<Arc<JsonStore>> {
  Router::new().route("/", get(get_preferences).put(update_preferences))
}

/// GET /api/preferences
async fn get_preferences(
  State(store): State<Arc<JsonStore>>,
) -> Result<Json<Value>, (StatusCode, String)> {
  let prefs: Value = store
    .read_collection(COLLECTION)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
  Ok(Json(prefs))
}

/// PUT /api/preferences — merge incoming preferences with existing
async fn update_preferences(
  State(store): State<Arc<JsonStore>>,
  Json(incoming): Json<Value>,
) -> Result<Json<Value>, (StatusCode, String)> {
  let mut prefs: Value = store
    .read_collection(COLLECTION)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

  // Merge incoming into existing
  if let (Some(existing), Some(updates)) =
    (prefs.as_object_mut(), incoming.as_object())
  {
    for (key, value) in updates {
      existing.insert(key.clone(), value.clone());
    }
  } else {
    prefs = incoming;
  }

  store
    .write_collection(COLLECTION, &prefs)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

  Ok(Json(prefs))
}
