use crate::app::{App, Dialog, HpMode, View};
use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use dnd_encounter_manager_lib::{calculation, combat, combatant::Combatant, dice};

/// Central key event dispatcher.
pub fn handle_key(app: &mut App, key: KeyEvent) {
  // Ctrl+C always quits
  if key.modifiers.contains(KeyModifiers::CONTROL) && key.code == KeyCode::Char('c')
  {
    app.should_quit = true;
    return;
  }

  // If a dialog is active, route to dialog handler
  if app.dialog != Dialog::None {
    handle_dialog_key(app, key);
    return;
  }

  // Global keys
  match key.code {
    KeyCode::Char('q') => {
      app.should_quit = true;
      return;
    }
    KeyCode::Char('1') => {
      app.view = View::Combat;
      return;
    }
    KeyCode::Char('2') => {
      app.view = View::Compendium;
      return;
    }
    KeyCode::Char('3') => {
      app.view = View::Dice;
      return;
    }
    KeyCode::Char('4') => {
      app.view = View::Encounters;
      return;
    }
    KeyCode::Tab => {
      app.view = match app.view {
        View::Combat => View::Compendium,
        View::Compendium => View::Dice,
        View::Dice => View::Encounters,
        View::Encounters => View::Combat,
      };
      return;
    }
    _ => {}
  }

  // View-specific keys
  match app.view {
    View::Combat => handle_combat_key(app, key),
    View::Compendium => handle_compendium_key(app, key),
    View::Dice => handle_dice_key(app, key),
    View::Encounters => handle_encounters_key(app, key),
  }
}

fn handle_combat_key(app: &mut App, key: KeyEvent) {
  match key.code {
    KeyCode::Up => {
      if !app.combatants.is_empty() && app.combat_selected > 0 {
        app.combat_selected -= 1;
      }
    }
    KeyCode::Down => {
      if app.combat_selected + 1 < app.combatants.len() {
        app.combat_selected += 1;
      }
    }
    KeyCode::Char('n') => {
      combat::advance_turn(&mut app.combat_state, &mut app.combatants);
      // Select the new active combatant
      app.combat_selected = app.combat_state.current_turn_index;
      app.set_status(format!("Round {}", app.combat_state.round));
    }
    KeyCode::Char('r') => {
      combat::reset_combat(&mut app.combat_state, &mut app.combatants);
      app.set_status("Combat reset");
    }
    KeyCode::Char('s') => {
      if !app.combatants.is_empty() {
        app.combat_state =
          combat::start_combat(&mut app.combatants);
        app.combat_selected = 0;
        app.set_status("Combat started");
      }
    }
    KeyCode::Char('d') => {
      if !app.combatants.is_empty() {
        app.dialog = Dialog::HpModification {
          combatant_idx: app.combat_selected,
          amount: String::new(),
          mode: HpMode::Damage,
        };
      }
    }
    KeyCode::Char('h') => {
      if !app.combatants.is_empty() {
        app.dialog = Dialog::HpModification {
          combatant_idx: app.combat_selected,
          amount: String::new(),
          mode: HpMode::Heal,
        };
      }
    }
    KeyCode::Char('t') => {
      if !app.combatants.is_empty() {
        app.dialog = Dialog::HpModification {
          combatant_idx: app.combat_selected,
          amount: String::new(),
          mode: HpMode::TempHp,
        };
      }
    }
    KeyCode::Char('c') => {
      if !app.combatants.is_empty() {
        app.dialog = Dialog::ConditionPicker {
          combatant_idx: app.combat_selected,
          selected: 0,
          duration: "1".to_string(),
        };
      }
    }
    KeyCode::Char('e') => {
      if !app.combatants.is_empty() {
        app.dialog = Dialog::EffectEntry {
          combatant_idx: app.combat_selected,
          name: String::new(),
          duration: "1".to_string(),
          note: String::new(),
          field_idx: 0,
        };
      }
    }
    KeyCode::Char('a') => {
      app.dialog = Dialog::AddCombatant {
        search: String::new(),
        selected_creature: 0,
        initiative: "10".to_string(),
        name_note: String::new(),
        field_idx: 0,
      };
    }
    KeyCode::Char('x') | KeyCode::Delete => {
      if !app.combatants.is_empty() {
        app.combatants.remove(app.combat_selected);
        if app.combat_selected >= app.combatants.len()
          && !app.combatants.is_empty()
        {
          app.combat_selected = app.combatants.len() - 1;
        }
        app.set_status("Combatant removed");
      }
    }
    KeyCode::Char(' ') => {
      if !app.combatants.is_empty() {
        if app.batch_selected.contains(&app.combat_selected) {
          app.batch_selected.remove(&app.combat_selected);
        } else {
          app.batch_selected.insert(app.combat_selected);
        }
      }
    }
    _ => {}
  }
}

