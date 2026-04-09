use crate::app::App;
use ratatui::layout::{Constraint, Layout, Rect};
use ratatui::style::{Color, Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, List, ListItem, Paragraph};
use ratatui::Frame;

pub fn render(frame: &mut Frame, app: &App, area: Rect) {
  let [search_area, body] =
    Layout::vertical([Constraint::Length(3), Constraint::Min(1)]).areas(area);

  // Search bar
  let search = Paragraph::new(format!("Search: {}▌", app.creature_search)).block(
    Block::default().borders(Borders::ALL).title(" Compendium "),
  );
  frame.render_widget(search, search_area);

  let [left, right] =
    Layout::horizontal([Constraint::Percentage(35), Constraint::Percentage(65)])
      .areas(body);

  render_creature_list(frame, app, left);
  render_stat_block(frame, app, right);
}

fn render_creature_list(frame: &mut Frame, app: &App, area: Rect) {
  let filtered = app.filtered_creatures();

  let items: Vec<ListItem> = filtered
    .iter()
    .enumerate()
    .map(|(i, (_, creature))| {
      let marker = if i == app.creature_selected { "► " } else { "  " };
      let style = if i == app.creature_selected {
        Style::default().add_modifier(Modifier::REVERSED)
      } else {
        Style::default()
      };
      let type_color = match creature.creature_type {
        dnd_encounter_manager_lib::types::CreatureType::Player => Color::Green,
        dnd_encounter_manager_lib::types::CreatureType::Enemy => Color::Red,
        dnd_encounter_manager_lib::types::CreatureType::Npc => Color::Blue,
        dnd_encounter_manager_lib::types::CreatureType::Placeholder => {
          Color::DarkGray
        }
      };

      ListItem::new(Line::from(vec![
        Span::raw(marker),
        Span::raw(&creature.name),
        Span::raw("  "),
        Span::styled(
          format!("CR {}", creature.cr),
          Style::default().fg(type_color),
        ),
      ]))
      .style(style)
    })
    .collect();

  let count = filtered.len();
  let list = List::new(items).block(
    Block::default()
      .borders(Borders::ALL)
      .title(format!(" Creatures ({count}) ")),
  );
  frame.render_widget(list, area);
}

