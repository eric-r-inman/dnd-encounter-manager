use serde::de::DeserializeOwned;
use serde::Serialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use thiserror::Error;
use tokio::sync::RwLock;
use tracing::info;

#[derive(Debug, Error)]
pub enum StoreError {
  #[error("Failed to read {collection} from {path}: {source}")]
  Read {
    collection: String,
    path: PathBuf,
    #[source]
    source: std::io::Error,
  },

  #[error("Failed to write {collection} to {path}: {source}")]
  Write {
    collection: String,
    path: PathBuf,
    #[source]
    source: std::io::Error,
  },

  #[error("Failed to parse {collection} JSON from {path}: {source}")]
  Parse {
    collection: String,
    path: PathBuf,
    #[source]
    source: serde_json::Error,
  },

  #[error("Failed to serialize {collection}: {source}")]
  Serialize {
    collection: String,
    #[source]
    source: serde_json::Error,
  },

  #[error("Failed to create data directory at {path}: {source}")]
  CreateDir {
    path: PathBuf,
    #[source]
    source: std::io::Error,
  },
}

pub const COLLECTIONS: &[&str] = &[
  "creatures",
  "encounters",
  "preferences",
  "recent-effects",
  "templates",
  "state",
  "combatant-instances",
];

pub struct JsonStore {
  data_dir: PathBuf,
  locks: HashMap<String, RwLock<()>>,
}

impl JsonStore {
  /// Create a new store rooted at `data_dir`. Creates the directory if needed.
  pub fn new(data_dir: PathBuf) -> Result<Self, StoreError> {
    std::fs::create_dir_all(&data_dir).map_err(|source| {
      StoreError::CreateDir {
        path: data_dir.clone(),
        source,
      }
    })?;

    let mut locks = HashMap::new();
    for &name in COLLECTIONS {
      locks.insert(name.to_string(), RwLock::new(()));
    }

    Ok(Self { data_dir, locks })
  }

  fn file_path(&self, collection: &str) -> PathBuf {
    self.data_dir.join(format!("{collection}.json"))
  }

  /// Read and deserialize a collection. Returns the default `T` value if the
  /// file doesn't exist.
  pub async fn read_collection<T: DeserializeOwned + Default>(
    &self,
    collection: &str,
  ) -> Result<T, StoreError> {
    let lock = self.locks.get(collection).expect("unknown collection");
    let _guard = lock.read().await;
    let path = self.file_path(collection);

    if !path.exists() {
      return Ok(T::default());
    }

    let data =
      tokio::fs::read_to_string(&path)
        .await
        .map_err(|source| StoreError::Read {
          collection: collection.to_string(),
          path: path.clone(),
          source,
        })?;

    serde_json::from_str(&data).map_err(|source| StoreError::Parse {
      collection: collection.to_string(),
      path,
      source,
    })
  }

  /// Atomically write a collection to disk (write to temp, then rename).
  pub async fn write_collection<T: Serialize>(
    &self,
    collection: &str,
    data: &T,
  ) -> Result<(), StoreError> {
    let lock = self.locks.get(collection).expect("unknown collection");
    let _guard = lock.write().await;
    let path = self.file_path(collection);
    let tmp_path = self.data_dir.join(format!("{collection}.json.tmp"));

    let json = serde_json::to_string_pretty(data).map_err(|source| {
      StoreError::Serialize {
        collection: collection.to_string(),
        source,
      }
    })?;

    tokio::fs::write(&tmp_path, &json)
      .await
      .map_err(|source| StoreError::Write {
        collection: collection.to_string(),
        path: tmp_path.clone(),
        source,
      })?;

    tokio::fs::rename(&tmp_path, &path)
      .await
      .map_err(|source| StoreError::Write {
        collection: collection.to_string(),
        path,
        source,
      })?;

    Ok(())
  }

  /// Seed a collection from a file if the collection does not yet exist.
  pub async fn seed_if_empty(
    &self,
    collection: &str,
    seed_path: &Path,
  ) -> Result<(), StoreError> {
    let path = self.file_path(collection);
    if path.exists() {
      return Ok(());
    }

    let data = tokio::fs::read_to_string(seed_path).await.map_err(
      |source| StoreError::Read {
        collection: collection.to_string(),
        path: seed_path.to_path_buf(),
        source,
      },
    )?;

    // Validate it's valid JSON
    let _: serde_json::Value =
      serde_json::from_str(&data).map_err(|source| StoreError::Parse {
        collection: collection.to_string(),
        path: seed_path.to_path_buf(),
        source,
      })?;

    tokio::fs::write(&path, &data)
      .await
      .map_err(|source| StoreError::Write {
        collection: collection.to_string(),
        path,
        source,
      })?;

    info!(collection, seed = %seed_path.display(), "Seeded collection from file");
    Ok(())
  }

  /// Get the file size of a collection in bytes (0 if not present).
  pub async fn collection_size(
    &self,
    collection: &str,
  ) -> Result<u64, StoreError> {
    let path = self.file_path(collection);
    match tokio::fs::metadata(&path).await {
      Ok(meta) => Ok(meta.len()),
      Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(0),
      Err(source) => Err(StoreError::Read {
        collection: collection.to_string(),
        path,
        source,
      }),
    }
  }

  /// Delete a collection file.
  pub async fn delete_collection(
    &self,
    collection: &str,
  ) -> Result<(), StoreError> {
    let lock = self.locks.get(collection).expect("unknown collection");
    let _guard = lock.write().await;
    let path = self.file_path(collection);

    match tokio::fs::remove_file(&path).await {
      Ok(()) => Ok(()),
      Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
      Err(source) => Err(StoreError::Write {
        collection: collection.to_string(),
        path,
        source,
      }),
    }
  }
}
