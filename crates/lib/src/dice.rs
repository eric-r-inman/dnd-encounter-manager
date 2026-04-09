use rand::Rng;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum DiceError {
  #[error("Invalid dice notation '{notation}': {reason}")]
  InvalidNotation {
    notation: String,
    reason: &'static str,
  },
}

/// A single dice expression (e.g. 2d6+3).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DiceExpression {
  pub count: u32,
  pub sides: u32,
  pub modifier: i32,
}

impl std::fmt::Display for DiceExpression {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    write!(f, "{}d{}", self.count, self.sides)?;
    match self.modifier.cmp(&0) {
      std::cmp::Ordering::Greater => write!(f, "+{}", self.modifier),
      std::cmp::Ordering::Less => write!(f, "{}", self.modifier),
      std::cmp::Ordering::Equal => Ok(()),
    }
  }
}

/// Result of rolling dice.
#[derive(Debug, Clone)]
pub struct DiceResult {
  pub expression: DiceExpression,
  pub rolls: Vec<u32>,
  pub total: i32,
}

/// Parse dice notation like "2d6+3", "1d20-1", "d8".
pub fn parse(notation: &str) -> Result<DiceExpression, DiceError> {
  let s = notation.trim().to_lowercase();
  let err = |reason| DiceError::InvalidNotation {
    notation: notation.to_string(),
    reason,
  };

  // Find the 'd' separator
  let d_pos = s.find('d').ok_or_else(|| err("missing 'd'"))?;

  // Parse count (default 1)
  let count_str = &s[..d_pos];
  let count = if count_str.is_empty() {
    1
  } else {
    count_str.parse::<u32>().map_err(|_| err("invalid count"))?
  };

  // Find modifier (+/- after the sides)
  let after_d = &s[d_pos + 1..];
  let (sides_str, modifier) =
    if let Some(pos) = after_d.rfind('+') {
      let mod_str = &after_d[pos + 1..];
      let modifier =
        mod_str.parse::<i32>().map_err(|_| err("invalid modifier"))?;
      (&after_d[..pos], modifier)
    } else if let Some(pos) = after_d.rfind('-') {
      let mod_str = &after_d[pos + 1..];
      let modifier =
        mod_str.parse::<i32>().map_err(|_| err("invalid modifier"))?;
      (&after_d[..pos], -modifier)
    } else {
      (after_d, 0)
    };

  let sides =
    sides_str.parse::<u32>().map_err(|_| err("invalid sides"))?;

  if count == 0 {
    return Err(err("count must be at least 1"));
  }
  if sides == 0 {
    return Err(err("sides must be at least 1"));
  }

  Ok(DiceExpression {
    count,
    sides,
    modifier,
  })
}

/// Roll dice using the given expression.
pub fn roll(expr: &DiceExpression) -> DiceResult {
  let mut rng = rand::thread_rng();
  let rolls: Vec<u32> =
    (0..expr.count).map(|_| rng.gen_range(1..=expr.sides)).collect();
  let sum: u32 = rolls.iter().sum();
  DiceResult {
    expression: expr.clone(),
    rolls,
    total: sum as i32 + expr.modifier,
  }
}

/// Roll with advantage (roll twice, keep higher).
pub fn roll_advantage(expr: &DiceExpression) -> DiceResult {
  let a = roll(expr);
  let b = roll(expr);
  if a.total >= b.total { a } else { b }
}

/// Roll with disadvantage (roll twice, keep lower).
pub fn roll_disadvantage(expr: &DiceExpression) -> DiceResult {
  let a = roll(expr);
  let b = roll(expr);
  if a.total <= b.total { a } else { b }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_parse_basic() {
    let expr = parse("2d6+3").unwrap();
    assert_eq!(expr.count, 2);
    assert_eq!(expr.sides, 6);
    assert_eq!(expr.modifier, 3);
  }

  #[test]
  fn test_parse_no_modifier() {
    let expr = parse("1d20").unwrap();
    assert_eq!(expr.count, 1);
    assert_eq!(expr.sides, 20);
    assert_eq!(expr.modifier, 0);
  }

  #[test]
  fn test_parse_negative_modifier() {
    let expr = parse("1d8-2").unwrap();
    assert_eq!(expr.modifier, -2);
  }

  #[test]
  fn test_parse_implicit_count() {
    let expr = parse("d6").unwrap();
    assert_eq!(expr.count, 1);
    assert_eq!(expr.sides, 6);
  }

  #[test]
  fn test_parse_invalid() {
    assert!(parse("abc").is_err());
    assert!(parse("0d6").is_err());
    assert!(parse("1d0").is_err());
  }

  #[test]
  fn test_roll_bounds() {
    let expr = parse("1d6").unwrap();
    for _ in 0..100 {
      let result = roll(&expr);
      assert!(result.total >= 1 && result.total <= 6);
    }
  }

  #[test]
  fn test_roll_with_modifier() {
    let expr = parse("1d1+5").unwrap();
    let result = roll(&expr);
    // 1d1 always rolls 1, plus 5 = 6
    assert_eq!(result.total, 6);
  }

  #[test]
  fn test_display() {
    assert_eq!(parse("2d6+3").unwrap().to_string(), "2d6+3");
    assert_eq!(parse("1d20").unwrap().to_string(), "1d20");
    assert_eq!(parse("1d8-1").unwrap().to_string(), "1d8-1");
  }
}
