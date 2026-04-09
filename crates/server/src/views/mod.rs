pub mod combat;
pub mod compendium;
pub mod dice;
pub mod encounters;

use crate::app::{App, Dialog, View};
use ratatui::layout::{Constraint, Layout, Rect};
use ratatui::style::{Color, Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Clear, Paragraph, Tabs};
use ratatui::Frame;

/// Render the entire application frame.
pub fn render(frame: &mut Frame, app: &App) {
  let [header, body, footer] = Layout::vertical([
    Constraint::Length(3),
    Constraint::Min(1),
    Constraint::Length(1),
  ])
  .areas(frame.area());

  render_header(frame, app, header);

  match app.view {
    View::Combat => combat::render(frame, app, body),
    View::Compendium => compendium::render(frame, app, body),
    View::Dice => dice::render(frame, app, body),
    View::Encounters => encounters::render(frame, app, body),
  }

  render_footer(frame, app, footer);

  // Render dialog overlay on top
  if app.dialog != Dialog::None {
    render_dialog(frame, app);
  }
}

fn render_header(frame: &mut Frame, app: &App, area: Rect) {
  let tab_titles = ["1:Combat", "2:Compendium", "3:Dice", "4:Encounters"];
  let selected = match app.view {
    View::Combat => 0,
    View::Compendium => 1,
    View::Dice => 2,
    View::Encounters => 3,
  };

  let round_info = if !app.combatants.is_empty() {
    format!("  R:{} T:{}", app.combat_state.round, app.combat_state.current_turn_index + 1)
  } else {
    String::new()
  };

  let tabs = Tabs::new(tab_titles)
    .select(selected)
    .highlight_style(Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD))
    .block(
      Block::default()
        .borders(Borders::ALL)
        .title(format!(" D&D Encounter Manager{round_info} ")),
    );

  frame.render_widget(tabs, area);
}

fn render_footer(frame: &mut Frame, app: &App, area: Rect) {
  let text = if let Some((msg, _)) = &app.status_message {
    msg.clone()
  } else {
    match app.view {
      View::Combat => {
        "[S]tart [N]ext [R]eset [D]mg [H]eal [T]emp [C]ond [E]ffect [A]dd [I]nit [W]dup [F]lags [O]auto Enter:edit [Q]uit"
          .to_string()
      }
      View::Compendium => {
        "Type to search | [`]sort | F2:New F3:Edit F4:Paste | [X]del [Esc]clear [Q]uit"
          .to_string()
      }
      View::Dice => {
        "Type notation, Enter=roll | [!]mode (Normal/Adv/Disadv) | [Q]uit"
          .to_string()
      }
      View::Encounters => {
        "[S]ave encounter | Up/Down browse | [Q]uit".to_string()
      }
    }
  };

  let style = if app.status_message.is_some() {
    Style::default().fg(Color::Green)
  } else {
    Style::default().fg(Color::DarkGray)
  };

  frame.render_widget(Paragraph::new(text).style(style), area);
}

