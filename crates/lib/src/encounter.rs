use serde::{Deserialize, Serialize};

/// A saved encounter snapshot.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedEncounter {
  pub id: String,
  pub name: String,
  pub created: String,
  pub modified: String,
  pub version: String,
  pub data: EncounterData,
}

/// The combat data within a saved encounter.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncounterData {
  #[serde(default)]
  pub combatants: Vec<serde_json::Value>,
  #[serde(default)]
  pub round: Option<u32>,
  #[serde(default, flatten)]
  pub extra: serde_json::Map<String, serde_json::Value>,
}

/// Generate an encounter ID.
pub fn generate_encounter_id() -> String {
  format!(
    "encounter-{}-{}",
    chrono::Utc::now().timestamp_millis(),
    rand::random::<u32>() % 1_000_000
  )
}
