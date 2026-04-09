use clap::{Parser, Subcommand};
use dnd_encounter_manager_lib::{LogFormat, LogLevel};
use serde::Deserialize;
use std::path::PathBuf;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConfigError {
  #[error(
    "Failed to read configuration file at {path:?} during startup: {source}"
  )]
  FileRead {
    path: PathBuf,
    #[source]
    source: std::io::Error,
  },

  #[error("Failed to parse configuration file at {path:?}: {source}")]
  Parse {
    path: PathBuf,
    #[source]
    source: toml::de::Error,
  },

  #[error("Configuration validation failed: {0}")]
  Validation(String),
}

#[derive(Debug, Parser)]
#[command(author, version, about = "D&D Encounter Manager data tools", long_about = None)]
pub struct CliRaw {
  /// Log level (trace, debug, info, warn, error)
  #[arg(long, env = "LOG_LEVEL")]
  pub log_level: Option<String>,

  /// Log format (text, json)
  #[arg(long, env = "LOG_FORMAT")]
  pub log_format: Option<String>,

  /// Path to configuration file
  #[arg(short, long, env = "CONFIG_FILE")]
  pub config: Option<PathBuf>,

  /// Path to the data directory
  #[arg(long, env = "DATA_DIR", default_value = "data")]
  pub data_dir: PathBuf,

  #[command(subcommand)]
  pub command: CommandRaw,
}

#[derive(Debug, Subcommand)]
pub enum CommandRaw {
  /// Seed the data directory from a base creature database file
  Seed {
    /// Path to the source creature database JSON
    #[arg(
      long,
      default_value = "data/seed/creature-database.json"
    )]
    source: PathBuf,
  },
  /// Export the creature database to a JSON file
  Export {
    /// Output file path
    file: PathBuf,
  },
  /// Import a creature database from a JSON file
  Import {
    /// Input file path
    file: PathBuf,
  },
  /// Validate JSON files in the data directory
  Validate,
}

#[derive(Debug, Deserialize, Default)]
pub struct ConfigFileRaw {
  pub log_level: Option<String>,
  pub log_format: Option<String>,
}

impl ConfigFileRaw {
  pub fn from_file(path: &PathBuf) -> Result<Self, ConfigError> {
    let contents = std::fs::read_to_string(path).map_err(|source| {
      ConfigError::FileRead {
        path: path.clone(),
        source,
      }
    })?;

    toml::from_str(&contents).map_err(|source| ConfigError::Parse {
      path: path.clone(),
      source,
    })
  }
}

#[derive(Debug)]
pub enum Command {
  Seed { source: PathBuf },
  Export { file: PathBuf },
  Import { file: PathBuf },
  Validate,
}

#[derive(Debug)]
pub struct Config {
  pub log_level: LogLevel,
  pub log_format: LogFormat,
  pub data_dir: PathBuf,
  pub command: Command,
}

impl Config {
  pub fn from_cli_and_file(cli: CliRaw) -> Result<Self, ConfigError> {
    let config_file = if let Some(config_path) = &cli.config {
      ConfigFileRaw::from_file(config_path)?
    } else {
      let default_config_path = PathBuf::from("config.toml");
      if default_config_path.exists() {
        ConfigFileRaw::from_file(&default_config_path)?
      } else {
        ConfigFileRaw::default()
      }
    };

    let log_level_str = cli
      .log_level
      .or(config_file.log_level)
      .unwrap_or_else(|| "info".to_string());
    let log_level = log_level_str
      .parse::<LogLevel>()
      .map_err(|e| ConfigError::Validation(e.to_string()))?;

    let log_format_str = cli
      .log_format
      .or(config_file.log_format)
      .unwrap_or_else(|| "text".to_string());
    let log_format = log_format_str
      .parse::<LogFormat>()
      .map_err(|e| ConfigError::Validation(e.to_string()))?;

    let command = match cli.command {
      CommandRaw::Seed { source } => Command::Seed { source },
      CommandRaw::Export { file } => Command::Export { file },
      CommandRaw::Import { file } => Command::Import { file },
      CommandRaw::Validate => Command::Validate,
    };

    Ok(Config {
      log_level,
      log_format,
      data_dir: cli.data_dir,
      command,
    })
  }
}
