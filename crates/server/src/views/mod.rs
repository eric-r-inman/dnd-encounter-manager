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
        "[S]tart [N]ext [R]eset [D]amage [H]eal [T]emp [C]ond [E]ffect [A]dd [X]remove [Q]uit"
          .to_string()
      }
      View::Compendium => {
        "Type to search | Up/Down to browse | [X]delete | [Esc]clear | [Q]uit"
          .to_string()
      }
      View::Dice => {
        "Type dice notation (e.g. 2d6+3) and press Enter | [Q]uit"
          .to_string()
      }
      View::Encounters => {
        "Up/Down to browse | [Q]uit".to_string()
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
    Dialog::HpModification {
      combatant_idx,
      amount,
      mode,
    } => {
      let name = app
        .combatants
        .get(*combatant_idx)
        .map(|c| c.name.as_str())
        .unwrap_or("?");
      let content = vec![
        Line::from(format!("Target: {name}")),
        Line::from(""),
        Line::from(vec![
          Span::raw("Mode: "),
          Span::styled(
            mode.label(),
            Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD),
          ),
          Span::raw("  (Tab to change)"),
        ]),
        Line::from(""),
        Line::from(format!("Amount: {amount}▌")),
        Line::from(""),
        Line::from("Enter to apply | Esc to cancel"),
      ];
      let p = Paragraph::new(content).block(
        Block::default()
          .borders(Borders::ALL)
          .title(format!(" {} ", mode.label())),
      );
      frame.render_widget(p, area);
    }

    Dialog::ConditionPicker {
      selected,
      duration,
      ..
    } => {
      let conditions: Vec<Line> = crate::input::CONDITIONS
        .iter()
        .enumerate()
        .map(|(i, name)| {
          let marker = if i == *selected { "► " } else { "  " };
          let style = if i == *selected {
            Style::default().fg(Color::Yellow)
          } else {
            Style::default()
          };
          Line::from(Span::styled(format!("{marker}{name}"), style))
        })
        .collect();
      let mut lines = conditions;
      lines.push(Line::from(""));
      lines
        .push(Line::from(format!("Duration (turns): {duration}▌")));
      lines.push(Line::from("Enter to apply | Esc to cancel"));

      let p = Paragraph::new(lines).block(
        Block::default()
          .borders(Borders::ALL)
          .title(" Add Condition "),
      );
      frame.render_widget(p, area);
    }

    Dialog::EffectEntry {
      name,
      duration,
      note,
      field_idx,
      ..
    } => {
      let fields = [
        ("Name", name.as_str(), 0),
        ("Duration", duration.as_str(), 1),
        ("Note", note.as_str(), 2),
      ];
      let lines: Vec<Line> = fields
        .iter()
        .map(|(label, val, idx)| {
          let cursor = if *field_idx == *idx { "▌" } else { "" };
          let style = if *field_idx == *idx {
            Style::default().fg(Color::Yellow)
          } else {
            Style::default()
          };
          Line::from(Span::styled(
            format!("{label}: {val}{cursor}"),
            style,
          ))
        })
        .chain(std::iter::once(Line::from("")))
        .chain(std::iter::once(Line::from(
          "Tab to switch fields | Enter to apply",
        )))
        .collect();
      let p = Paragraph::new(lines).block(
        Block::default()
          .borders(Borders::ALL)
          .title(" Add Effect "),
      );
      frame.render_widget(p, area);
    }

    Dialog::AddCombatant {
      search,
      selected_creature,
      initiative,
      name_note,
      field_idx,
    } => {
      let mut lines = vec![
        Line::from(format!(
          "{}Search: {search}{}",
          if *field_idx == 0 { "► " } else { "  " },
          if *field_idx == 0 { "▌" } else { "" },
        )),
      ];

      // Show matching creatures
      let query = search.to_lowercase();
      let matching: Vec<_> = app
        .creature_db
        .creatures
        .iter()
        .filter(|c| query.is_empty() || c.name.to_lowercase().contains(&query))
        .take(8)
        .enumerate()
        .collect();
      for (i, creature) in &matching {
        let marker = if *i == *selected_creature { "  ► " } else { "    " };
        let style = if *i == *selected_creature {
          Style::default().fg(Color::Cyan)
        } else {
          Style::default()
        };
        lines.push(Line::from(Span::styled(
          format!("{marker}{} (CR {})", creature.name, creature.cr),
          style,
        )));
      }

      lines.push(Line::from(""));
      lines.push(Line::from(format!(
        "{}Initiative: {initiative}{}",
        if *field_idx == 1 { "► " } else { "  " },
        if *field_idx == 1 { "▌" } else { "" },
      )));
      lines.push(Line::from(format!(
        "{}Note: {name_note}{}",
        if *field_idx == 2 { "► " } else { "  " },
        if *field_idx == 2 { "▌" } else { "" },
      )));
      lines.push(Line::from(""));
      lines.push(Line::from("Tab to switch | Enter to add | Esc to cancel"));

      let p = Paragraph::new(lines).block(
        Block::default()
          .borders(Borders::ALL)
          .title(" Add Combatant "),
      );
      frame.render_widget(p, area);
    }

    Dialog::ConfirmDelete { creature_idx } => {
      let name = app
        .creature_db
        .creatures
        .get(*creature_idx)
        .map(|c| c.name.as_str())
        .unwrap_or("?");
      let p = Paragraph::new(vec![
        Line::from(format!("Delete \"{name}\"?")),
        Line::from(""),
        Line::from("[Y]es  [N]o"),
      ])
      .block(
        Block::default()
          .borders(Borders::ALL)
          .title(" Confirm Delete "),
      );
      frame.render_widget(p, area);
    }

    Dialog::DiceRoll { notation } => {
      let p = Paragraph::new(vec![
        Line::from(format!("Notation: {notation}▌")),
        Line::from(""),
        Line::from("Enter to roll | Esc to cancel"),
      ])
      .block(
        Block::default().borders(Borders::ALL).title(" Roll Dice "),
      );
      frame.render_widget(p, area);
    }

    Dialog::QuickInitiative => {
      let p = Paragraph::new(vec![
        Line::from("[R]oll initiative for all"),
        Line::from("[S]ort by current initiative"),
        Line::from(""),
        Line::from("Esc to cancel"),
      ])
      .block(
        Block::default()
          .borders(Borders::ALL)
          .title(" Quick Initiative "),
      );
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