fn render_stat_block(frame: &mut Frame, app: &App, area: Rect) {
  let filtered = app.filtered_creatures();
  let creature = match filtered.get(app.creature_selected) {
    Some((_, c)) => *c,
    None => {
      frame.render_widget(
        Paragraph::new("No creature selected")
          .block(Block::default().borders(Borders::ALL).title(" Stat Block ")),
        area,
      );
      return;
    }
  };

  let mut lines = vec![
    Line::from(Span::styled(
      &creature.name,
      Style::default().add_modifier(Modifier::BOLD).fg(Color::Yellow),
    )),
  ];

  if let Some(sb) = &creature.stat_block {
    if let Some(ft) = &sb.full_type {
      lines.push(Line::from(Span::styled(
        ft.as_str(),
        Style::default().add_modifier(Modifier::ITALIC),
      )));
    }
    lines.push(Line::from(""));

    // AC and HP
    lines.push(Line::from(format!(
      "AC {}{}  HP {} {}",
      creature.ac,
      sb.armor_class
        .as_ref()
        .and_then(|a| a.armor_type.as_ref())
        .map(|t| format!(" ({t})"))
        .unwrap_or_default(),
      creature.max_hp,
      sb.hit_points
        .as_ref()
        .and_then(|h| h.formula.as_ref())
        .map(|f| format!("({f})"))
        .unwrap_or_default(),
    )));

    // Speed
    if let Some(speed) = &sb.speed {
      let mut parts = Vec::new();
      if let Some(w) = speed.walk {
        parts.push(format!("{w} ft."));
      }
      if let Some(f) = speed.fly {
        parts.push(format!("fly {f} ft."));
      }
      if let Some(s) = speed.swim {
        parts.push(format!("swim {s} ft."));
      }
      if let Some(c) = speed.climb {
        parts.push(format!("climb {c} ft."));
      }
      if let Some(b) = speed.burrow {
        parts.push(format!("burrow {b} ft."));
      }
      if !parts.is_empty() {
        lines.push(Line::from(format!("Speed {}", parts.join(", "))));
      }
    }

    // Abilities
    if let Some(abilities) = &sb.abilities {
      lines.push(Line::from(""));
      lines.push(Line::from(vec![
        Span::styled("STR ", Style::default().fg(Color::Red)),
        Span::raw(format!("{:>2}({:+}) ", abilities.str.score, abilities.str.modifier)),
        Span::styled("DEX ", Style::default().fg(Color::Green)),
        Span::raw(format!("{:>2}({:+}) ", abilities.dex.score, abilities.dex.modifier)),
        Span::styled("CON ", Style::default().fg(Color::Yellow)),
        Span::raw(format!("{:>2}({:+})", abilities.con.score, abilities.con.modifier)),
      ]));
      lines.push(Line::from(vec![
        Span::styled("INT ", Style::default().fg(Color::Blue)),
        Span::raw(format!("{:>2}({:+}) ", abilities.int.score, abilities.int.modifier)),
        Span::styled("WIS ", Style::default().fg(Color::Magenta)),
        Span::raw(format!("{:>2}({:+}) ", abilities.wis.score, abilities.wis.modifier)),
        Span::styled("CHA ", Style::default().fg(Color::Cyan)),
        Span::raw(format!("{:>2}({:+})", abilities.cha.score, abilities.cha.modifier)),
      ]));
    }

    // Senses
    if let Some(senses) = &sb.senses {
      let mut parts = Vec::new();
      if let Some(d) = senses.darkvision {
        parts.push(format!("Darkvision {d} ft."));
      }
      if let Some(b) = senses.blindsight {
        parts.push(format!("Blindsight {b} ft."));
      }
      if let Some(t) = senses.truesight {
        parts.push(format!("Truesight {t} ft."));
      }
      if let Some(pp) = senses.passive_perception {
        parts.push(format!("Passive Perception {pp}"));
      }
      if !parts.is_empty() {
        lines.push(Line::from(""));
        lines.push(Line::from(format!("Senses: {}", parts.join(", "))));
      }
    }

    // CR
    if let Some(cr) = &sb.challenge_rating {
      lines.push(Line::from(format!(
        "CR {} ({} XP)",
        cr.cr,
        cr.xp.unwrap_or(0)
      )));
    }

    // Traits
    if !sb.traits.is_empty() {
      lines.push(Line::from(""));
      lines.push(Line::from(Span::styled(
        "Traits",
        Style::default().add_modifier(Modifier::BOLD),
      )));
      for t in &sb.traits {
        lines.push(Line::from(vec![
          Span::styled(
            format!("{}. ", t.name),
            Style::default().add_modifier(Modifier::BOLD),
          ),
          Span::raw(&t.description),
        ]));
      }
    }

    // Actions
    if !sb.actions.is_empty() {
      lines.push(Line::from(""));
      lines.push(Line::from(Span::styled(
        "Actions",
        Style::default().add_modifier(Modifier::BOLD),
      )));
      for a in &sb.actions {
        lines.push(Line::from(vec![
          Span::styled(
            format!("{}. ", a.name),
            Style::default().add_modifier(Modifier::BOLD),
          ),
          Span::raw(&a.description),
        ]));
      }
    }
  } else {
    lines.push(Line::from(""));
    lines.push(Line::from(format!(
      "AC {}  HP {}  CR {}",
      creature.ac, creature.max_hp, creature.cr
    )));
  }

  let p = Paragraph::new(lines)
    .block(Block::default().borders(Borders::ALL).title(" Stat Block "));
  frame.render_widget(p, area);
}
