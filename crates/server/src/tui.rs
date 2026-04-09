use crossterm::{
  execute,
  terminal::{
    disable_raw_mode, enable_raw_mode, EnterAlternateScreen,
    LeaveAlternateScreen,
  },
};
use ratatui::backend::CrosstermBackend;
use ratatui::Terminal;
use std::io::{self, Stdout};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum TuiError {
  #[error("Failed to set up terminal for TUI: {0}")]
  Setup(#[source] io::Error),

  #[error("Failed to restore terminal after TUI exit: {0}")]
  Restore(#[source] io::Error),

  #[error("Terminal draw error: {0}")]
  Draw(#[source] io::Error),
}

pub type Tui = Terminal<CrosstermBackend<Stdout>>;

/// Set up the terminal for TUI rendering: raw mode, alternate screen,
/// and a panic hook that restores the terminal before printing the panic.
pub fn setup() -> Result<Tui, TuiError> {
  // Install a panic hook that restores the terminal before printing.
  let original_hook = std::panic::take_hook();
  std::panic::set_hook(Box::new(move |panic_info| {
    let _ = disable_raw_mode();
    let _ = execute!(io::stdout(), LeaveAlternateScreen);
    original_hook(panic_info);
  }));

  enable_raw_mode().map_err(TuiError::Setup)?;
  let mut stdout = io::stdout();
  execute!(stdout, EnterAlternateScreen).map_err(TuiError::Setup)?;
  let backend = CrosstermBackend::new(stdout);
  Terminal::new(backend).map_err(TuiError::Setup)
}

/// Restore the terminal to its original state.
pub fn restore(terminal: &mut Tui) -> Result<(), TuiError> {
  disable_raw_mode().map_err(TuiError::Restore)?;
  execute!(terminal.backend_mut(), LeaveAlternateScreen)
    .map_err(TuiError::Restore)?;
  terminal.show_cursor().map_err(TuiError::Restore)?;
  Ok(())
}
