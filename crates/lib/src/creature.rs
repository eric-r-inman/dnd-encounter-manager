use crate::types::CreatureType;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Top-level creature database with metadata.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatureDatabase {
  pub creatures: Vec<Creature>,
  pub metadata: DatabaseMetadata,
}

impl Default for CreatureDatabase {
  fn default() -> Self {
    Self {
      creatures: Vec::new(),
      metadata: DatabaseMetadata {
        version: "2.0.0".to_string(),
        last_updated: chrono::Utc::now().format("%Y-%m-%d").to_string(),
        total_creatures: 0,
        schema: SchemaInfo {
          version: "2.0".to_string(),
          description: "D&D 5e creature database".to_string(),
        },
      },
    }
  }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseMetadata {
  pub version: String,
  pub last_updated: String,
  pub total_creatures: usize,
  pub schema: SchemaInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemaInfo {
  pub version: String,
  pub description: String,
}

/// A single creature in the database.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Creature {
  pub id: String,
  pub name: String,
  #[serde(rename = "type")]
  pub creature_type: CreatureType,
  pub ac: u16,
  #[serde(rename = "maxHP")]
  pub max_hp: u32,
  pub cr: String,
  #[serde(default)]
  pub size: Option<String>,
  #[serde(default)]
  pub race: Option<String>,
  #[serde(default)]
  pub subrace: Option<String>,
  #[serde(default)]
  pub alignment: Option<String>,
  #[serde(default)]
  pub description: Option<String>,
  #[serde(default)]
  pub source: Option<String>,
  #[serde(default)]
  pub has_full_stat_block: bool,
  #[serde(default)]
  pub stat_block: Option<StatBlock>,
}

/// Full D&D 5e stat block.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatBlock {
  #[serde(default)]
  pub full_type: Option<String>,
  #[serde(default)]
  pub armor_class: Option<ArmorClass>,
  #[serde(default)]
  pub hit_points: Option<HitPoints>,
  #[serde(default)]
  pub initiative: Option<Initiative>,
  #[serde(default)]
  pub speed: Option<Speed>,
  #[serde(default)]
  pub abilities: Option<Abilities>,
  #[serde(default)]
  pub saving_throws: Option<HashMap<String, i16>>,
  #[serde(default)]
  pub skills: Option<HashMap<String, i16>>,
  #[serde(default)]
  pub damage_resistances: Vec<String>,
  #[serde(default)]
  pub damage_immunities: Vec<String>,
  #[serde(default)]
  pub damage_vulnerabilities: Vec<String>,
  #[serde(default)]
  pub condition_immunities: Vec<String>,
  #[serde(default)]
  pub senses: Option<Senses>,
  #[serde(default)]
  pub languages: Option<Vec<String>>,
  #[serde(default)]
  pub challenge_rating: Option<ChallengeRating>,
  #[serde(default)]
  pub traits: Vec<Trait>,
  #[serde(default)]
  pub actions: Vec<Action>,
  #[serde(default)]
  pub reactions: Vec<Action>,
  #[serde(default)]
  pub legendary_actions: Option<LegendaryActions>,
  #[serde(default)]
  pub lair_actions: Option<LairActions>,
  #[serde(default)]
  pub regional_effects: Option<RegionalEffects>,
  #[serde(default)]
  pub spellcasting: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArmorClass {
  pub value: u16,
  #[serde(default, rename = "type")]
  pub armor_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HitPoints {
  pub average: u32,
  #[serde(default)]
  pub formula: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Initiative {
  pub modifier: i16,
  #[serde(default)]
  pub total: Option<i16>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Speed {
  #[serde(default)]
  pub walk: Option<u32>,
  #[serde(default)]
  pub burrow: Option<u32>,
  #[serde(default)]
  pub climb: Option<u32>,
  #[serde(default)]
  pub fly: Option<u32>,
  #[serde(default)]
  pub swim: Option<u32>,
  #[serde(default)]
  pub hover: Option<bool>,
}

/// The six ability scores.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Abilities {
  pub str: AbilityPair,
  pub dex: AbilityPair,
  pub con: AbilityPair,
  pub int: AbilityPair,
  pub wis: AbilityPair,
  pub cha: AbilityPair,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AbilityPair {
  pub score: u16,
  pub modifier: i16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Senses {
  #[serde(default)]
  pub blindsight: Option<u32>,
  #[serde(default)]
  pub darkvision: Option<u32>,
  #[serde(default)]
  pub tremorsense: Option<u32>,
  #[serde(default)]
  pub truesight: Option<u32>,
  #[serde(default)]
  pub passive_perception: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChallengeRating {
  pub cr: String,
  #[serde(default)]
  pub xp: Option<u64>,
  #[serde(default)]
  pub xp_in_lair: Option<u64>,
  #[serde(default)]
  pub proficiency_bonus: Option<u16>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trait {
  pub name: String,
  pub description: String,
  #[serde(default)]
  pub usage: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Action {
  pub name: String,
  #[serde(default, rename = "type")]
  pub action_type: Option<String>,
  pub description: String,
  #[serde(default)]
  pub attack_bonus: Option<i16>,
  #[serde(default)]
  pub reach: Option<String>,
  #[serde(default)]
  pub range: Option<String>,
  #[serde(default)]
  pub damage: Option<String>,
  #[serde(default)]
  pub damage_type: Option<String>,
  #[serde(default)]
  pub additional_damage: Option<String>,
  #[serde(default)]
  pub additional_damage_type: Option<String>,
  #[serde(default)]
  pub save_type: Option<String>,
  #[serde(default, rename = "saveDC")]
  pub save_dc: Option<u16>,
  #[serde(default)]
  pub area: Option<String>,
  #[serde(default)]
  pub recharge: Option<String>,
  #[serde(default)]
  pub cost: Option<u16>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LegendaryActions {
  pub description: String,
  pub uses: u16,
  #[serde(default)]
  pub uses_in_lair: Option<u16>,
  pub options: Vec<Action>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LairActions {
  pub description: String,
  pub options: Vec<Action>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegionalEffects {
  pub description: String,
  pub effects: Vec<Trait>,
}

/// Generate a creature ID from a name.
pub fn generate_creature_id(name: &str) -> String {
  let slug = name
    .to_lowercase()
    .replace(|c: char| !c.is_alphanumeric() && c != '-', "-")
    .replace("--", "-")
    .trim_matches('-')
    .to_string();
  let ts = chrono::Utc::now().timestamp_millis();
  format!("{slug}-{ts}")
}
