use std::{path::PathBuf, process::Command};

fn get_binary_path() -> PathBuf {
  let mut path =
    std::env::current_exe().expect("Failed to get current executable path");
  path.pop(); // remove test executable name
  path.pop(); // remove deps dir
  path.push("dnd-encounter-manager-cli");

  if !path.exists() {
    path.pop();
    path.pop();
    path.push("debug");
    path.push("dnd-encounter-manager-cli");
  }

  path
}

#[test]
fn test_help_flag() {
  let output = Command::new(get_binary_path())
    .arg("--help")
    .output()
    .expect("Failed to execute binary");

  assert!(output.status.success());
  let stdout = String::from_utf8_lossy(&output.stdout);
  assert!(
    stdout.contains("Usage:"),
    "Expected help text to contain 'Usage:', got: {stdout}"
  );
}

#[test]
fn test_version_flag() {
  let output = Command::new(get_binary_path())
    .arg("--version")
    .output()
    .expect("Failed to execute binary");

  assert!(output.status.success());
  let stdout = String::from_utf8_lossy(&output.stdout);
  assert!(
    stdout.contains("dnd-encounter-manager-cli"),
    "Expected version output, got: {stdout}"
  );
}

#[test]
fn test_validate_empty_data_dir() {
  let tmp = tempfile::tempdir().expect("temp dir");
  let output = Command::new(get_binary_path())
    .arg("--data-dir")
    .arg(tmp.path())
    .arg("validate")
    .output()
    .expect("Failed to execute binary");

  assert!(output.status.success());
  let stdout = String::from_utf8_lossy(&output.stdout);
  assert!(
    stdout.contains("No creatures.json found"),
    "Expected 'No creatures.json found', got: {stdout}"
  );
}

#[test]
fn test_validate_with_data() {
  let tmp = tempfile::tempdir().expect("temp dir");
  let db_json = r#"{
    "creatures": [{"id":"test","name":"Test","type":"enemy","ac":10,"maxHP":10,"cr":"0","hasFullStatBlock":false}],
    "metadata": {"version":"2.0.0","lastUpdated":"2025-01-01","totalCreatures":1,"schema":{"version":"2.0","description":"test"}}
  }"#;
  std::fs::write(tmp.path().join("creatures.json"), db_json)
    .expect("write test data");

  let output = Command::new(get_binary_path())
    .arg("--data-dir")
    .arg(tmp.path())
    .arg("validate")
    .output()
    .expect("Failed to execute binary");

  assert!(output.status.success());
  let stdout = String::from_utf8_lossy(&output.stdout);
  assert!(
    stdout.contains("Creatures: 1"),
    "Expected creature count, got: {stdout}"
  );
}
