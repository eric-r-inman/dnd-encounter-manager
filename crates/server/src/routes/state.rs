use axum::{
  extract::State,
  http::StatusCode,
  routing::get,
  Json, Router,
};
use serde_json::Value;
use std::sync::Arc;

use crate::store::JsonStore;

pub fn router() -> Router<Arc<JsonStore>> {
  Router::new()
    .route("/", get(get_state).put(save_state))
    .route(
      "/combatant-instances",
      get(get_instances).put(save_instances),
    )
    .route(
      "/recent-effects",
      get(get_recent_effects).post(add_recent_effect),
    )
    .route("/templates", get(get_templates).post(save_template))
}

// ── Combat State ──────────────────────────────────────────────────────────────

/// GET /api/state
async fn get_state(
  State(store): State<Arc<JsonStore>>,
) -> Result<Json<Value>, (StatusCode, String)> {
  let state: Value = store
    .read_collection("state")
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
  if state.is_null() {
    return Ok(Json(serde_json::json!({})));
  }
  Ok(Json(state))
}

/// PUT /api/state
async fn save_state(
  State(store): State<Arc<JsonStore>>,
  Json(state_data): Json<Value>,
) -> Result<Json<Value>, (StatusCode, String)> {
  store
    .write_collection("state", &state_data)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
  Ok(Json(state_data))
}

// ── Combatant Instances ───────────────────────────────────────────────────────

/// GET /api/state/combatant-instances
async fn get_instances(
  State(store): State<Arc<JsonStore>>,
) -> Result<Json<Value>, (StatusCode, String)> {
  let instances: Value = store
    .read_collection("combatant-instances")
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
  if instances.is_null() {
    return Ok(Json(serde_json::json!({})));
  }
  Ok(Json(instances))
}

/// PUT /api/state/combatant-instances
async fn save_instances(
  State(store): State<Arc<JsonStore>>,
  Json(instances): Json<Value>,
) -> Result<Json<Value>, (StatusCode, String)> {
  store
    .write_collection("combatant-instances", &instances)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
  Ok(Json(instances))
}

// ── Recent Effects ────────────────────────────────────────────────────────────

/// GET /api/state/recent-effects
async fn get_recent_effects(
  State(store): State<Arc<JsonStore>>,
) -> Result<Json<Value>, (StatusCode, String)> {
  let effects: Value = store
    .read_collection("recent-effects")
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
  if effects.is_null() {
    return Ok(Json(serde_json::json!([])));
  }
  Ok(Json(effects))
}

/// POST /api/state/recent-effects — add an effect, deduplicate, keep max 10
async fn add_recent_effect(
  State(store): State<Arc<JsonStore>>,
  Json(body): Json<Value>,
) -> Result<Json<Value>, (StatusCode, String)> {
  let effect = body
    .get("effect")
    .and_then(|e| e.as_str())
    .ok_or_else(|| {
      (StatusCode::BAD_REQUEST, "Missing 'effect' field".to_string())
    })?
    .to_string();

  let mut effects: Vec<String> = store
    .read_collection("recent-effects")
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

  // Remove duplicates then prepend
  effects.retain(|e| e != &effect);
  effects.insert(0, effect);
  effects.truncate(10);

  store
    .write_collection("recent-effects", &effects)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

  Ok(Json(serde_json::json!(effects)))
}

// ── Templates ─────────────────────────────────────────────────────────────────

/// GET /api/state/templates
async fn get_templates(
  State(store): State<Arc<JsonStore>>,
) -> Result<Json<Value>, (StatusCode, String)> {
  let templates: Value = store
    .read_collection("templates")
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
  if templates.is_null() {
    return Ok(Json(serde_json::json!({})));
  }
  Ok(Json(templates))
}

/// POST /api/state/templates — add a template
async fn save_template(
  State(store): State<Arc<JsonStore>>,
  Json(template): Json<Value>,
) -> Result<(StatusCode, Json<Value>), (StatusCode, String)> {
  let mut templates: Value = store
    .read_collection("templates")
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

  let id = template
    .get("id")
    .and_then(|i| i.as_str())
    .ok_or_else(|| {
      (StatusCode::BAD_REQUEST, "Template must have an id field".to_string())
    })?;

  if let Some(obj) = templates.as_object_mut() {
    obj.insert(id.to_string(), template.clone());
  } else {
    templates = serde_json::json!({ id: template });
  }

  store
    .write_collection("templates", &templates)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

  Ok((StatusCode::CREATED, Json(template)))
}
