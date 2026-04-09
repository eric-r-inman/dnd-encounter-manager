use crate::app::App;
use ratatui::layout::Rect;
use ratatui::style::{Modifier, Style};
use ratatui::text::Line;
use ratatui::widgets::{Block, Borders, List, ListItem, Paragraph};
use ratatui::Frame;

pub fn render(frame: &mut Frame, app: &App, area: Rect) {
  if app.encounter_names.is_empty() {
    let p = Paragraph::new(vec![
      Line::from(""),
      Line::from("  No saved encounters."),
      Line::from(""),
      Line::from("  Go to Combat view and use encounters to save them here."),
    ])
    .block(
      Block::default()
        .borders(Borders::ALL)
        .title(" Saved Encounters "),
    );
    frame.render_widget(p, area);
    return;
  }

  let items: Vec<ListItem> = app
    .encounter_names
    .iter()
    .enumerate()
    .map(|(i, (id, name))| {
      let marker = if i == app.encounter_selected {
        "► "
      } else {
        "  "
      };
      let style = if i == app.encounter_selected {
        Style::default().add_modifier(Modifier::REVERSED)
      } else {
        Style::default()
      };
      ListItem::new(format!("{marker}{name}  ({id})")).style(style)
    })
    .collect();

  let list = List::new(items).block(
    Block::default()
      .borders(Borders::ALL)
      .title(format!(" Saved Encounters ({}) ", app.encounter_names.len())),
  );
  frame.render_widget(list, area);
}
