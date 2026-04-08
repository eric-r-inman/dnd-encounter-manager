pub mod creatures;
pub mod encounters;
pub mod preferences;
pub mod state;
pub mod storage;

use axum::Router;
use std::sync::Arc;

use crate::store::JsonStore;

/// Build the `/api` router with all resource endpoints.
pub fn api_router(store: Arc<JsonStore>) -> Router {
  Router::new()
    .nest("/api/creatures", creatures::router())
    .nest("/api/encounters", encounters::router())
    .nest("/api/preferences", preferences::router())
    .nest("/api/state", state::router())
    .nest("/api", storage::router())
    .with_state(store)
}
