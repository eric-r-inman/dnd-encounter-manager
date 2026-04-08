use axum::{
  extract::{Path, State},
  http::StatusCode,
  routing::get,
  Json, Router,
};
use serde_json::Value;
use std::collections::BTreeMap;
use std::sync::Arc;

use crate::store::JsonStore;

const COLLECTION: &str = "encounters";

pub fn router() -> Router<Arc<JsonStore>> {
  Router::new()
    .route("/", get(list_encounters).post(create_encounter))
    .route(
      "/{id}",
      get(get_encounter)
        .put(update_encounter)
        .delete(delete_encounter),
    )
}

/// GET /api/encounters — return all encounters as a map
async fn list_encounters(
  State(store): State<Arc<JsonStore>>,
) -> Result<Json<Value>, (StatusCode, String)> {
  let encounters: Value = store
    .read_collection(COLLECTION)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
  Ok(Json(encounters))
}

/// GET /api/encounters/:id — return a single encounter
async fn get_encounter(
  State(store): State<Arc<JsonStore>>,
  Path(id): Path<String>,
) -> Result<Json<Value>, (StatusCode, String)> {
  let encounters: BTreeMap<String, Value> = store
    .read_collection(COLLECTION)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

  encounters
    .get(&id)
    .cloned()
    .map(Json)
    .ok_or_else(|| (StatusCode::NOT_FOUND, format!("Encounter not found: {id}")))
}

/// POST /api/encounters — create a new encounter, returns the encounter with id
async fn create_encounter(
  State(store): State<Arc<JsonStore>>,
  Json(encounter): Json<Value>,
) -> Result<(StatusCode, Json<Value>), (StatusCode, String)> {
  let mut encounters: BTreeMap<String, Value> = store
    .read_collection(COLLECTION)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

  let id = encounter
    .get("id")
    .and_then(|i| i.as_str())
    .map(|s| s.to_string())
    .ok_or_else(|| {
      (StatusCode::BAD_REQUEST, "Encounter must have an id field".to_string())
    })?;

  encounters.insert(id, encounter.clone());

  store
    .write_collection(COLLECTION, &encounters)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

  Ok((StatusCode::CREATED, Json(encounter)))
}

/// PUT /api/encounters/:id — update an encounter
async fn update_encounter(
  State(store): State<Arc<JsonStore>>,
  Path(id): Path<String>,
  Json(encounter): Json<Value>,
) -> Result<Json<Value>, (StatusCode, String)> {
  let mut encounters: BTreeMap<String, Value> = store
    .read_collection(COLLECTION)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

  encounters.insert(id, encounter.clone());

  store
    .write_collection(COLLECTION, &encounters)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

  Ok(Json(encounter))
}

/// DELETE /api/encounters/:id — delete an encounter
async fn delete_encounter(
  State(store): State<Arc<JsonStore>>,
  Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
  let mut encounters: BTreeMap<String, Value> = store
    .read_collection(COLLECTION)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

  if encounters.remove(&id).is_none() {
    return Err((StatusCode::NOT_FOUND, format!("Encounter not found: {id}")));
  }

  store
    .write_collection(COLLECTION, &encounters)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

  Ok(StatusCode::NO_CONTENT)
}
