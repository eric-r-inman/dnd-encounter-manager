use crate::creature::Creature;
use crate::types::{CoverType, CreatureType, DecrementTiming};
use serde::{Deserialize, Serialize};

/// Runtime state of a combatant in an active encounter.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Combatant {
  pub id: String,
  #[serde(default)]
  pub creature_id: Option<String>,
  pub name: String,
  #[serde(rename = "type")]
  pub creature_type: CreatureType,
  pub initiative: i32,
  pub ac: u16,
  #[serde(rename = "maxHP")]
  pub max_hp: u32,
  #[serde(rename = "currentHP")]
  pub current_hp: u32,
  #[serde(rename = "tempHP")]
  pub temp_hp: u32,
  #[serde(default)]
  pub is_active: bool,
  #[serde(default)]
  pub hold_action: bool,
  #[serde(default)]
  pub name_note: String,
  #[serde(default)]
  pub status: CombatantStatus,
  #[serde(default)]
  pub conditions: Vec<AppliedCondition>,
  #[serde(default)]
  pub effects: Vec<AppliedEffect>,
  #[serde(default)]
  pub death_saves: DeathSaves,
  #[serde(default)]
  pub auto_roll: Option<AutoRollConfig>,
  #[serde(default)]
  pub is_placeholder: bool,
  #[serde(default)]
  pub manual_order: Option<i32>,
}

impl Combatant {
  /// Create a new combatant from a creature.
  pub fn from_creature(creature: &Creature, initiative: i32) -> Self {
    let id = format!(
      "combatant-{}-{}",
      chrono::Utc::now().timestamp_millis(),
      rand::random::<u32>() % 1_000_000
    );
    Self {
      id,
      creature_id: Some(creature.id.clone()),
      name: creature.name.clone(),
      creature_type: creature.creature_type.clone(),
      initiative,
      ac: creature.ac,
      max_hp: creature.max_hp,
      current_hp: creature.max_hp,
      temp_hp: 0,
      is_active: false,
      hold_action: false,
      name_note: String::new(),
      status: CombatantStatus::default(),
      conditions: Vec::new(),
      effects: Vec::new(),
      death_saves: DeathSaves::default(),
      auto_roll: None,
      is_placeholder: false,
      manual_order: None,
    }
  }

  /// Whether the combatant is dead (3 failed death saves or 0 HP enemy).
  pub fn is_dead(&self) -> bool {
    self.death_saves.failures.iter().filter(|&&f| f).count() >= 3
  }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CombatantStatus {
  #[serde(default)]
  pub concentration: bool,
  #[serde(default)]
  pub concentration_spell: Option<String>,
  #[serde(default)]
  pub hiding: bool,
  #[serde(default)]
  pub surprised: bool,
  #[serde(default)]
  pub cover: CoverType,
  #[serde(default)]
  pub flying: bool,
  #[serde(default)]
  pub flying_height: u32,
}

impl Default for CoverType {
  fn default() -> Self {
    Self::None
  }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppliedCondition {
  pub name: String,
  #[serde(default)]
  pub duration: Option<u32>,
  #[serde(default)]
  pub infinite: bool,
  #[serde(default)]
  pub note: String,
  #[serde(default)]
  pub decrement_on: Option<DecrementTiming>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppliedEffect {
  pub name: String,
  #[serde(default)]
  pub duration: Option<u32>,
  #[serde(default)]
  pub infinite: bool,
  #[serde(default)]
  pub note: String,
  #[serde(default)]
  pub decrement_on: Option<DecrementTiming>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeathSaves {
  pub successes: [bool; 3],
  pub failures: [bool; 3],
}

impl Default for DeathSaves {
  fn default() -> Self {
    Self {
      successes: [false; 3],
      failures: [false; 3],
    }
  }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AutoRollConfig {
  pub formula: String,
  #[serde(default)]
  pub advantage: bool,
  #[serde(default)]
  pub disadvantage: bool,
  pub timing: DecrementTiming,
}
