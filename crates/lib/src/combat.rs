use crate::combatant::Combatant;
use crate::types::{CombatPhase, DecrementTiming};

/// Tracks the overall state of a combat encounter.
#[derive(Debug, Clone)]
pub struct CombatState {
  pub phase: CombatPhase,
  pub round: u32,
  pub current_turn_index: usize,
}

impl Default for CombatState {
  fn default() -> Self {
    Self {
      phase: CombatPhase::Inactive,
      round: 1,
      current_turn_index: 0,
    }
  }
}

/// Sort combatants by initiative (descending), then alphabetically for ties.
pub fn sort_by_initiative(combatants: &mut [Combatant]) {
  combatants.sort_by(|a, b| {
    b.initiative
      .cmp(&a.initiative)
      .then_with(|| a.name.cmp(&b.name))
  });
}

/// Start combat: sort, activate the first combatant, return initial state.
pub fn start_combat(combatants: &mut [Combatant]) -> CombatState {
  sort_by_initiative(combatants);

  // Deactivate all, then activate first
  for c in combatants.iter_mut() {
    c.is_active = false;
  }
  if let Some(first) = combatants.first_mut() {
    first.is_active = true;
  }

  CombatState {
    phase: CombatPhase::Active,
    round: 1,
    current_turn_index: 0,
  }
}

/// Advance to the next turn. Processes end-of-turn effects on the current
/// combatant and start-of-turn effects on the next. Skips dead combatants.
/// Returns true if the round wrapped (new round started).
pub fn advance_turn(
  state: &mut CombatState,
  combatants: &mut [Combatant],
) -> bool {
  if combatants.is_empty() || state.phase == CombatPhase::Inactive {
    return false;
  }

  // Process end-of-turn effects on current combatant
  if let Some(current) = combatants.get_mut(state.current_turn_index) {
    current.is_active = false;
    // Remove surprised status after first turn
    current.status.surprised = false;
    process_effects(current, DecrementTiming::TurnEnd);
  }

  // Find next living combatant
  let len = combatants.len();
  let mut next = (state.current_turn_index + 1) % len;
  let mut new_round = next == 0;
  let start = next;

  // Skip dead combatants (but don't loop forever)
  loop {
    if !combatants[next].is_dead() {
      break;
    }
    next = (next + 1) % len;
    if next == 0 {
      new_round = true;
    }
    // Went full circle — everyone is dead
    if next == start {
      break;
    }
  }

  if new_round {
    state.round += 1;
  }

  state.current_turn_index = next;

  // Process start-of-turn effects on new active combatant
  if let Some(active) = combatants.get_mut(next) {
    active.is_active = true;
    process_effects(active, DecrementTiming::TurnStart);
  }

  new_round
}

/// Reset combat to inactive state.
pub fn reset_combat(
  state: &mut CombatState,
  combatants: &mut [Combatant],
) {
  state.phase = CombatPhase::Inactive;
  state.round = 1;
  state.current_turn_index = 0;
  for c in combatants.iter_mut() {
    c.is_active = false;
  }
}

/// Decrement duration-based conditions and effects, removing expired ones.
fn process_effects(combatant: &mut Combatant, timing: DecrementTiming) {
  // Process conditions
  combatant.conditions.retain_mut(|cond| {
    if cond.infinite {
      return true;
    }
    if cond.decrement_on == Some(timing) {
      if let Some(ref mut dur) = cond.duration {
        if *dur <= 1 {
          return false; // Expired
        }
        *dur -= 1;
      }
    }
    true
  });

  // Process effects
  combatant.effects.retain_mut(|eff| {
    if eff.infinite {
      return true;
    }
    if eff.decrement_on == Some(timing) {
      if let Some(ref mut dur) = eff.duration {
        if *dur <= 1 {
          return false; // Expired
        }
        *dur -= 1;
      }
    }
    true
  });
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::combatant::{AppliedCondition, Combatant};
  use crate::types::CreatureType;

  fn make_combatant(name: &str, init: i32) -> Combatant {
    Combatant {
      id: name.to_lowercase(),
      creature_id: None,
      name: name.to_string(),
      creature_type: CreatureType::Enemy,
      initiative: init,
      ac: 10,
      max_hp: 10,
      current_hp: 10,
      temp_hp: 0,
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
  fn test_sort_by_initiative() {
    let mut combatants =
      vec![make_combatant("C", 5), make_combatant("A", 20), make_combatant("B", 15)];
    sort_by_initiative(&mut combatants);
    assert_eq!(combatants[0].name, "A");
    assert_eq!(combatants[1].name, "B");
    assert_eq!(combatants[2].name, "C");
  }

  #[test]
  fn test_initiative_tiebreak_alphabetical() {
    let mut combatants =
      vec![make_combatant("Zara", 10), make_combatant("Alpha", 10)];
    sort_by_initiative(&mut combatants);
    assert_eq!(combatants[0].name, "Alpha");
    assert_eq!(combatants[1].name, "Zara");
  }

  #[test]
  fn test_start_combat() {
    let mut combatants =
      vec![make_combatant("B", 10), make_combatant("A", 20)];
    let state = start_combat(&mut combatants);
    assert_eq!(state.round, 1);
    assert_eq!(state.current_turn_index, 0);
    assert!(combatants[0].is_active);
    assert_eq!(combatants[0].name, "A"); // Sorted to front
  }

  #[test]
  fn test_advance_turn_wraps_round() {
    let mut combatants =
      vec![make_combatant("A", 20), make_combatant("B", 10)];
    let mut state = start_combat(&mut combatants);

    let new_round = advance_turn(&mut state, &mut combatants);
    assert!(!new_round);
    assert_eq!(state.current_turn_index, 1);
    assert!(combatants[1].is_active);
    assert!(!combatants[0].is_active);

    let new_round = advance_turn(&mut state, &mut combatants);
    assert!(new_round);
    assert_eq!(state.round, 2);
    assert_eq!(state.current_turn_index, 0);
  }

  #[test]
  fn test_condition_countdown() {
    let mut c = make_combatant("Test", 10);
    c.conditions.push(AppliedCondition {
      name: "Poisoned".to_string(),
      duration: Some(2),
      infinite: false,
      note: String::new(),
      decrement_on: Some(DecrementTiming::TurnStart),
    });

    process_effects(&mut c, DecrementTiming::TurnStart);
    assert_eq!(c.conditions.len(), 1);
    assert_eq!(c.conditions[0].duration, Some(1));

    process_effects(&mut c, DecrementTiming::TurnStart);
    assert!(c.conditions.is_empty()); // Expired
  }
}
