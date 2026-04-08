use axum::{
  extract::{Path, State},
  http::StatusCode,
  response::IntoResponse,
  routing::get,
  Json, Router,
};
use serde_json::Value;
use std::sync::Arc;

use crate::store::JsonStore;

const COLLECTION: &str = "creatures";

pub fn router() -> Router<Arc<JsonStore>> {
  Router::new()
    .route("/", get(list_creatures).put(replace_database).post(create_creature))
    .route("/base", get(get_base_database))
    .route(
      "/{id}",
      get(get_creature).put(update_creature).delete(delete_creature),
    )
}

/// PUT /api/creatures — replace the entire creature database
async fn replace_database(
  State(store): State<Arc<JsonStore>>,
  Json(db): Json<Value>,
) -> Result<Json<Value>, (StatusCode, String)> {
  store
    .write_collection(COLLECTION, &db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
  Ok(Json(db))
}

/// GET /api/creatures — return the full creature database
async fn list_creatures(
  State(store): State<Arc<JsonStore>>,
) -> Result<Json<Value>, (StatusCode, String)> {
  let db: Value = store
    .read_collection(COLLECTION)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
  // Return empty database structure instead of null for missing collections
  if db.is_null() {
    return Ok(Json(serde_json::json!({
      "creatures": [],
      "metadata": {
        "version": "2.0.0",
        "lastUpdated": chrono::Utc::now().to_rfc3339(),
        "totalCreatures": 0,
        "schema": { "version": "2.0", "description": "D&D 5e creature database" }
      }
    })));
  }
  Ok(Json(db))
}

/// GET /api/creatures/base — return the seed/base creature database
async fn get_base_database() -> Result<impl IntoResponse, (StatusCode, String)>
{
  let base_path = std::path::Path::new("frontend/src/data/creatures/creature-database.json");
  let data = tokio::fs::read_to_string(base_path)
    .await
    .map_err(|e| (StatusCode::NOT_FOUND, format!("Base database not found: {e}")))?;
  let json: Value = serde_json::from_str(&data)
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Invalid JSON: {e}")))?;
  Ok(Json(json))
}

/// GET /api/creatures/:id — return a single creature
async fn get_creature(
  State(store): State<Arc<JsonStore>>,
  Path(id): Path<String>,
) -> Result<Json<Value>, (StatusCode, String)> {
  let db: Value = store
    .read_collection(COLLECTION)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

  let creatures = db.get("creatures").and_then(|c| c.as_array());
  if let Some(creatures) = creatures {
    if let Some(creature) = creatures.iter().find(|c| c.get("id").and_then(|i| i.as_str()) == Some(&id)) {
      return Ok(Json(creature.clone()));
    }
  }

  Err((StatusCode::NOT_FOUND, format!("Creature not found: {id}")))
}

/// POST /api/creatures — add a creature to the database
async fn create_creature(
  State(store): State<Arc<JsonStore>>,
  Json(creature): Json<Value>,
) -> Result<(StatusCode, Json<Value>), (StatusCode, String)> {
  let mut db: Value = store
    .read_collection(COLLECTION)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

  // Ensure the database has the expected structure
  if db.is_null() {
    db = serde_json::json!({
      "creatures": [],
      "metadata": {
        "version": "2.0.0",
        "lastUpdated": chrono::Utc::now().to_rfc3339(),
        "totalCreatures": 0,
        "schema": { "version": "2.0", "description": "D&D 5e creature database" }
      }
    });
  }

  {
    let creatures = db
      .get_mut("creatures")
      .and_then(|c| c.as_array_mut())
      .ok_or_else(|| {
        (StatusCode::INTERNAL_SERVER_ERROR, "Invalid database structure".to_string())
      })?;
    creatures.push(creature.clone());
  }

  // Update metadata (separate scope so creatures borrow is released)
  let count = db.get("creatures").and_then(|c| c.as_array()).map(|a| a.len()).unwrap_or(0);
  if let Some(meta) = db.get_mut("metadata") {
    meta["totalCreatures"] = serde_json::json!(count);
    meta["lastUpdated"] = serde_json::json!(chrono::Utc::now().to_rfc3339());
  }

  store
    .write_collection(COLLECTION, &db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

  Ok((StatusCode::CREATED, Json(creature)))
}

/// PUT /api/creatures/:id — update a creature
async fn update_creature(
  State(store): State<Arc<JsonStore>>,
  Path(id): Path<String>,
  Json(updates): Json<Value>,
) -> Result<Json<Value>, (StatusCode, String)> {
  let mut db: Value = store
    .read_collection(COLLECTION)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

  {
    let creatures = db
      .get_mut("creatures")
      .and_then(|c| c.as_array_mut())
      .ok_or_else(|| {
        (StatusCode::INTERNAL_SERVER_ERROR, "Invalid database structure".to_string())
      })?;

    let creature = creatures
      .iter_mut()
      .find(|c| c.get("id").and_then(|i| i.as_str()) == Some(&id))
      .ok_or_else(|| (StatusCode::NOT_FOUND, format!("Creature not found: {id}")))?;

    // Merge updates into existing creature
    if let (Some(existing), Some(incoming)) =
      (creature.as_object_mut(), updates.as_object())
    {
      for (key, value) in incoming {
        existing.insert(key.clone(), value.clone());
      }
    }
  }

  // Update metadata
  if let Some(meta) = db.get_mut("metadata") {
    meta["lastUpdated"] = serde_json::json!(chrono::Utc::now().to_rfc3339());
  }

  let result = db
    .get("creatures")
    .and_then(|c| c.as_array())
    .and_then(|arr| arr.iter().find(|c| c.get("id").and_then(|i| i.as_str()) == Some(&id)))
    .cloned()
    .unwrap_or(Value::Null);

  store
    .write_collection(COLLECTION, &db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

  Ok(Json(result))
}

/// DELETE /api/creatures/:id — remove a creature
async fn delete_creature(
  State(store): State<Arc<JsonStore>>,
  Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
  let mut db: Value = store
    .read_collection(COLLECTION)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

  let new_count = {
    let creatures = db
      .get_mut("creatures")
      .and_then(|c| c.as_array_mut())
      .ok_or_else(|| {
        (StatusCode::INTERNAL_SERVER_ERROR, "Invalid database structure".to_string())
      })?;

    let original_len = creatures.len();
    creatures.retain(|c| c.get("id").and_then(|i| i.as_str()) != Some(&id));

    if creatures.len() == original_len {
      return Err((StatusCode::NOT_FOUND, format!("Creature not found: {id}")));
    }
    creatures.len()
  };

  // Update metadata
  if let Some(meta) = db.get_mut("metadata") {
    meta["totalCreatures"] = serde_json::json!(new_count);
    meta["lastUpdated"] = serde_json::json!(chrono::Utc::now().to_rfc3339());
  }

  store
    .write_collection(COLLECTION, &db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

  Ok(StatusCode::NO_CONTENT)
}