fn handle_compendium_key(app: &mut App, key: KeyEvent) {
  let filtered = app.filtered_creatures();
  let count = filtered.len();

  match key.code {
    KeyCode::Up => {
      if app.creature_selected > 0 {
        app.creature_selected -= 1;
      }
    }
    KeyCode::Down => {
      if app.creature_selected + 1 < count {
        app.creature_selected += 1;
      }
    }
    KeyCode::Char('/') => {
      // Enter search mode — just clear search to start fresh
      app.creature_search.clear();
      app.creature_selected = 0;
    }
    KeyCode::Backspace => {
      app.creature_search.pop();
      app.creature_selected = 0;
    }
    KeyCode::Char(ch) if ch.is_alphanumeric() || ch == ' ' => {
      app.creature_search.push(ch);
      app.creature_selected = 0;
    }
    KeyCode::Esc => {
      app.creature_search.clear();
      app.creature_selected = 0;
    }
    KeyCode::Char('x') | KeyCode::Delete => {
      if !filtered.is_empty() {
        app.dialog = Dialog::ConfirmDelete {
          creature_idx: filtered[app.creature_selected].0,
        };
      }
    }
    _ => {}
  }
}

fn handle_dice_key(app: &mut App, key: KeyEvent) {
  match key.code {
    KeyCode::Char(ch) => {
      app.dice_input.push(ch);
    }
    KeyCode::Backspace => {
      app.dice_input.pop();
    }
    KeyCode::Enter => {
      if let Ok(expr) = dice::parse(&app.dice_input) {
        let result = dice::roll(&expr);
        app.set_status(format!(
          "Rolled {}: {} = {}",
          result.expression,
          result
            .rolls
            .iter()
            .map(|r| r.to_string())
            .collect::<Vec<_>>()
            .join("+"),
          result.total
        ));
        app.dice_history.insert(0, result);
        if app.dice_history.len() > 20 {
          app.dice_history.truncate(20);
        }
      } else {
        app.set_status(format!(
          "Invalid notation: {}",
          app.dice_input
        ));
      }
      app.dice_input.clear();
    }
    KeyCode::Esc => {
      app.dice_input.clear();
    }
    _ => {}
  }
}

fn handle_encounters_key(app: &mut App, key: KeyEvent) {
  match key.code {
    KeyCode::Up => {
      if app.encounter_selected > 0 {
        app.encounter_selected -= 1;
      }
    }
    KeyCode::Down => {
      if app.encounter_selected + 1 < app.encounter_names.len() {
        app.encounter_selected += 1;
      }
    }
    _ => {}
  }
}

// ── Dialog handlers ─────────────────────────────────────────────────────────

fn handle_dialog_key(app: &mut App, key: KeyEvent) {
  // Escape always closes any dialog
  if key.code == KeyCode::Esc {
    app.dialog = Dialog::None;
    return;
  }

  match &app.dialog {
    Dialog::HpModification { .. } => handle_hp_dialog(app, key),
    Dialog::ConditionPicker { .. } => handle_condition_dialog(app, key),
    Dialog::EffectEntry { .. } => handle_effect_dialog(app, key),
    Dialog::AddCombatant { .. } => handle_add_combatant_dialog(app, key),
    Dialog::ConfirmDelete { .. } => handle_confirm_delete(app, key),
    Dialog::DiceRoll { .. } => handle_dice_roll_dialog(app, key),
    Dialog::QuickInitiative => handle_quick_initiative(app, key),
    Dialog::None => {}
  }
}

