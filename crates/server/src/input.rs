use crate::app::{
  App, Dialog, EditField, HpMode, RollMode, View, CREATURE_TYPES, STATUS_FLAGS,
};
use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use dnd_encounter_manager_lib::combatant::AppliedCondition;
use dnd_encounter_manager_lib::combatant::AppliedEffect;
use dnd_encounter_manager_lib::combatant::Combatant;
use dnd_encounter_manager_lib::creature::{self, Creature};
use dnd_encounter_manager_lib::types::{CreatureType, DecrementTiming};
use dnd_encounter_manager_lib::{calculation, combat, dice};

pub fn handle_key(app: &mut App, key: KeyEvent) {
  if key.modifiers.contains(KeyModifiers::CONTROL)
    && key.code == KeyCode::Char('c')
  {
    app.should_quit = true;
    return;
  }

  if app.dialog != Dialog::None {
    handle_dialog_key(app, key);
    return;
  }

  match key.code {
    KeyCode::Char('q') => {
      app.should_quit = true;
      return;
    }
    KeyCode::Char('1') => { app.view = View::Combat; return; }
    KeyCode::Char('2') => { app.view = View::Compendium; return; }
    KeyCode::Char('3') => { app.view = View::Dice; return; }
    KeyCode::Char('4') => { app.view = View::Encounters; return; }
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

  match app.view {
    View::Combat => handle_combat_key(app, key),
    View::Compendium => handle_compendium_key(app, key),
    View::Dice => handle_dice_key(app, key),
    View::Encounters => handle_encounters_key(app, key),
  }
}

fn handle_combat_key(app: &mut App, key: KeyEvent) {
  let has_combatants = !app.combatants.is_empty();
  let has_batch = !app.batch_selected.is_empty();

  match key.code {
    KeyCode::Up if has_combatants => {
      if app.combat_selected > 0 { app.combat_selected -= 1; }
    }
    KeyCode::Down if has_combatants => {
      if app.combat_selected + 1 < app.combatants.len() {
        app.combat_selected += 1;
      }
    }
    KeyCode::Char('n') if has_combatants => {
      // Execute auto-roll for current combatant before advancing
      execute_auto_roll(app);
      combat::advance_turn(&mut app.combat_state, &mut app.combatants);
      app.combat_selected = app.combat_state.current_turn_index;
      // Execute auto-roll for new active combatant (start-of-turn)
      execute_auto_roll_start(app);
      app.set_status(format!("Round {}", app.combat_state.round));
    }
    KeyCode::Char('r') if has_combatants => {
      combat::reset_combat(&mut app.combat_state, &mut app.combatants);
      app.set_status("Combat reset");
    }
    KeyCode::Char('s') if has_combatants => {
      app.combat_state = combat::start_combat(&mut app.combatants);
      app.combat_selected = 0;
      app.set_status("Combat started — sorted by initiative");
    }
    KeyCode::Char('d') if has_combatants => {
      app.dialog = Dialog::HpModification {
        combatant_idx: app.combat_selected,
        amount: String::new(),
        mode: HpMode::Damage,
        batch: has_batch,
      };
    }
    KeyCode::Char('h') if has_combatants => {
      app.dialog = Dialog::HpModification {
        combatant_idx: app.combat_selected,
        amount: String::new(),
        mode: HpMode::Heal,
        batch: has_batch,
      };
    }
    KeyCode::Char('t') if has_combatants => {
      app.dialog = Dialog::HpModification {
        combatant_idx: app.combat_selected,
        amount: String::new(),
        mode: HpMode::TempHp,
        batch: has_batch,
      };
    }
    KeyCode::Char('c') if has_combatants => {
      app.dialog = Dialog::ConditionPicker {
        combatant_idx: app.combat_selected,
        selected: 0,
        duration: "1".to_string(),
        batch: has_batch,
      };
    }
    KeyCode::Char('e') if has_combatants => {
      app.dialog = Dialog::EffectEntry {
        combatant_idx: app.combat_selected,
        name: String::new(),
        duration: "1".to_string(),
        note: String::new(),
        field_idx: 0,
        batch: has_batch,
      };
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
    KeyCode::Char('i') if has_combatants => {
      app.dialog = Dialog::QuickInitiative;
    }
    KeyCode::Char('w') if has_combatants => {
      app.dialog = Dialog::DuplicateCombatant {
        combatant_idx: app.combat_selected,
      };
    }
    KeyCode::Char('f') if has_combatants => {
      app.dialog = Dialog::StatusFlags {
        combatant_idx: app.combat_selected,
        selected: 0,
      };
    }
    KeyCode::Char('o') if has_combatants => {
      app.dialog = Dialog::AutoRoll {
        combatant_idx: app.combat_selected,
        formula: app.combatants.get(app.combat_selected)
          .and_then(|c| c.auto_roll.as_ref())
          .map(|ar| ar.formula.clone())
          .unwrap_or_default(),
        timing_idx: 0,
        field_idx: 0,
      };
    }
    KeyCode::Enter if has_combatants => {
      let init_str = app.combatants[app.combat_selected].initiative.to_string();
      app.dialog = Dialog::InlineEdit {
        combatant_idx: app.combat_selected,
        field: EditField::Initiative,
        value: init_str,
      };
    }
    KeyCode::Char('x') | KeyCode::Delete if has_combatants => {
      app.combatants.remove(app.combat_selected);
      if app.combat_selected >= app.combatants.len() && !app.combatants.is_empty() {
        app.combat_selected = app.combatants.len() - 1;
      }
      app.batch_selected.clear();
      app.set_status("Combatant removed");
    }
    KeyCode::Char(' ') if has_combatants => {
      if app.batch_selected.contains(&app.combat_selected) {
        app.batch_selected.remove(&app.combat_selected);
      } else {
        app.batch_selected.insert(app.combat_selected);
      }
    }
    _ => {}
  }
}

fn handle_compendium_key(app: &mut App, key: KeyEvent) {
  let filtered_count = app.filtered_creatures().len();

  match key.code {
    KeyCode::Up => {
      if app.creature_selected > 0 { app.creature_selected -= 1; }
    }
    KeyCode::Down => {
      if app.creature_selected + 1 < filtered_count {
        app.creature_selected += 1;
      }
    }
    KeyCode::Char('/') | KeyCode::Esc => {
      app.creature_search.clear();
      app.creature_selected = 0;
    }
    KeyCode::Backspace => {
      app.creature_search.pop();
      app.creature_selected = 0;
    }
    KeyCode::Char('`') => {
      // Sort mode toggle (backtick since 'o' would conflict with typing)
      app.sort_mode = app.sort_mode.next();
      app.creature_selected = 0;
      app.set_status(format!("Sort: {}", app.sort_mode.label()));
    }
    KeyCode::F(2) => {
      // New creature
      app.dialog = Dialog::CreatureForm {
        editing: None,
        name: String::new(),
        ac: "10".to_string(),
        hp: "1".to_string(),
        cr: "0".to_string(),
        creature_type_idx: 0,
        field_idx: 0,
      };
    }
    KeyCode::F(3) => {
      // Edit selected creature
      let filtered = app.filtered_creatures();
      if let Some(&(orig_idx, creature)) = filtered.get(app.creature_selected) {
        app.dialog = Dialog::CreatureForm {
          editing: Some(orig_idx),
          name: creature.name.clone(),
          ac: creature.ac.to_string(),
          hp: creature.max_hp.to_string(),
          cr: creature.cr.clone(),
          creature_type_idx: match creature.creature_type {
            CreatureType::Enemy => 0,
            CreatureType::Player => 1,
            CreatureType::Npc => 2,
            _ => 0,
          },
          field_idx: 0,
        };
      }
    }
    KeyCode::F(4) => {
      // Paste stat block
      app.dialog = Dialog::StatBlockParser {
        text: String::new(),
        preview: None,
      };
    }
    KeyCode::Char('x') | KeyCode::Delete => {
      let filtered = app.filtered_creatures();
      if let Some(&(orig_idx, _)) = filtered.get(app.creature_selected) {
        app.dialog = Dialog::ConfirmDelete { creature_idx: orig_idx };
      }
    }
    KeyCode::Char(ch) if ch.is_alphanumeric() || ch == ' ' || ch == '-' => {
      app.creature_search.push(ch);
      app.creature_selected = 0;
    }
    _ => {}
  }
}

fn handle_dice_key(app: &mut App, key: KeyEvent) {
  match key.code {
    KeyCode::Char('!') => {
      app.roll_mode = app.roll_mode.next();
      app.set_status(format!("Roll mode: {}", app.roll_mode.label()));
    }
    KeyCode::Char(ch) => app.dice_input.push(ch),
    KeyCode::Backspace => { app.dice_input.pop(); }
    KeyCode::Enter => {
      if let Ok(expr) = dice::parse(&app.dice_input) {
        let result = match app.roll_mode {
          RollMode::Normal => dice::roll(&expr),
          RollMode::Advantage => dice::roll_advantage(&expr),
          RollMode::Disadvantage => dice::roll_disadvantage(&expr),
        };
        app.set_status(format!(
          "{} {}: [{}] = {}",
          app.roll_mode.label(),
          result.expression,
          result.rolls.iter().map(|r| r.to_string()).collect::<Vec<_>>().join(","),
          result.total
        ));
        app.dice_history.insert(0, result);
        if app.dice_history.len() > 20 { app.dice_history.truncate(20); }
      } else if !app.dice_input.is_empty() {
        app.set_status(format!("Invalid: {}", app.dice_input));
      }
      app.dice_input.clear();
    }
    KeyCode::Esc => { app.dice_input.clear(); }
    _ => {}
  }
}

fn handle_encounters_key(app: &mut App, key: KeyEvent) {
  match key.code {
    KeyCode::Up => {
      if app.encounter_selected > 0 { app.encounter_selected -= 1; }
    }
    KeyCode::Down => {
      if app.encounter_selected + 1 < app.encounter_names.len() {
        app.encounter_selected += 1;
      }
    }
    KeyCode::Char('s') => {
      if !app.combatants.is_empty() {
        app.dialog = Dialog::SaveEncounter { name: String::new() };
      } else {
        app.set_status("No combatants to save");
      }
    }
    _ => {}
  }
}

// ── Dialog handlers ─────────────────────────────────────────────────────────

fn handle_dialog_key(app: &mut App, key: KeyEvent) {
  if key.code == KeyCode::Esc {
    app.dialog = Dialog::None;
    return;
  }

  let dialog = app.dialog.clone();
  match dialog {
    Dialog::HpModification { .. } => handle_hp_dialog(app, key),
    Dialog::ConditionPicker { .. } => handle_condition_dialog(app, key),
    Dialog::EffectEntry { .. } => handle_effect_dialog(app, key),
    Dialog::AddCombatant { .. } => handle_add_combatant_dialog(app, key),
    Dialog::ConfirmDelete { .. } => handle_confirm_delete(app, key),
    Dialog::QuickInitiative => handle_quick_initiative(app, key),
    Dialog::DuplicateCombatant { .. } => handle_duplicate(app, key),
    Dialog::SaveEncounter { .. } => handle_save_encounter(app, key),
    Dialog::StatusFlags { .. } => handle_status_flags(app, key),
    Dialog::InlineEdit { .. } => handle_inline_edit(app, key),
    Dialog::CreatureForm { .. } => handle_creature_form(app, key),
    Dialog::StatBlockParser { .. } => handle_stat_block_parser(app, key),
    Dialog::AutoRoll { .. } => handle_auto_roll_dialog(app, key),
    Dialog::DiceRoll { .. } | Dialog::None => {}
  }
}

fn handle_hp_dialog(app: &mut App, key: KeyEvent) {
  if let Dialog::HpModification { combatant_idx, amount, mode, batch } = &mut app.dialog {
    match key.code {
      KeyCode::Char(ch) if ch.is_ascii_digit() => amount.push(ch),
      KeyCode::Backspace => { amount.pop(); }
      KeyCode::Tab => { *mode = mode.next(); }
      KeyCode::Enter => {
        if let Ok(val) = amount.parse::<u32>() {
          let m = *mode;
          let is_batch = *batch;
          let targets = if is_batch {
            app.batch_selected.iter().copied().collect::<Vec<_>>()
          } else {
            vec![*combatant_idx]
          };
          let mut names = Vec::new();
          for idx in &targets {
            if let Some(c) = app.combatants.get_mut(*idx) {
              match m {
                HpMode::Damage => { calculation::apply_damage(c, val); }
                HpMode::Heal => { calculation::apply_healing(c, val); }
                HpMode::TempHp => { calculation::set_temp_hp(c, val); }
              }
              names.push(c.name.clone());
            }
          }
          app.set_status(format!("{} {} to {}", m.label(), val, names.join(", ")));
        }
        app.dialog = Dialog::None;
      }
      _ => {}
    }
  }
}

pub const CONDITIONS: &[&str] = &[
  "Blinded", "Charmed", "Deafened", "Frightened", "Grappled",
  "Incapacitated", "Invisible", "Paralyzed", "Petrified", "Poisoned",
  "Prone", "Restrained", "Stunned", "Unconscious",
];

fn handle_condition_dialog(app: &mut App, key: KeyEvent) {
  if let Dialog::ConditionPicker { combatant_idx, selected, duration, batch } = &mut app.dialog {
    match key.code {
      KeyCode::Up => { if *selected > 0 { *selected -= 1; } }
      KeyCode::Down => { if *selected + 1 < CONDITIONS.len() { *selected += 1; } }
      KeyCode::Char(ch) if ch.is_ascii_digit() => duration.push(ch),
      KeyCode::Backspace => { duration.pop(); }
      KeyCode::Enter => {
        let sel = *selected;
        let dur = duration.parse::<u32>().unwrap_or(1);
        let is_batch = *batch;
        let targets = if is_batch {
          app.batch_selected.iter().copied().collect::<Vec<_>>()
        } else {
          vec![*combatant_idx]
        };
        for idx in &targets {
          if let Some(c) = app.combatants.get_mut(*idx) {
            c.conditions.push(AppliedCondition {
              name: CONDITIONS[sel].to_string(),
              duration: Some(dur),
              infinite: false,
              note: String::new(),
              decrement_on: Some(DecrementTiming::TurnStart),
            });
          }
        }
        app.set_status(format!("Applied {} ({dur}t)", CONDITIONS[sel]));
        app.dialog = Dialog::None;
      }
      _ => {}
    }
  }
}

fn handle_effect_dialog(app: &mut App, key: KeyEvent) {
  if let Dialog::EffectEntry { combatant_idx, name, duration, note, field_idx, batch } = &mut app.dialog {
    match key.code {
      KeyCode::Tab => { *field_idx = (*field_idx + 1) % 3; }
      KeyCode::Char(ch) => {
        match *field_idx { 0 => name, 1 => duration, _ => note }.push(ch);
      }
      KeyCode::Backspace => {
        match *field_idx { 0 => name, 1 => duration, _ => note }.pop();
      }
      KeyCode::Enter if !name.is_empty() => {
        let dur = duration.parse::<u32>().ok();
        let eff_name = name.clone();
        let eff_note = note.clone();
        let is_batch = *batch;
        let targets = if is_batch {
          app.batch_selected.iter().copied().collect::<Vec<_>>()
        } else {
          vec![*combatant_idx]
        };
        for idx in &targets {
          if let Some(c) = app.combatants.get_mut(*idx) {
            c.effects.push(AppliedEffect {
              name: eff_name.clone(),
              duration: dur,
              infinite: dur.is_none(),
              note: eff_note.clone(),
              decrement_on: Some(DecrementTiming::TurnStart),
            });
          }
        }
        app.set_status(format!("Applied {}", eff_name));
        app.dialog = Dialog::None;
      }
      _ => {}
    }
  }
}

fn handle_add_combatant_dialog(app: &mut App, key: KeyEvent) {
  if let Dialog::AddCombatant { search, selected_creature, initiative, name_note, field_idx } = &mut app.dialog {
    match key.code {
      KeyCode::Tab => { *field_idx = (*field_idx + 1) % 3; }
      KeyCode::Up if *field_idx == 0 => {
        if *selected_creature > 0 { *selected_creature -= 1; }
      }
      KeyCode::Down if *field_idx == 0 => {
        *selected_creature += 1;
      }
      KeyCode::Char(ch) => {
        match *field_idx { 0 => search, 1 => initiative, _ => name_note }.push(ch);
        if *field_idx == 0 { *selected_creature = 0; }
      }
      KeyCode::Backspace => {
        match *field_idx { 0 => search, 1 => initiative, _ => name_note }.pop();
        if *field_idx == 0 { *selected_creature = 0; }
      }
      KeyCode::Enter => {
        let query = search.to_lowercase();
        let matching: Vec<&Creature> = app.creature_db.creatures.iter()
          .filter(|c| query.is_empty() || c.name.to_lowercase().contains(&query))
          .collect();
        if let Some(creature) = matching.get(*selected_creature) {
          let init = initiative.parse::<i32>().unwrap_or(10);
          let mut combatant = Combatant::from_creature(creature, init);
          if !name_note.is_empty() { combatant.name_note = name_note.clone(); }
          app.set_status(format!("Added {}", combatant.name));
          app.combatants.push(combatant);
        }
        app.dialog = Dialog::None;
      }
      _ => {}
    }
  }
}

fn handle_confirm_delete(app: &mut App, key: KeyEvent) {
  if let Dialog::ConfirmDelete { creature_idx } = app.dialog {
    match key.code {
      KeyCode::Char('y') | KeyCode::Enter => {
        if creature_idx < app.creature_db.creatures.len() {
          let name = app.creature_db.creatures[creature_idx].name.clone();
          app.creature_db.creatures.remove(creature_idx);
          app.creature_db.metadata.total_creatures = app.creature_db.creatures.len();
          app.set_status(format!("Deleted {}", name));
          if app.creature_selected >= app.creature_db.creatures.len() && !app.creature_db.creatures.is_empty() {
            app.creature_selected = app.creature_db.creatures.len() - 1;
          }
        }
        app.dialog = Dialog::None;
      }
      KeyCode::Char('n') => { app.dialog = Dialog::None; }
      _ => {}
    }
  }
}

fn handle_quick_initiative(app: &mut App, key: KeyEvent) {
  match key.code {
    KeyCode::Char('s') => {
      combat::sort_by_initiative(&mut app.combatants);
      app.set_status("Sorted by initiative");
      app.dialog = Dialog::None;
    }
    KeyCode::Char('r') => {
      for c in &mut app.combatants {
        let d20 = dice::roll(&dice::parse("1d20").unwrap());
        c.initiative = d20.total;
      }
      combat::sort_by_initiative(&mut app.combatants);
      app.set_status("Rolled initiative for all and sorted");
      app.dialog = Dialog::None;
    }
    KeyCode::Char('c') => {
      // Roll for selected combatant only
      let mut rolled_msg = String::new();
      if let Some(c) = app.combatants.get_mut(app.combat_selected) {
        let d20 = dice::roll(&dice::parse("1d20").unwrap());
        c.initiative = d20.total;
        rolled_msg = format!("{} rolled {}", c.name, d20.total);
      }
      if !rolled_msg.is_empty() { app.set_status(rolled_msg); }
      app.dialog = Dialog::None;
    }
    KeyCode::Char('b') => {
      // Roll for batch selected
      for &idx in &app.batch_selected.clone() {
        if let Some(c) = app.combatants.get_mut(idx) {
          let d20 = dice::roll(&dice::parse("1d20").unwrap());
          c.initiative = d20.total;
        }
      }
      combat::sort_by_initiative(&mut app.combatants);
      app.set_status("Rolled initiative for selected and sorted");
      app.dialog = Dialog::None;
    }
    _ => { app.dialog = Dialog::None; }
  }
}

fn handle_duplicate(app: &mut App, key: KeyEvent) {
  if let Dialog::DuplicateCombatant { combatant_idx } = app.dialog {
    if combatant_idx >= app.combatants.len() {
      app.dialog = Dialog::None;
      return;
    }
    match key.code {
      KeyCode::Char('1') => {
        // Fresh copy: reset HP, clear conditions/effects
        let orig = &app.combatants[combatant_idx];
        let mut dup = orig.clone();
        dup.id = format!("combatant-{}-{}", chrono::Utc::now().timestamp_millis(), rand::random::<u32>() % 1_000_000);
        dup.current_hp = dup.max_hp;
        dup.temp_hp = 0;
        dup.conditions.clear();
        dup.effects.clear();
        dup.is_active = false;
        dup.death_saves = Default::default();
        let name = dup.name.clone();
        app.combatants.push(dup);
        app.set_status(format!("Duplicated {} (fresh)", name));
        app.dialog = Dialog::None;
      }
      KeyCode::Char('2') => {
        // Preserve state
        let orig = &app.combatants[combatant_idx];
        let mut dup = orig.clone();
        dup.id = format!("combatant-{}-{}", chrono::Utc::now().timestamp_millis(), rand::random::<u32>() % 1_000_000);
        dup.is_active = false;
        let name = dup.name.clone();
        app.combatants.push(dup);
        app.set_status(format!("Duplicated {} (preserved)", name));
        app.dialog = Dialog::None;
      }
      KeyCode::Char('3') => {
        // Ooze split: halve HP, keep conditions/effects
        let orig = &app.combatants[combatant_idx];
        let half_hp = orig.current_hp / 2;
        let mut dup = orig.clone();
        dup.id = format!("combatant-{}-{}", chrono::Utc::now().timestamp_millis(), rand::random::<u32>() % 1_000_000);
        dup.current_hp = half_hp;
        dup.is_active = false;
        // Also halve original
        app.combatants[combatant_idx].current_hp = half_hp;
        let name = dup.name.clone();
        app.combatants.push(dup);
        app.set_status(format!("Ooze split {} (HP halved)", name));
        app.dialog = Dialog::None;
      }
      _ => { app.dialog = Dialog::None; }
    }
  }
}

fn handle_save_encounter(app: &mut App, key: KeyEvent) {
  if let Dialog::SaveEncounter { name } = &mut app.dialog {
    match key.code {
      KeyCode::Char(ch) => name.push(ch),
      KeyCode::Backspace => { name.pop(); }
      KeyCode::Enter if !name.is_empty() => {
        let enc_name = name.clone();
        let id = dnd_encounter_manager_lib::encounter::generate_encounter_id();
        app.encounter_names.push((id, enc_name.clone()));
        app.set_status(format!("Saved encounter: {}", enc_name));
        app.dialog = Dialog::None;
      }
      _ => {}
    }
  }
}

fn handle_status_flags(app: &mut App, key: KeyEvent) {
  if let Dialog::StatusFlags { combatant_idx, selected } = &mut app.dialog {
    match key.code {
      KeyCode::Up => { if *selected > 0 { *selected -= 1; } }
      KeyCode::Down => { if *selected + 1 < STATUS_FLAGS.len() { *selected += 1; } }
      KeyCode::Enter => {
        let idx = *combatant_idx;
        let sel = *selected;
        if let Some(c) = app.combatants.get_mut(idx) {
          match sel {
            0 => { c.status.concentration = !c.status.concentration; }
            1 => { c.status.hiding = !c.status.hiding; }
            2 => { c.status.surprised = !c.status.surprised; }
            3 => { c.status.cover = c.status.cover.next(); }
            4 => { c.status.flying = !c.status.flying; }
            _ => {}
          }
        }
        let flag = STATUS_FLAGS[sel];
        let cname = app.combatants.get(idx).map(|c| c.name.clone()).unwrap_or_default();
        app.set_status(format!("Toggled {} on {}", flag, cname));
        app.dialog = Dialog::None;
      }
      _ => {}
    }
  }
}

fn handle_inline_edit(app: &mut App, key: KeyEvent) {
  if let Dialog::InlineEdit { combatant_idx, field, value } = &mut app.dialog {
    match key.code {
      KeyCode::Char(ch) if ch.is_ascii_digit() || ch == '-' => value.push(ch),
      KeyCode::Backspace => { value.pop(); }
      KeyCode::Tab => {
        *field = match *field {
          EditField::Initiative => EditField::Ac,
          EditField::Ac => EditField::Initiative,
        };
        let idx = *combatant_idx;
        *value = match *field {
          EditField::Initiative => app.combatants.get(idx).map(|c| c.initiative.to_string()).unwrap_or_default(),
          EditField::Ac => app.combatants.get(idx).map(|c| c.ac.to_string()).unwrap_or_default(),
        };
      }
      KeyCode::Enter => {
        let idx = *combatant_idx;
        let f = *field;
        let val_str = value.clone();
        if let Some(c) = app.combatants.get_mut(idx) {
          match f {
            EditField::Initiative => {
              if let Ok(v) = val_str.parse::<i32>() { c.initiative = v; }
            }
            EditField::Ac => {
              if let Ok(v) = val_str.parse::<u16>() { c.ac = v; }
            }
          }
        }
        app.set_status(format!("Set {} to {}", f.label(), val_str));
        app.dialog = Dialog::None;
      }
      _ => {}
    }
  }
}

fn handle_creature_form(app: &mut App, key: KeyEvent) {
  if let Dialog::CreatureForm { editing, name, ac, hp, cr, creature_type_idx, field_idx } = &mut app.dialog {
    match key.code {
      KeyCode::Tab => { *field_idx = (*field_idx + 1) % 5; }
      KeyCode::Char(ch) => {
        match *field_idx {
          0 => name.push(ch),
          1 => { if ch.is_ascii_digit() { ac.push(ch); } }
          2 => { if ch.is_ascii_digit() { hp.push(ch); } }
          3 => cr.push(ch),
          4 => { *creature_type_idx = (*creature_type_idx + 1) % CREATURE_TYPES.len(); }
          _ => {}
        }
      }
      KeyCode::Backspace => {
        match *field_idx {
          0 => { name.pop(); }
          1 => { ac.pop(); }
          2 => { hp.pop(); }
          3 => { cr.pop(); }
          _ => {}
        }
      }
      KeyCode::Enter if !name.is_empty() => {
        let ct = match CREATURE_TYPES[*creature_type_idx] {
          "player" => CreatureType::Player,
          "npc" => CreatureType::Npc,
          _ => CreatureType::Enemy,
        };
        let new_ac = ac.parse().unwrap_or(10);
        let new_hp = hp.parse().unwrap_or(1);
        let new_cr = cr.clone();
        let new_name = name.clone();

        if let Some(edit_idx) = *editing {
          // Edit existing creature
          if let Some(c) = app.creature_db.creatures.get_mut(edit_idx) {
            c.name = new_name.clone();
            c.ac = new_ac;
            c.max_hp = new_hp;
            c.cr = new_cr;
            c.creature_type = ct;
          }
          app.set_status(format!("Updated {}", new_name));
        } else {
          // Create new creature
          let id = creature::generate_creature_id(&new_name);
          app.creature_db.creatures.push(Creature {
            id,
            name: new_name.clone(),
            creature_type: ct,
            ac: new_ac,
            max_hp: new_hp,
            cr: new_cr,
            size: None,
            race: None,
            subrace: None,
            alignment: None,
            description: None,
            source: Some("Custom".to_string()),
            has_full_stat_block: false,
            stat_block: None,
          });
          app.creature_db.metadata.total_creatures = app.creature_db.creatures.len();
          app.set_status(format!("Created {}", new_name));
        }
        app.dialog = Dialog::None;
      }
      _ => {}
    }
  }
}

fn handle_stat_block_parser(app: &mut App, key: KeyEvent) {
  if let Dialog::StatBlockParser { text, preview } = &mut app.dialog {
    match key.code {
      KeyCode::Char(ch) => {
        text.push(ch);
        // Update preview on each keystroke
        match dnd_encounter_manager_lib::parser::parse_stat_block(text) {
          Ok(c) => *preview = Some(format!("{} AC:{} HP:{} CR:{}", c.name, c.ac, c.max_hp, c.cr)),
          Err(_) => *preview = None,
        }
      }
      KeyCode::Backspace => {
        text.pop();
        match dnd_encounter_manager_lib::parser::parse_stat_block(text) {
          Ok(c) => *preview = Some(format!("{} AC:{} HP:{} CR:{}", c.name, c.ac, c.max_hp, c.cr)),
          Err(_) => *preview = None,
        }
      }
      KeyCode::Enter => {
        // Try to parse the text line-by-line (Enter adds newline for multi-line input)
        text.push('\n');
        match dnd_encounter_manager_lib::parser::parse_stat_block(text) {
          Ok(c) => *preview = Some(format!("{} AC:{} HP:{} CR:{}", c.name, c.ac, c.max_hp, c.cr)),
          Err(_) => *preview = None,
        }
      }
      KeyCode::F(5) => {
        // F5 = Import the parsed creature
        match dnd_encounter_manager_lib::parser::parse_stat_block(text) {
          Ok(creature) => {
            let cname = creature.name.clone();
            app.creature_db.creatures.push(creature);
            app.creature_db.metadata.total_creatures = app.creature_db.creatures.len();
            app.set_status(format!("Imported {}", cname));
            app.dialog = Dialog::None;
          }
          Err(e) => {
            app.set_status(format!("Parse error: {}", e));
          }
        }
      }
      _ => {}
    }
  }
}

fn handle_auto_roll_dialog(app: &mut App, key: KeyEvent) {
  if let Dialog::AutoRoll { combatant_idx, formula, timing_idx, field_idx } = &mut app.dialog {
    match key.code {
      KeyCode::Tab => { *field_idx = (*field_idx + 1) % 2; }
      KeyCode::Char(ch) if *field_idx == 0 => formula.push(ch),
      KeyCode::Char(_) if *field_idx == 1 => {
        *timing_idx = (*timing_idx + 1) % 2;
      }
      KeyCode::Backspace if *field_idx == 0 => { formula.pop(); }
      KeyCode::Enter => {
        let idx = *combatant_idx;
        let timing = if *timing_idx == 0 { DecrementTiming::TurnStart } else { DecrementTiming::TurnEnd };
        let formula_str = formula.clone();
        let is_empty = formula_str.is_empty();
        let is_valid = !is_empty && dice::parse(&formula_str).is_ok();

        if is_empty {
          if let Some(c) = app.combatants.get_mut(idx) {
            c.auto_roll = None;
          }
          let cname = app.combatants.get(idx).map(|c| c.name.clone()).unwrap_or_default();
          app.set_status(format!("Cleared auto-roll on {}", cname));
        } else if is_valid {
          if let Some(c) = app.combatants.get_mut(idx) {
            c.auto_roll = Some(dnd_encounter_manager_lib::combatant::AutoRollConfig {
              formula: formula_str.clone(),
              advantage: false,
              disadvantage: false,
              timing,
            });
          }
          let cname = app.combatants.get(idx).map(|c| c.name.clone()).unwrap_or_default();
          app.set_status(format!("Set auto-roll {} on {}", formula_str, cname));
        } else {
          app.set_status(format!("Invalid dice: {}", formula_str));
        }
        app.dialog = Dialog::None;
      }
      _ => {}
    }
  }
}

// ── Auto-roll execution ─────────────────────────────────────────────────────

/// Execute auto-roll for end-of-turn on the current combatant.
fn execute_auto_roll(app: &mut App) {
  let idx = app.combat_state.current_turn_index;
  if let Some(c) = app.combatants.get(idx) {
    if let Some(ar) = &c.auto_roll {
      if ar.timing == DecrementTiming::TurnEnd {
        if let Ok(expr) = dice::parse(&ar.formula) {
          let result = dice::roll(&expr);
          app.last_auto_roll_result = Some(format!(
            "{} auto-rolled {}: {} = {}",
            c.name, ar.formula,
            result.rolls.iter().map(|r| r.to_string()).collect::<Vec<_>>().join("+"),
            result.total
          ));
        }
      }
    }
  }
}

/// Execute auto-roll for start-of-turn on the new active combatant.
fn execute_auto_roll_start(app: &mut App) {
  let idx = app.combat_state.current_turn_index;
  if let Some(c) = app.combatants.get(idx) {
    if let Some(ar) = &c.auto_roll {
      if ar.timing == DecrementTiming::TurnStart {
        if let Ok(expr) = dice::parse(&ar.formula) {
          let result = dice::roll(&expr);
          app.last_auto_roll_result = Some(format!(
            "{} auto-rolled {}: {} = {}",
            c.name, ar.formula,
            result.rolls.iter().map(|r| r.to_string()).collect::<Vec<_>>().join("+"),
            result.total
          ));
        }
      }
    }
  }
}