/// Render a centered dialog overlay.
fn render_dialog(frame: &mut Frame, app: &App) {
  let area = centered_rect(60, 40, frame.area());
  frame.render_widget(Clear, area);

  match &app.dialog {
    Dialog::HpModification { combatant_idx, amount, mode, batch } => {
      let target = if *batch {
        format!("{} combatants", app.batch_selected.len())
      } else {
        app.combatants.get(*combatant_idx).map(|c| c.name.as_str()).unwrap_or("?").to_string()
      };
      let p = Paragraph::new(vec![
        Line::from(format!("Target: {target}")),
        Line::from(""),
        Line::from(vec![
          Span::raw("Mode: "),
          Span::styled(mode.label(), Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)),
          Span::raw("  (Tab to change)"),
        ]),
        Line::from(""),
        Line::from(format!("Amount: {amount}▌")),
        Line::from(""),
        Line::from("Enter to apply | Esc to cancel"),
      ]).block(Block::default().borders(Borders::ALL).title(format!(" {} ", mode.label())));
      frame.render_widget(p, area);
    }

    Dialog::ConditionPicker { selected, duration, batch, .. } => {
      let batch_note = if *batch { " (batch)" } else { "" };
      let mut lines: Vec<Line> = crate::input::CONDITIONS.iter().enumerate().map(|(i, name)| {
        let marker = if i == *selected { "► " } else { "  " };
        let style = if i == *selected { Style::default().fg(Color::Yellow) } else { Style::default() };
        Line::from(Span::styled(format!("{marker}{name}"), style))
      }).collect();
      lines.push(Line::from(""));
      lines.push(Line::from(format!("Duration (turns): {duration}▌")));
      lines.push(Line::from("Enter to apply | Esc to cancel"));
      let p = Paragraph::new(lines).block(Block::default().borders(Borders::ALL).title(format!(" Add Condition{batch_note} ")));
      frame.render_widget(p, area);
    }

    Dialog::EffectEntry { name, duration, note, field_idx, .. } => {
      let fields = [("Name", name.as_str(), 0), ("Duration", duration.as_str(), 1), ("Note", note.as_str(), 2)];
      let lines: Vec<Line> = fields.iter().map(|(label, val, idx)| {
        let cursor = if *field_idx == *idx { "▌" } else { "" };
        let style = if *field_idx == *idx { Style::default().fg(Color::Yellow) } else { Style::default() };
        Line::from(Span::styled(format!("{label}: {val}{cursor}"), style))
      }).chain([Line::from(""), Line::from("Tab fields | Enter apply")]).collect();
      let p = Paragraph::new(lines).block(Block::default().borders(Borders::ALL).title(" Add Effect "));
      frame.render_widget(p, area);
    }

    Dialog::AddCombatant { search, selected_creature, initiative, name_note, field_idx } => {
      let mut lines = vec![Line::from(format!(
        "{}Search: {search}{}", if *field_idx == 0 { "► " } else { "  " }, if *field_idx == 0 { "▌" } else { "" },
      ))];
      let query = search.to_lowercase();
      let matching: Vec<_> = app.creature_db.creatures.iter()
        .filter(|c| query.is_empty() || c.name.to_lowercase().contains(&query)).take(8).enumerate().collect();
      for (i, creature) in &matching {
        let marker = if *i == *selected_creature { "  ► " } else { "    " };
        let style = if *i == *selected_creature { Style::default().fg(Color::Cyan) } else { Style::default() };
        lines.push(Line::from(Span::styled(format!("{marker}{} (CR {})", creature.name, creature.cr), style)));
      }
      lines.extend([
        Line::from(""),
        Line::from(format!("{}Initiative: {initiative}{}", if *field_idx == 1 { "► " } else { "  " }, if *field_idx == 1 { "▌" } else { "" })),
        Line::from(format!("{}Note: {name_note}{}", if *field_idx == 2 { "► " } else { "  " }, if *field_idx == 2 { "▌" } else { "" })),
        Line::from(""), Line::from("Tab switch | Enter add | Esc cancel"),
      ]);
      let p = Paragraph::new(lines).block(Block::default().borders(Borders::ALL).title(" Add Combatant "));
      frame.render_widget(p, area);
    }

    Dialog::ConfirmDelete { creature_idx } => {
      let name = app.creature_db.creatures.get(*creature_idx).map(|c| c.name.as_str()).unwrap_or("?");
      let p = Paragraph::new(vec![Line::from(format!("Delete \"{name}\"?")), Line::from(""), Line::from("[Y]es  [N]o")])
        .block(Block::default().borders(Borders::ALL).title(" Confirm Delete "));
      frame.render_widget(p, area);
    }

    Dialog::DiceRoll { notation } => {
      let p = Paragraph::new(vec![Line::from(format!("Notation: {notation}▌")), Line::from(""), Line::from("Enter roll | Esc cancel")])
        .block(Block::default().borders(Borders::ALL).title(" Roll Dice "));
      frame.render_widget(p, area);
    }

    Dialog::QuickInitiative => {
      let p = Paragraph::new(vec![
        Line::from("[R]oll initiative for all"),
        Line::from("[C]urrent combatant only"),
        Line::from("[B]atch (selected combatants)"),
        Line::from("[S]ort by current initiative"),
        Line::from(""),
        Line::from("Esc to cancel"),
      ]).block(Block::default().borders(Borders::ALL).title(" Quick Initiative "));
      frame.render_widget(p, area);
    }

    Dialog::DuplicateCombatant { combatant_idx } => {
      let name = app.combatants.get(*combatant_idx).map(|c| c.name.as_str()).unwrap_or("?");
      let p = Paragraph::new(vec![
        Line::from(format!("Duplicate: {name}")), Line::from(""),
        Line::from("[1] Fresh copy (reset HP, clear conditions)"),
        Line::from("[2] Preserve state (keep everything)"),
        Line::from("[3] Ooze split (halve HP, keep conditions)"),
        Line::from(""), Line::from("Esc to cancel"),
      ]).block(Block::default().borders(Borders::ALL).title(" Duplicate Combatant "));
      frame.render_widget(p, area);
    }

    Dialog::SaveEncounter { name } => {
      let p = Paragraph::new(vec![
        Line::from(format!("Encounter name: {name}▌")),
        Line::from(format!("Combatants: {}", app.combatants.len())),
        Line::from(format!("Round: {}", app.combat_state.round)),
        Line::from(""), Line::from("Enter to save | Esc to cancel"),
      ]).block(Block::default().borders(Borders::ALL).title(" Save Encounter "));
      frame.render_widget(p, area);
    }

    Dialog::StatusFlags { combatant_idx, selected } => {
      let name = app.combatants.get(*combatant_idx).map(|c| c.name.as_str()).unwrap_or("?");
      let status = app.combatants.get(*combatant_idx);
      let mut lines = vec![Line::from(format!("Combatant: {name}")), Line::from("")];
      for (i, flag) in crate::app::STATUS_FLAGS.iter().enumerate() {
        let marker = if i == *selected { "► " } else { "  " };
        let state = status.map(|c| match i {
          0 => if c.status.concentration { "ON" } else { "off" },
          1 => if c.status.hiding { "ON" } else { "off" },
          2 => if c.status.surprised { "ON" } else { "off" },
          3 => match c.status.cover {
            dnd_encounter_manager_lib::types::CoverType::None => "None",
            dnd_encounter_manager_lib::types::CoverType::Half => "Half",
            dnd_encounter_manager_lib::types::CoverType::ThreeQuarters => "3/4",
            dnd_encounter_manager_lib::types::CoverType::Full => "Full",
          },
          4 => if c.status.flying { "ON" } else { "off" },
          _ => "?",
        }).unwrap_or("?");
        let style = if i == *selected { Style::default().fg(Color::Yellow) } else { Style::default() };
        lines.push(Line::from(Span::styled(format!("{marker}{flag}: {state}"), style)));
      }
      lines.extend([Line::from(""), Line::from("Enter to toggle | Esc to close")]);
      let p = Paragraph::new(lines).block(Block::default().borders(Borders::ALL).title(" Status Flags "));
      frame.render_widget(p, area);
    }

    Dialog::InlineEdit { field, value, .. } => {
      let p = Paragraph::new(vec![
        Line::from(format!("{}: {value}▌", field.label())),
        Line::from("Tab to switch field"),
        Line::from(""), Line::from("Enter to save | Esc to cancel"),
      ]).block(Block::default().borders(Borders::ALL).title(" Edit "));
      frame.render_widget(p, area);
    }

    Dialog::CreatureForm { editing, name, ac, hp, cr, creature_type_idx, field_idx } => {
      let title = if editing.is_some() { " Edit Creature " } else { " New Creature " };
      let fields = [
        ("Name", name.as_str(), 0), ("AC", ac.as_str(), 1),
        ("Max HP", hp.as_str(), 2), ("CR", cr.as_str(), 3),
      ];
      let mut lines: Vec<Line> = fields.iter().map(|(label, val, idx)| {
        let cursor = if *field_idx == *idx { "▌" } else { "" };
        let style = if *field_idx == *idx { Style::default().fg(Color::Yellow) } else { Style::default() };
        Line::from(Span::styled(format!("{label}: {val}{cursor}"), style))
      }).collect();
      let type_style = if *field_idx == 4 { Style::default().fg(Color::Yellow) } else { Style::default() };
      lines.push(Line::from(Span::styled(
        format!("Type: {} (type any key to cycle)", crate::app::CREATURE_TYPES[*creature_type_idx]),
        type_style,
      )));
      lines.extend([Line::from(""), Line::from("Tab fields | Enter save | Esc cancel")]);
      let p = Paragraph::new(lines).block(Block::default().borders(Borders::ALL).title(title));
      frame.render_widget(p, area);
    }

    Dialog::StatBlockParser { text, preview } => {
      let line_count = text.lines().count();
      let mut lines = vec![
        Line::from(format!("Paste stat block text ({} lines):", line_count)),
        Line::from(Span::styled(
          if text.len() > 60 { format!("{}...", &text[..57]) } else { text.clone() },
          Style::default().fg(Color::DarkGray),
        )),
        Line::from(""),
      ];
      if let Some(prev) = preview {
        lines.push(Line::from(Span::styled(format!("Preview: {prev}"), Style::default().fg(Color::Green))));
      } else if !text.is_empty() {
        lines.push(Line::from(Span::styled("(parsing...)", Style::default().fg(Color::DarkGray))));
      }
      lines.extend([Line::from(""), Line::from("Enter = newline | F5 = import | Esc = cancel")]);
      let p = Paragraph::new(lines).block(Block::default().borders(Borders::ALL).title(" Stat Block Parser "));
      frame.render_widget(p, area);
    }

    Dialog::AutoRoll { formula, timing_idx, .. } => {
      let timing = if *timing_idx == 0 { "Turn Start" } else { "Turn End" };
      let p = Paragraph::new(vec![
        Line::from(format!("Formula: {formula}▌  (e.g. 1d20+5)")),
        Line::from(format!("Timing: {timing}  (Tab to switch)")),
        Line::from(""), Line::from("Enter save | Empty=clear | Esc cancel"),
      ]).block(Block::default().borders(Borders::ALL).title(" Auto-Roll "));
      frame.render_widget(p, area);
    }

    Dialog::None => {}
  }
}

/// Create a centered rectangle within the given area.
fn centered_rect(percent_x: u16, percent_y: u16, area: Rect) -> Rect {
  let [_, vert, _] = Layout::vertical([
    Constraint::Percentage((100 - percent_y) / 2),
    Constraint::Percentage(percent_y),
    Constraint::Percentage((100 - percent_y) / 2),
  ])
  .areas(area);
  let [_, horiz, _] = Layout::horizontal([
    Constraint::Percentage((100 - percent_x) / 2),
    Constraint::Percentage(percent_x),
    Constraint::Percentage((100 - percent_x) / 2),
  ])
  .areas(vert);
  horiz
}