fn handle_hp_dialog(app: &mut App, key: KeyEvent) {
  if let Dialog::HpModification {
    combatant_idx,
    amount,
    mode,
  } = &mut app.dialog
  {
    match key.code {
      KeyCode::Char(ch) if ch.is_ascii_digit() => {
        amount.push(ch);
      }
      KeyCode::Backspace => {
        amount.pop();
      }
      KeyCode::Tab => {
        *mode = mode.next();
      }
      KeyCode::Enter => {
        if let Ok(val) = amount.parse::<u32>() {
          let idx = *combatant_idx;
          let m = *mode;
          if let Some(c) = app.combatants.get_mut(idx) {
            match m {
              HpMode::Damage => {
                calculation::apply_damage(c, val);
              }
              HpMode::Heal => {
                calculation::apply_healing(c, val);
              }
              HpMode::TempHp => {
                calculation::set_temp_hp(c, val);
              }
            }
          }
          let name = app.combatants.get(idx).map(|c| c.name.clone()).unwrap_or_default();
          app.set_status(format!("{} {} to {}", m.label(), val, name));
        }
        app.dialog = Dialog::None;
      }
      _ => {}
    }
  }
}

pub const CONDITIONS: &[&str] = &[
  "Blinded",
  "Charmed",
  "Deafened",
  "Frightened",
  "Grappled",
  "Incapacitated",
  "Invisible",
  "Paralyzed",
  "Petrified",
  "Poisoned",
  "Prone",
  "Restrained",
  "Stunned",
  "Unconscious",
];

fn handle_condition_dialog(app: &mut App, key: KeyEvent) {
  if let Dialog::ConditionPicker {
    combatant_idx,
    selected,
    duration,
  } = &mut app.dialog
  {
    match key.code {
      KeyCode::Up => {
        if *selected > 0 {
          *selected -= 1;
        }
      }
      KeyCode::Down => {
        if *selected + 1 < CONDITIONS.len() {
          *selected += 1;
        }
      }
      KeyCode::Char(ch) if ch.is_ascii_digit() => {
        duration.push(ch);
      }
      KeyCode::Backspace => {
        duration.pop();
      }
      KeyCode::Enter => {
        let idx = *combatant_idx;
        let sel = *selected;
        let dur = duration.parse::<u32>().unwrap_or(1);
        if let Some(c) = app.combatants.get_mut(idx) {
          c.conditions.push(
            dnd_encounter_manager_lib::combatant::AppliedCondition {
              name: CONDITIONS[sel].to_string(),
              duration: Some(dur),
              infinite: false,
              note: String::new(),
              decrement_on: Some(
                dnd_encounter_manager_lib::types::DecrementTiming::TurnStart,
              ),
            },
          );
        }
        let name = app.combatants.get(idx).map(|c| c.name.clone()).unwrap_or_default();
        app.set_status(format!("Applied {} to {}", CONDITIONS[sel], name));
        app.dialog = Dialog::None;
      }
      _ => {}
    }
  }
}

fn handle_effect_dialog(app: &mut App, key: KeyEvent) {
  if let Dialog::EffectEntry {
    combatant_idx,
    name,
    duration,
    note,
    field_idx,
  } = &mut app.dialog
  {
    match key.code {
      KeyCode::Tab => {
        *field_idx = (*field_idx + 1) % 3;
      }
      KeyCode::Char(ch) => {
        let field = match *field_idx {
          0 => name,
          1 => duration,
          _ => note,
        };
        field.push(ch);
      }
      KeyCode::Backspace => {
        let field = match *field_idx {
          0 => name,
          1 => duration,
          _ => note,
        };
        field.pop();
      }
      KeyCode::Enter => {
        if !name.is_empty() {
          let idx = *combatant_idx;
          let dur = duration.parse::<u32>().ok();
          let eff_name = name.clone();
          let eff_note = note.clone();
          if let Some(c) = app.combatants.get_mut(idx) {
            c.effects.push(
              dnd_encounter_manager_lib::combatant::AppliedEffect {
                name: eff_name.clone(),
                duration: dur,
                infinite: dur.is_none(),
                note: eff_note,
                decrement_on: Some(
                  dnd_encounter_manager_lib::types::DecrementTiming::TurnStart,
                ),
              },
            );
          }
          let cname = app.combatants.get(idx).map(|c| c.name.clone()).unwrap_or_default();
          app.set_status(format!("Applied {} to {}", eff_name, cname));
        }
        app.dialog = Dialog::None;
      }
      _ => {}
    }
  }
}

