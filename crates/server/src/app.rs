use dnd_encounter_manager_lib::combat::CombatState;
use dnd_encounter_manager_lib::combatant::Combatant;
use dnd_encounter_manager_lib::creature::CreatureDatabase;
use dnd_encounter_manager_lib::dice::DiceResult;
use std::collections::HashSet;
use std::time::Instant;

/// Which top-level view is active.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum View {
  Combat,
  Compendium,
  Dice,
  Encounters,
}

/// Which dialog overlay is currently shown (if any).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Dialog {
  None,
  HpModification {
    combatant_idx: usize,
    amount: String,
    mode: HpMode,
  },
  ConditionPicker {
    combatant_idx: usize,
    selected: usize,
    duration: String,
  },
  EffectEntry {
    combatant_idx: usize,
    name: String,
    duration: String,
    note: String,
    field_idx: usize,
  },
  AddCombatant {
    search: String,
    selected_creature: usize,
    initiative: String,
    name_note: String,
    field_idx: usize,
  },
  ConfirmDelete {
    creature_idx: usize,
  },
  DiceRoll {
    notation: String,
  },
  QuickInitiative,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HpMode {
  Damage,
  Heal,
  TempHp,
}

impl HpMode {
  pub fn label(self) -> &'static str {
    match self {
      Self::Damage => "Damage",
      Self::Heal => "Heal",
      Self::TempHp => "Temp HP",
    }
  }

  pub fn next(self) -> Self {
    match self {
      Self::Damage => Self::Heal,
      Self::Heal => Self::TempHp,
      Self::TempHp => Self::Damage,
    }
  }
}

/// Central application state.
pub struct App {
  pub view: View,
  pub dialog: Dialog,
  pub should_quit: bool,

  // Combat
  pub combat_state: CombatState,
  pub combatants: Vec<Combatant>,
  pub combat_selected: usize,
  pub batch_selected: HashSet<usize>,

  // Compendium
  pub creature_db: CreatureDatabase,
  pub creature_search: String,
  pub creature_selected: usize,
  pub creature_scroll: usize,

  // Dice
  pub dice_input: String,
  pub dice_history: Vec<DiceResult>,

  // Encounters
  pub encounter_names: Vec<(String, String)>, // (id, name)
  pub encounter_selected: usize,

  // Status bar message
  pub status_message: Option<(String, Instant)>,
}

impl App {
  /// Create a new app with the given creature database.
  pub fn new(creature_db: CreatureDatabase) -> Self {
    Self {
      view: View::Combat,
      dialog: Dialog::None,
      should_quit: false,
      combat_state: CombatState::default(),
      combatants: Vec::new(),
      combat_selected: 0,
      batch_selected: HashSet::new(),
      creature_db,
      creature_search: String::new(),
      creature_selected: 0,
      creature_scroll: 0,
      dice_input: String::new(),
      dice_history: Vec::new(),
      encounter_names: Vec::new(),
      encounter_selected: 0,
      status_message: None,
    }
  }

  /// Set a temporary status message that auto-clears after a few seconds.
  pub fn set_status(&mut self, msg: impl Into<String>) {
    self.status_message = Some((msg.into(), Instant::now()));
  }

  /// Clear expired status messages (older than 3 seconds).
  pub fn clear_expired_status(&mut self) {
    if let Some((_, time)) = &self.status_message {
      if time.elapsed().as_secs() >= 3 {
        self.status_message = None;
      }
    }
  }

  /// Get creatures filtered by the current search string.
  pub fn filtered_creatures(&self) -> Vec<(usize, &dnd_encounter_manager_lib::creature::Creature)> {
    let query = self.creature_search.to_lowercase();
    self
      .creature_db
      .creatures
      .iter()
      .enumerate()
      .filter(|(_, c)| {
        query.is_empty()
          || c.name.to_lowercase().contains(&query)
          || c.creature_type.to_string().to_lowercase().contains(&query)
          || c.cr.to_lowercase().contains(&query)
      })
      .collect()
  }
}
