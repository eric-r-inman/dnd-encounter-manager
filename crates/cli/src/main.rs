//! dnd-encounter-manager-cli — Data management tools
//!
//! Commands for managing creature databases, importing/exporting data,
//! and validating JSON files. Does not run an event loop — exits after
//! completing the requested task.

mod config;
mod logging;

use clap::Parser;
use config::{CliRaw, Config, ConfigError};
use dnd_encounter_manager_lib::creature::CreatureDatabase;
use logging::init_logging;
use std::path::PathBuf;
use thiserror::Error;

#[derive(Debug, Error)]
enum ApplicationError {
  #[error("Failed to load configuration during startup: {0}")]
  ConfigurationLoad(#[from] ConfigError),

  #[error("Failed to read file at {path}: {source}")]
  FileRead {
    path: PathBuf,
    #[source]
    source: std::io::Error,
  },

  #[error("Failed to write file at {path}: {source}")]
  FileWrite {
    path: PathBuf,
    #[source]
    source: std::io::Error,
  },

  #[error("Failed to parse JSON from {path}: {source}")]
  JsonParse {
    path: PathBuf,
    #[source]
    source: serde_json::Error,
  },
}

fn main() -> Result<(), ApplicationError> {
  let cli = CliRaw::parse();

  let config = Config::from_cli_and_file(cli).map_err(|e| {
    eprintln!("Configuration error: {}", e);
    ApplicationError::ConfigurationLoad(e)
  })?;

  init_logging(config.log_level, config.log_format);

  match config.command {
    config::Command::Seed { source } => {
      let dest = config.data_dir.join("creatures.json");

      if dest.exists() {
        println!("creatures.json already exists at {}", dest.display());
        return Ok(());
      }

      std::fs::create_dir_all(&config.data_dir).map_err(|source| {
        ApplicationError::FileWrite {
          path: config.data_dir.clone(),
          source,
        }
      })?;

      std::fs::copy(&source, &dest).map_err(|e| {
        ApplicationError::FileRead {
          path: source.clone(),
          source: e,
        }
      })?;

      println!("Seeded {} from {}", dest.display(), source.display());
      Ok(())
    }

    config::Command::Export { file } => {
      let src = config.data_dir.join("creatures.json");
      let data = std::fs::read_to_string(&src).map_err(|source| {
        ApplicationError::FileRead {
          path: src.clone(),
          source,
        }
      })?;

      let db: CreatureDatabase = serde_json::from_str(&data).map_err(
        |source| ApplicationError::JsonParse { path: src, source },
      )?;

      std::fs::write(&file, serde_json::to_string_pretty(&db).unwrap())
        .map_err(|source| ApplicationError::FileWrite {
          path: file.clone(),
          source,
        })?;

      println!(
        "Exported {} creatures to {}",
        db.creatures.len(),
        file.display()
      );
      Ok(())
    }

    config::Command::Import { file } => {
      let data = std::fs::read_to_string(&file).map_err(|source| {
        ApplicationError::FileRead {
          path: file.clone(),
          source,
        }
      })?;

      let db: CreatureDatabase = serde_json::from_str(&data).map_err(
        |source| ApplicationError::JsonParse {
          path: file.clone(),
          source,
        },
      )?;

      std::fs::create_dir_all(&config.data_dir).map_err(|source| {
        ApplicationError::FileWrite {
          path: config.data_dir.clone(),
          source,
        }
      })?;

      let dest = config.data_dir.join("creatures.json");
      std::fs::write(&dest, serde_json::to_string_pretty(&db).unwrap())
        .map_err(|source| ApplicationError::FileWrite {
          path: dest.clone(),
          source,
        })?;

      println!(
        "Imported {} creatures to {}",
        db.creatures.len(),
        dest.display()
      );
      Ok(())
    }

    config::Command::Validate => {
      let creatures_path = config.data_dir.join("creatures.json");

      if !creatures_path.exists() {
        println!(
          "No creatures.json found at {}",
          creatures_path.display()
        );
        return Ok(());
      }

      let data = std::fs::read_to_string(&creatures_path).map_err(
        |source| ApplicationError::FileRead {
          path: creatures_path.clone(),
          source,
        },
      )?;

      let db: CreatureDatabase = serde_json::from_str(&data).map_err(
        |source| ApplicationError::JsonParse {
          path: creatures_path,
          source,
        },
      )?;

      println!("Valid creature database:");
      println!("  Creatures: {}", db.creatures.len());
      println!("  Version: {}", db.metadata.version);
      println!("  Last updated: {}", db.metadata.last_updated);

      let mut issues = 0;
      for creature in &db.creatures {
        if creature.name.is_empty() {
          println!("  Warning: creature {} has empty name", creature.id);
          issues += 1;
        }
        if creature.max_hp == 0 {
          println!("  Warning: {} has 0 max HP", creature.name);
          issues += 1;
        }
      }

      if issues == 0 {
        println!("  No issues found.");
      } else {
        println!("  {} issue(s) found.", issues);
      }

      Ok(())
    }
  }
}