fn handle_add_combatant_dialog(app: &mut App, key: KeyEvent) {
  if let Dialog::AddCombatant {
    search,
    selected_creature,
    initiative,
    name_note,
    field_idx,
  } = &mut app.dialog
  {
    match key.code {
      KeyCode::Tab => {
        *field_idx = (*field_idx + 1) % 3;
      }
      KeyCode::Up if *field_idx == 0 => {
        if *selected_creature > 0 {
          *selected_creature -= 1;
        }
      }
      KeyCode::Down if *field_idx == 0 => {
        let count = app.creature_db.creatures.len();
        if *selected_creature + 1 < count {
          *selected_creature += 1;
        }
      }
      KeyCode::Char(ch) => {
        let field = match *field_idx {
          0 => search,
          1 => initiative,
          _ => name_note,
        };
        field.push(ch);
        // Reset selection when search changes
        if *field_idx == 0 {
          *selected_creature = 0;
        }
      }
      KeyCode::Backspace => {
        let field = match *field_idx {
          0 => search,
          1 => initiative,
          _ => name_note,
        };
        field.pop();
        if *field_idx == 0 {
          *selected_creature = 0;
        }
      }
      KeyCode::Enter => {
        // Filter creatures using the search field temporarily
        let query = search.to_lowercase();
        let matching: Vec<_> = app
          .creature_db
          .creatures
          .iter()
          .filter(|c| {
            query.is_empty()
              || c.name.to_lowercase().contains(&query)
          })
          .collect();

        if let Some(creature) = matching.get(*selected_creature) {
          let init = initiative.parse::<i32>().unwrap_or(10);
          let mut combatant = Combatant::from_creature(creature, init);
          if !name_note.is_empty() {
            combatant.name_note = name_note.clone();
          }
          let cname = combatant.name.clone();
          app.combatants.push(combatant);
          app.set_status(format!("Added {}", cname));
        }
        app.dialog = Dialog::None;
      }
      _ => {}
    }
  }
}

fn handle_confirm_delete(app: &mut App, key: KeyEvent) {
  if let Dialog::ConfirmDelete { creature_idx } = &app.dialog {
    match key.code {
      KeyCode::Char('y') | KeyCode::Enter => {
        let idx = *creature_idx;
        if idx < app.creature_db.creatures.len() {
          let name = app.creature_db.creatures[idx].name.clone();
          app.creature_db.creatures.remove(idx);
          app.creature_db.metadata.total_creatures =
            app.creature_db.creatures.len();
          app.set_status(format!("Deleted {}", name));
          if app.creature_selected >= app.creature_db.creatures.len()
            && !app.creature_db.creatures.is_empty()
          {
            app.creature_selected =
              app.creature_db.creatures.len() - 1;
          }
        }
        app.dialog = Dialog::None;
      }
      KeyCode::Char('n') => {
        app.dialog = Dialog::None;
      }
      _ => {}
    }
  }
}

fn handle_dice_roll_dialog(app: &mut App, key: KeyEvent) {
  if let Dialog::DiceRoll { notation } = &mut app.dialog {
    match key.code {
      KeyCode::Char(ch) => notation.push(ch),
      KeyCode::Backspace => {
        notation.pop();
      }
      KeyCode::Enter => {
        if let Ok(expr) = dice::parse(notation) {
          let result = dice::roll(&expr);
          app.set_status(format!("Rolled {}: {}", expr, result.total));
          app.dice_history.insert(0, result);
        }
        app.dialog = Dialog::None;
      }
      _ => {}
    }
  }
}

fn handle_quick_initiative(app: &mut App, key: KeyEvent) {
  match key.code {
    KeyCode::Char('s') => {
      // Sort by current initiative
      combat::sort_by_initiative(&mut app.combatants);
      app.set_status("Sorted by initiative");
      app.dialog = Dialog::None;
    }
    KeyCode::Char('r') => {
      // Roll initiative for all using d20
      for c in &mut app.combatants {
        let d20 = dice::roll(&dice::parse("1d20").unwrap());
        c.initiative = d20.total;
      }
      combat::sort_by_initiative(&mut app.combatants);
      app.set_status("Rolled initiative for all");
      app.dialog = Dialog::None;
    }
    _ => {
      app.dialog = Dialog::None;
    }
  }
}
