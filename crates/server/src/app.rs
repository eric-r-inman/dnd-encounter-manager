use dnd_encounter_manager_lib::combat::CombatState;
use dnd_encounter_manager_lib::combatant::Combatant;
use dnd_encounter_manager_lib::creature::{Creature, CreatureDatabase};
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
    batch: bool,
  },
  ConditionPicker {
    combatant_idx: usize,
    selected: usize,
    duration: String,
    batch: bool,
  },
  EffectEntry {
    combatant_idx: usize,
    name: String,
    duration: String,
    note: String,
    field_idx: usize,
    batch: bool,
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
  DuplicateCombatant {
    combatant_idx: usize,
  },
  SaveEncounter {
    name: String,
  },
  StatusFlags {
    combatant_idx: usize,
    selected: usize,
  },
  InlineEdit {
    combatant_idx: usize,
    field: EditField,
    value: String,
  },
  CreatureForm {
    editing: Option<usize>,
    name: String,
    ac: String,
    hp: String,
    cr: String,
    creature_type_idx: usize,
    field_idx: usize,
  },
  StatBlockParser {
    text: String,
    preview: Option<String>,
  },
  AutoRoll {
    combatant_idx: usize,
    formula: String,
    timing_idx: usize,
    field_idx: usize,
  },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EditField {
  Initiative,
  Ac,
}

impl EditField {
  pub fn label(self) -> &'static str {
    match self {
      Self::Initiative => "Initiative",
      Self::Ac => "AC",
    }
  }
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

/// Compendium sort modes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SortMode {
  Name,
  Cr,
  Type,
}

impl SortMode {
  pub fn label(self) -> &'static str {
    match self {
      Self::Name => "Name",
      Self::Cr => "CR",
      Self::Type => "Type",
    }
  }

  pub fn next(self) -> Self {
    match self {
      Self::Name => Self::Cr,
      Self::Cr => Self::Type,
      Self::Type => Self::Name,
    }
  }
}

/// Dice roll mode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RollMode {
  Normal,
  Advantage,
  Disadvantage,
}

impl RollMode {
  pub fn label(self) -> &'static str {
    match self {
      Self::Normal => "Normal",
      Self::Advantage => "Advantage",
      Self::Disadvantage => "Disadvantage",
    }
  }

  pub fn next(self) -> Self {
    match self {
      Self::Normal => Self::Advantage,
      Self::Advantage => Self::Disadvantage,
      Self::Disadvantage => Self::Normal,
    }
  }
}

/// Status flag labels for the toggle dialog.
pub const STATUS_FLAGS: &[&str] = &[
  "Concentration",
  "Hiding",
  "Surprised",
  "Cover: cycle",
  "Flying: toggle",
];

/// Creature type options for forms.
pub const CREATURE_TYPES: &[&str] = &["enemy", "player", "npc"];

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
  pub last_auto_roll_result: Option<String>,

  // Compendium
  pub creature_db: CreatureDatabase,
  pub creature_search: String,
  pub creature_selected: usize,
  pub sort_mode: SortMode,

  // Dice
  pub dice_input: String,
  pub dice_history: Vec<DiceResult>,
  pub roll_mode: RollMode,

  // Encounters
  pub encounter_names: Vec<(String, String)>,
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
      last_auto_roll_result: None,
      creature_db,
      creature_search: String::new(),
      creature_selected: 0,
      sort_mode: SortMode::Name,
      dice_input: String::new(),
      dice_history: Vec::new(),
      roll_mode: RollMode::Normal,
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

  /// Get creatures filtered by the current search string and sorted.
  pub fn filtered_creatures(
    &self,
  ) -> Vec<(usize, &Creature)> {
    let query = self.creature_search.to_lowercase();
    let mut results: Vec<(usize, &Creature)> = self
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
      .collect();

    match self.sort_mode {
      SortMode::Name => results.sort_by(|a, b| a.1.name.cmp(&b.1.name)),
      SortMode::Cr => results.sort_by(|a, b| {
        parse_cr_for_sort(&a.1.cr).partial_cmp(&parse_cr_for_sort(&b.1.cr))
          .unwrap_or(std::cmp::Ordering::Equal)
      }),
      SortMode::Type => results.sort_by(|a, b| {
        a.1.creature_type.to_string().cmp(&b.1.creature_type.to_string())
      }),
    }

    results
  }

  /// Get indices of combatants targeted by current action (batch or single).
  pub fn target_indices(&self) -> Vec<usize> {
    if self.batch_selected.is_empty() {
      vec![self.combat_selected]
    } else {
      let mut indices: Vec<usize> =
        self.batch_selected.iter().copied().collect();
      indices.sort();
      indices
    }
  }
}

/// Parse CR string to f64 for sorting (handles "1/2", "1/4", etc.).
fn parse_cr_for_sort(cr: &str) -> f64 {
  if cr.contains('/') {
    let parts: Vec<&str> = cr.split('/').collect();
    if parts.len() == 2 {
      let num: f64 = parts[0].parse().unwrap_or(0.0);
      let den: f64 = parts[1].parse().unwrap_or(1.0);
      return num / den;
    }
  }
  cr.parse().unwrap_or(0.0)
}
