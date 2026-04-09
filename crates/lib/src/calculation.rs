use crate::combatant::Combatant;
use crate::types::HealthState;

/// Result of applying damage.
pub struct DamageResult {
  pub effective_damage: u32,
  pub damage_to_temp_hp: u32,
  pub damage_to_current_hp: u32,
  pub new_current_hp: u32,
  pub new_temp_hp: u32,
}

/// Result of applying healing.
pub struct HealingResult {
  pub effective_healing: u32,
  pub new_current_hp: u32,
}

/// Apply damage to a combatant. Temp HP absorbs damage first.
pub fn apply_damage(combatant: &mut Combatant, damage: u32) -> DamageResult {
  let mut remaining = damage;
  let damage_to_temp = remaining.min(combatant.temp_hp);
  combatant.temp_hp -= damage_to_temp;
  remaining -= damage_to_temp;

  let damage_to_current = remaining.min(combatant.current_hp);
  combatant.current_hp -= damage_to_current;

  DamageResult {
    effective_damage: damage_to_temp + damage_to_current,
    damage_to_temp_hp: damage_to_temp,
    damage_to_current_hp: damage_to_current,
    new_current_hp: combatant.current_hp,
    new_temp_hp: combatant.temp_hp,
  }
}

/// Apply healing to a combatant (capped at max HP).
pub fn apply_healing(
  combatant: &mut Combatant,
  healing: u32,
) -> HealingResult {
  let max_heal = combatant.max_hp.saturating_sub(combatant.current_hp);
  let effective = healing.min(max_heal);
  combatant.current_hp += effective;
  HealingResult {
    effective_healing: effective,
    new_current_hp: combatant.current_hp,
  }
}

/// Set temporary HP (takes the higher value, doesn't stack).
pub fn set_temp_hp(combatant: &mut Combatant, temp_hp: u32) {
  combatant.temp_hp = combatant.temp_hp.max(temp_hp);
}

/// Apply damage modified by resistance, immunity, or vulnerability.
pub fn apply_typed_damage(
  combatant: &mut Combatant,
  damage: u32,
  damage_type: &str,
  resistances: &[String],
  immunities: &[String],
  vulnerabilities: &[String],
) -> DamageResult {
  let dtype = damage_type.to_lowercase();
  let modified = if immunities.iter().any(|i| i.to_lowercase() == dtype) {
    0
  } else if resistances.iter().any(|r| r.to_lowercase() == dtype) {
    damage / 2
  } else if vulnerabilities.iter().any(|v| v.to_lowercase() == dtype) {
    damage * 2
  } else {
    damage
  };
  apply_damage(combatant, modified)
}

/// Get the health state of a combatant.
pub fn health_state(combatant: &Combatant) -> HealthState {
  HealthState::from_hp(combatant.current_hp, combatant.max_hp)
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::combatant::Combatant;
  use crate::types::CreatureType;

  fn mock_combatant(current_hp: u32, max_hp: u32, temp_hp: u32) -> Combatant {
    Combatant {
      id: "test".to_string(),
      creature_id: None,
      name: "Test".to_string(),
      creature_type: CreatureType::Enemy,
      initiative: 10,
      ac: 15,
      max_hp,
      current_hp,
      temp_hp,
      is_active: false,
      hold_action: false,
      name_note: String::new(),
      status: Default::default(),
      conditions: Vec::new(),
      effects: Vec::new(),
      death_saves: Default::default(),
      auto_roll: None,
      is_placeholder: false,
      manual_order: None,
    }
  }

  #[test]
  fn test_damage_no_temp_hp() {
    let mut c = mock_combatant(20, 25, 0);
    let r = apply_damage(&mut c, 5);
    assert_eq!(r.new_current_hp, 15);
    assert_eq!(r.damage_to_temp_hp, 0);
    assert_eq!(r.damage_to_current_hp, 5);
  }

  #[test]
  fn test_damage_absorbs_temp_hp() {
    let mut c = mock_combatant(20, 25, 10);
    let r = apply_damage(&mut c, 15);
    assert_eq!(r.damage_to_temp_hp, 10);
    assert_eq!(r.damage_to_current_hp, 5);
    assert_eq!(r.new_current_hp, 15);
    assert_eq!(r.new_temp_hp, 0);
  }

  #[test]
  fn test_damage_floor_at_zero() {
    let mut c = mock_combatant(5, 25, 0);
    let r = apply_damage(&mut c, 100);
    assert_eq!(r.new_current_hp, 0);
  }

  #[test]
  fn test_healing_caps_at_max() {
    let mut c = mock_combatant(15, 25, 0);
    let r = apply_healing(&mut c, 100);
    assert_eq!(r.new_current_hp, 25);
    assert_eq!(r.effective_healing, 10);
  }

  #[test]
  fn test_temp_hp_takes_higher() {
    let mut c = mock_combatant(20, 25, 5);
    set_temp_hp(&mut c, 3);
    assert_eq!(c.temp_hp, 5); // Keep existing 5

    set_temp_hp(&mut c, 10);
    assert_eq!(c.temp_hp, 10); // Take new 10
  }

  #[test]
  fn test_damage_immunity() {
    let mut c = mock_combatant(20, 25, 0);
    let r = apply_typed_damage(
      &mut c, 10, "fire",
      &[], &["Fire".to_string()], &[],
    );
    assert_eq!(r.new_current_hp, 20); // No damage
  }

  #[test]
  fn test_damage_resistance() {
    let mut c = mock_combatant(20, 25, 0);
    let r = apply_typed_damage(
      &mut c, 10, "fire",
      &["Fire".to_string()], &[], &[],
    );
    assert_eq!(r.new_current_hp, 15); // Half damage (5)
  }

  #[test]
  fn test_damage_vulnerability() {
    let mut c = mock_combatant(20, 25, 0);
    let r = apply_typed_damage(
      &mut c, 5, "fire",
      &[], &[], &["Fire".to_string()],
    );
    assert_eq!(r.new_current_hp, 10); // Double damage (10)
  }
}
