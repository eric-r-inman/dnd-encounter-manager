use serde::{Deserialize, Serialize};
use std::fmt;

/// Creature classification in the encounter.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CreatureType {
  Player,
  Enemy,
  Npc,
  Placeholder,
}

impl fmt::Display for CreatureType {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    match self {
      Self::Player => write!(f, "Player"),
      Self::Enemy => write!(f, "Enemy"),
      Self::Npc => write!(f, "NPC"),
      Self::Placeholder => write!(f, "Placeholder"),
    }
  }
}

/// The six D&D 5e ability scores.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Ability {
  Str,
  Dex,
  Con,
  Int,
  Wis,
  Cha,
}

impl fmt::Display for Ability {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    match self {
      Self::Str => write!(f, "STR"),
      Self::Dex => write!(f, "DEX"),
      Self::Con => write!(f, "CON"),
      Self::Int => write!(f, "INT"),
      Self::Wis => write!(f, "WIS"),
      Self::Cha => write!(f, "CHA"),
    }
  }
}

/// Standard D&D 5e conditions.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Condition {
  Blinded,
  Charmed,
  Deafened,
  Frightened,
  Grappled,
  Incapacitated,
  Invisible,
  Paralyzed,
  Petrified,
  Poisoned,
  Prone,
  Restrained,
  Stunned,
  Unconscious,
  Custom(String),
}

impl fmt::Display for Condition {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    match self {
      Self::Custom(name) => write!(f, "{name}"),
      other => write!(f, "{other:?}"),
    }
  }
}

/// Cover levels from D&D 5e rules.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CoverType {
  None,
  Half,
  #[serde(rename = "three-quarters")]
  ThreeQuarters,
  Full,
}

impl CoverType {
  /// Cycle to the next cover level.
  pub fn next(self) -> Self {
    match self {
      Self::None => Self::Half,
      Self::Half => Self::ThreeQuarters,
      Self::ThreeQuarters => Self::Full,
      Self::Full => Self::None,
    }
  }

  /// AC bonus granted by this cover level.
  pub fn ac_bonus(self) -> i16 {
    match self {
      Self::None => 0,
      Self::Half => 2,
      Self::ThreeQuarters => 5,
      Self::Full => 0, // Full cover = can't be targeted
    }
  }
}

/// Health state derived from current vs max HP.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HealthState {
  Healthy,
  Wounded,
  Bloodied,
  Critical,
  Unconscious,
}

impl HealthState {
  /// Determine health state from HP values.
  pub fn from_hp(current: u32, max: u32) -> Self {
    if current == 0 {
      Self::Unconscious
    } else {
      let pct = (current as f64 / max as f64) * 100.0;
      if pct > 75.0 {
        Self::Healthy
      } else if pct > 50.0 {
        Self::Wounded
      } else if pct > 25.0 {
        Self::Bloodied
      } else {
        Self::Critical
      }
    }
  }
}

/// Duration for conditions, effects, and timers.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Duration {
  Turns(u32),
  Infinite,
}

/// When a duration-based effect decrements.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DecrementTiming {
  TurnStart,
  TurnEnd,
}

/// Combat phase.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CombatPhase {
  Inactive,
  Active,
}

/// Calculate the ability modifier from a score using D&D floor division.
pub fn ability_modifier(score: u16) -> i16 {
  let diff = score as i16 - 10;
  // D&D uses floor division: (1-10)/2 = -5, not -4.
  diff.div_euclid(2)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_ability_modifier() {
    assert_eq!(ability_modifier(1), -5);
    assert_eq!(ability_modifier(10), 0);
    assert_eq!(ability_modifier(11), 0);
    assert_eq!(ability_modifier(12), 1);
    assert_eq!(ability_modifier(20), 5);
    assert_eq!(ability_modifier(30), 10);
  }

  #[test]
  fn test_health_state() {
    assert_eq!(HealthState::from_hp(0, 100), HealthState::Unconscious);
    assert_eq!(HealthState::from_hp(10, 100), HealthState::Critical);
    assert_eq!(HealthState::from_hp(40, 100), HealthState::Bloodied);
    assert_eq!(HealthState::from_hp(60, 100), HealthState::Wounded);
    assert_eq!(HealthState::from_hp(100, 100), HealthState::Healthy);
  }

  #[test]
  fn test_cover_cycle() {
    assert_eq!(CoverType::None.next(), CoverType::Half);
    assert_eq!(CoverType::Half.next(), CoverType::ThreeQuarters);
    assert_eq!(CoverType::ThreeQuarters.next(), CoverType::Full);
    assert_eq!(CoverType::Full.next(), CoverType::None);
  }
}
