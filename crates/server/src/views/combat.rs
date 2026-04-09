use crate::app::App;
use dnd_encounter_manager_lib::types::HealthState;
use ratatui::layout::{Constraint, Layout, Rect};
use ratatui::style::{Color, Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, List, ListItem, Paragraph};
use ratatui::Frame;

pub fn render(frame: &mut Frame, app: &App, area: Rect) {
  if app.combatants.is_empty() {
    let p = Paragraph::new(vec![
      Line::from(""),
      Line::from("  No combatants in encounter."),
      Line::from(""),
      Line::from("  Press [A] to add a combatant from the Compendium."),
    ])
    .block(Block::default().borders(Borders::ALL).title(" Combat "));
    frame.render_widget(p, area);
    return;
  }

  let [left, right] =
    Layout::horizontal([Constraint::Percentage(45), Constraint::Percentage(55)])
      .areas(area);

  render_initiative_list(frame, app, left);
  render_combatant_detail(frame, app, right);
}

fn render_initiative_list(frame: &mut Frame, app: &App, area: Rect) {
  let items: Vec<ListItem> = app
    .combatants
    .iter()
    .enumerate()
    .map(|(i, c)| {
      let marker = if c.is_active {
        "►"
      } else if app.batch_selected.contains(&i) {
        "■"
      } else {
        " "
      };

      let hp_color = match HealthState::from_hp(c.current_hp, c.max_hp) {
        HealthState::Healthy => Color::Green,
        HealthState::Wounded => Color::Yellow,
        HealthState::Bloodied => Color::Rgb(255, 165, 0),
        HealthState::Critical => Color::Red,
        HealthState::Unconscious => Color::DarkGray,
      };

      let dead = if c.is_dead() { "☠" } else { "" };

      let style = if i == app.combat_selected {
        Style::default().add_modifier(Modifier::REVERSED)
      } else {
        Style::default()
      };

      let line = Line::from(vec![
        Span::raw(format!("{marker} ")),
        Span::styled(
          format!("{:>2}  ", c.initiative),
          Style::default().fg(Color::Cyan),
        ),
        Span::raw(format!("{:<20}", c.name)),
        Span::styled(
          format!("♥ {}/{}", c.current_hp, c.max_hp),
          Style::default().fg(hp_color),
        ),
        Span::raw(if c.temp_hp > 0 {
          format!("+{}", c.temp_hp)
        } else {
          String::new()
        }),
        Span::raw(format!(" {dead}")),
      ]);

      ListItem::new(line).style(style)
    })
    .collect();

  let list = List::new(items)
    .block(Block::default().borders(Borders::ALL).title(" Initiative Order "));

  frame.render_widget(list, area);
}

fn render_combatant_detail(frame: &mut Frame, app: &App, area: Rect) {
  let combatant = match app.combatants.get(app.combat_selected) {
    Some(c) => c,
    None => {
      frame.render_widget(
        Paragraph::new("No combatant selected")
          .block(Block::default().borders(Borders::ALL).title(" Details ")),
        area,
      );
      return;
    }
  };

  let mut lines = vec![
    Line::from(Span::styled(
      &combatant.name,
      Style::default().add_modifier(Modifier::BOLD),
    )),
    Line::from(format!(
      "AC: {}  HP: {}/{}  Temp HP: {}",
      combatant.ac, combatant.current_hp, combatant.max_hp, combatant.temp_hp
    )),
    Line::from(format!(
      "Type: {}  Initiative: {}",
      combatant.creature_type, combatant.initiative
    )),
  ];

  if !combatant.name_note.is_empty() {
    lines.push(Line::from(format!("Note: {}", combatant.name_note)));
  }

  // Status flags
  let mut flags = Vec::new();
  if combatant.status.concentration {
    flags.push("Concentrating");
  }
  if combatant.status.hiding {
    flags.push("Hiding");
  }
  if combatant.status.surprised {
    flags.push("Surprised");
  }
  if combatant.status.flying {
    flags.push("Flying");
  }
  if !flags.is_empty() {
    lines.push(Line::from(format!("Status: {}", flags.join(", "))));
  }

  // Conditions
  if !combatant.conditions.is_empty() {
    lines.push(Line::from(""));
    lines.push(Line::from(Span::styled(
      "Conditions:",
      Style::default().add_modifier(Modifier::BOLD),
    )));
    for cond in &combatant.conditions {
      let dur = if cond.infinite {
        "∞".to_string()
      } else {
        cond.duration.map(|d| format!("{}t", d)).unwrap_or_default()
      };
      lines.push(Line::from(format!("  {} ({})", cond.name, dur)));
    }
  }

  // Effects
  if !combatant.effects.is_empty() {
    lines.push(Line::from(""));
    lines.push(Line::from(Span::styled(
      "Effects:",
      Style::default().add_modifier(Modifier::BOLD),
    )));
    for eff in &combatant.effects {
      let dur = if eff.infinite {
        "∞".to_string()
      } else {
        eff.duration.map(|d| format!("{}t", d)).unwrap_or_default()
      };
      let note = if eff.note.is_empty() {
        String::new()
      } else {
        format!(" - {}", eff.note)
      };
      lines.push(Line::from(format!(
        "  {} ({}){note}",
        eff.name, dur
      )));
    }
  }

  // Death saves
  if combatant.current_hp == 0 {
    lines.push(Line::from(""));
    let succ = combatant
      .death_saves
      .successes
      .iter()
      .map(|&s| if s { "●" } else { "○" })
      .collect::<Vec<_>>()
      .join(" ");
    let fail = combatant
      .death_saves
      .failures
      .iter()
      .map(|&f| if f { "☠" } else { "○" })
      .collect::<Vec<_>>()
      .join(" ");
    lines.push(Line::from(format!("Death Saves: {succ}  Failures: {fail}")));
  }

  let p = Paragraph::new(lines)
    .block(Block::default().borders(Borders::ALL).title(" Details "));
  frame.render_widget(p, area);
}
