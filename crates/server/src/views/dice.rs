use crate::app::App;
use ratatui::layout::{Constraint, Layout, Rect};
use ratatui::style::{Color, Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, List, ListItem, Paragraph};
use ratatui::Frame;

pub fn render(frame: &mut Frame, app: &App, area: Rect) {
  let [input_area, history_area] =
    Layout::vertical([Constraint::Length(5), Constraint::Min(1)]).areas(area);

  // Input section with roll mode indicator
  let mode_color = match app.roll_mode {
    crate::app::RollMode::Normal => Color::White,
    crate::app::RollMode::Advantage => Color::Green,
    crate::app::RollMode::Disadvantage => Color::Red,
  };
  let input = Paragraph::new(vec![
    Line::from(""),
    Line::from(vec![
      Span::raw("  Notation: "),
      Span::raw(format!("{}▌", app.dice_input)),
      Span::raw("    Mode: "),
      Span::styled(app.roll_mode.label(), Style::default().fg(mode_color).add_modifier(Modifier::BOLD)),
      Span::raw("  [!] to cycle"),
    ]),
    Line::from(""),
  ])
  .block(
    Block::default()
      .borders(Borders::ALL)
      .title(" Dice Roller "),
  );
  frame.render_widget(input, input_area);

  // History section
  let items: Vec<ListItem> = app
    .dice_history
    .iter()
    .enumerate()
    .map(|(i, result)| {
      let rolls = result
        .rolls
        .iter()
        .map(|r| r.to_string())
        .collect::<Vec<_>>()
        .join(", ");

      let style = if i == 0 {
        Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)
      } else {
        Style::default()
      };

      ListItem::new(Line::from(vec![
        Span::styled(format!("{}: ", result.expression), style),
        Span::raw(format!("[{rolls}]")),
        Span::raw(if result.expression.modifier != 0 {
          format!("{:+}", result.expression.modifier)
        } else {
          String::new()
        }),
        Span::styled(
          format!(" = {}", result.total),
          Style::default().fg(Color::Green).add_modifier(Modifier::BOLD),
        ),
      ]))
    })
    .collect();

  let list = List::new(items).block(
    Block::default()
      .borders(Borders::ALL)
      .title(format!(" Roll History ({}) ", app.dice_history.len())),
  );
  frame.render_widget(list, history_area);
}
