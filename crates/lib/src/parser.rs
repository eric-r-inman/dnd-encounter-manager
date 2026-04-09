/// Stat block text parser for D&D 5e creatures.
///
/// Handles D&D Beyond 2024 format (AC, HP, STR 26 +8 +8) and
/// traditional 5e format (Armor Class, Hit Points, STR\n15 (+2)).
use crate::creature::*;
use crate::types::CreatureType;
use std::collections::HashMap;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ParseError {
  #[error("Stat block is empty")]
  Empty,
}

/// Parse stat block text into a Creature.
pub fn parse_stat_block(text: &str) -> Result<Creature, ParseError> {
  let lines: Vec<&str> = text
    .lines()
    .map(|l| l.trim())
    .filter(|l| !l.is_empty())
    .collect();

  if lines.is_empty() {
    return Err(ParseError::Empty);
  }

  let name = lines[0].to_string();
  let id = generate_creature_id(&name);

  let mut creature = Creature {
    id,
    name,
    creature_type: CreatureType::Enemy,
    ac: 10,
    max_hp: 1,
    cr: "0".to_string(),
    size: None,
    race: None,
    subrace: None,
    alignment: None,
    description: None,
    source: Some("Custom Import".to_string()),
    has_full_stat_block: true,
    stat_block: Some(StatBlock {
      full_type: None,
      armor_class: None,
      hit_points: None,
      initiative: None,
      speed: None,
      abilities: None,
      saving_throws: None,
      skills: None,
      damage_resistances: Vec::new(),
      damage_immunities: Vec::new(),
      damage_vulnerabilities: Vec::new(),
      condition_immunities: Vec::new(),
      senses: None,
      languages: None,
      challenge_rating: None,
      traits: Vec::new(),
      actions: Vec::new(),
      reactions: Vec::new(),
      legendary_actions: None,
      lair_actions: None,
      regional_effects: None,
      spellcasting: None,
    }),
  };

  // Parse type/size/alignment (usually second line)
  if lines.len() > 1 {
    parse_type_line(lines[1], &mut creature);
  }

  let sb = creature.stat_block.as_mut().unwrap();

  let mut abilities: HashMap<&str, (u16, i16)> = HashMap::new();
  let mut current_section: Option<&str> = None;

  let mut i = 2;
  while i < lines.len() {
    let line = lines[i];

    // Skip headers
    if matches!(
      line.to_lowercase().as_str(),
      "mod" | "save" | "actions" | "traits" | "bonus actions" | "reactions"
    ) {
      if matches!(
        line.to_lowercase().as_str(),
        "actions" | "traits" | "reactions"
      ) {
        current_section = Some(line);
      }
      i += 1;
      continue;
    }

    // AC formats
    if let Some(val) = parse_ac(line) {
      creature.ac = val.0;
      sb.armor_class = Some(ArmorClass {
        value: val.0,
        armor_type: val.1,
      });
      i += 1;
      continue;
    }

    // HP formats
    if let Some(val) = parse_hp(line) {
      creature.max_hp = val.0;
      sb.hit_points = Some(HitPoints {
        average: val.0,
        formula: val.1,
      });
      i += 1;
      continue;
    }

    // Speed
    if line.to_lowercase().starts_with("speed ") {
      sb.speed = Some(parse_speed(&line[6..]));
      i += 1;
      continue;
    }

    // Single-line ability scores (2024 format: "STR 26 +8 +8")
    if let Some((ab, score, modifier)) = parse_ability_single_line(line) {
      abilities.insert(ab, (score, modifier));
      i += 1;
      continue;
    }

    // Multi-line ability scores (traditional: "STR\n15 (+2)")
    if is_ability_name(line) && i + 1 < lines.len() {
      if let Some((score, modifier)) =
        parse_ability_score_modifier(lines[i + 1])
      {
        abilities.insert(
          match line.to_uppercase().as_str() {
            "STR" => "str",
            "DEX" => "dex",
            "CON" => "con",
            "INT" => "int",
            "WIS" => "wis",
            "CHA" => "cha",
            _ => "str",
          },
          (score, modifier),
        );
        i += 2;
        continue;
      }
    }

    // Senses
    if line.to_lowercase().starts_with("senses ") {
      sb.senses = Some(parse_senses(&line[7..]));
      i += 1;
      continue;
    }

    // Languages
    if line.to_lowercase().starts_with("languages ") {
      sb.languages = Some(
        line[10..]
          .split(',')
          .map(|s| s.trim().to_string())
          .collect(),
      );
      i += 1;
      continue;
    }

    // Challenge Rating
    if line.to_lowercase().starts_with("challenge ")
      || line.to_lowercase().starts_with("cr ")
    {
      sb.challenge_rating = Some(parse_cr(line));
      creature.cr = sb
        .challenge_rating
        .as_ref()
        .map(|c| c.cr.clone())
        .unwrap_or_default();
      i += 1;
      continue;
    }

    // Proficiency Bonus line (skip)
    if line.to_lowercase().starts_with("proficiency bonus") {
      i += 1;
      continue;
    }

    // Section entries (Trait/Action format: "Name. Description")
    if let Some(dot_pos) = line.find(". ") {
      let entry_name = line[..dot_pos].trim().to_string();
      let entry_desc = line[dot_pos + 2..].trim().to_string();

      let entry = Trait {
        name: entry_name.clone(),
        description: entry_desc.clone(),
        usage: None,
      };

      match current_section.map(|s| s.to_lowercase()).as_deref() {
        Some("actions") => {
          let action_type = if entry_name.to_lowercase().contains("multiattack")
          {
            Some("multiattack".to_string())
          } else if entry_desc.to_lowercase().contains("melee") {
            Some("melee".to_string())
          } else if entry_desc.to_lowercase().contains("ranged") {
            Some("ranged".to_string())
          } else {
            Some("special".to_string())
          };
          sb.actions.push(Action {
            name: entry_name,
            action_type,
            description: entry_desc,
            attack_bonus: None,
            reach: None,
            range: None,
            damage: None,
            damage_type: None,
            additional_damage: None,
            additional_damage_type: None,
            save_type: None,
            save_dc: None,
            area: None,
            recharge: None,
            cost: None,
          });
        }
        Some("reactions") => {
          sb.reactions.push(Action {
            name: entry_name,
            action_type: Some("reaction".to_string()),
            description: entry_desc,
            attack_bonus: None,
            reach: None,
            range: None,
            damage: None,
            damage_type: None,
            additional_damage: None,
            additional_damage_type: None,
            save_type: None,
            save_dc: None,
            area: None,
            recharge: None,
            cost: None,
          });
        }
        _ => {
          // Default to traits
          sb.traits.push(entry);
          if current_section.is_none() {
            current_section = Some("traits");
          }
        }
      }
    }

    i += 1;
  }

  // Build abilities from collected data
  if !abilities.is_empty() {
    let get = |key: &str| -> AbilityPair {
      abilities
        .get(key)
        .map(|&(s, m)| AbilityPair {
          score: s,
          modifier: m,
        })
        .unwrap_or(AbilityPair {
          score: 10,
          modifier: 0,
        })
    };
    sb.abilities = Some(Abilities {
      str: get("str"),
      dex: get("dex"),
      con: get("con"),
      int: get("int"),
      wis: get("wis"),
      cha: get("cha"),
    });
  }

  Ok(creature)
}

fn parse_type_line(line: &str, creature: &mut Creature) {
  // Match "Small Aberration, Chaotic Evil" or similar
  let sizes = [
    "Tiny",
    "Small",
    "Medium",
    "Large",
    "Huge",
    "Gargantuan",
  ];
  for size in sizes {
    if line.starts_with(size) {
      creature.size = Some(size.to_string());
      let rest = line[size.len()..].trim_start();
      if let Some(comma) = rest.find(',') {
        creature.race = Some(rest[..comma].trim().to_string());
        creature.alignment =
          Some(rest[comma + 1..].trim().to_string());
      } else {
        creature.race = Some(rest.to_string());
      }
      if let Some(sb) = &mut creature.stat_block {
        sb.full_type = Some(line.to_string());
      }
      return;
    }
  }
}

fn parse_ac(line: &str) -> Option<(u16, Option<String>)> {
  let lower = line.to_lowercase();
  if lower.starts_with("ac ") {
    let num_str: String = line[3..].chars().take_while(|c| c.is_ascii_digit()).collect();
    let val = num_str.parse().ok()?;
    return Some((val, None));
  }
  if lower.starts_with("armor class ") {
    let rest = &line[12..];
    let num_str: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
    let val = num_str.parse().ok()?;
    let armor_type = if let (Some(open), Some(close)) =
      (rest.find('('), rest.find(')'))
    {
      Some(rest[open + 1..close].to_string())
    } else {
      None
    };
    return Some((val, armor_type));
  }
  None
}

fn parse_hp(line: &str) -> Option<(u32, Option<String>)> {
  let lower = line.to_lowercase();
  let (prefix_len, starts) = if lower.starts_with("hp ") {
    (3, true)
  } else if lower.starts_with("hit points ") {
    (11, true)
  } else {
    (0, false)
  };
  if !starts {
    return None;
  }
  let rest = &line[prefix_len..];
  let num_str: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
  let val = num_str.parse().ok()?;
  let formula = if let (Some(open), Some(close)) =
    (rest.find('('), rest.find(')'))
  {
    Some(rest[open + 1..close].to_string())
  } else {
    None
  };
  Some((val, formula))
}

fn parse_speed(text: &str) -> Speed {
  let mut speed = Speed {
    walk: None,
    burrow: None,
    climb: None,
    fly: None,
    swim: None,
    hover: None,
  };
  for part in text.split(',') {
    let part = part.trim().to_lowercase();
    if let Some(val) = extract_ft_number(&part) {
      if part.starts_with("fly") {
        speed.fly = Some(val);
      } else if part.starts_with("swim") {
        speed.swim = Some(val);
      } else if part.starts_with("climb") {
        speed.climb = Some(val);
      } else if part.starts_with("burrow") {
        speed.burrow = Some(val);
      } else {
        speed.walk = Some(val);
      }
      if part.contains("hover") {
        speed.hover = Some(true);
      }
    }
  }
  speed
}

fn extract_ft_number(text: &str) -> Option<u32> {
  let digits: String = text
    .chars()
    .filter(|c| c.is_ascii_digit())
    .collect();
  digits.parse().ok()
}

fn is_ability_name(line: &str) -> bool {
  matches!(
    line.to_uppercase().as_str(),
    "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA"
  )
}

fn parse_ability_single_line(line: &str) -> Option<(&str, u16, i16)> {
  let parts: Vec<&str> = line.split_whitespace().collect();
  if parts.len() >= 3 && is_ability_name(parts[0]) {
    let score: u16 = parts[1].parse().ok()?;
    let modifier: i16 = parts[2]
      .trim_start_matches('+')
      .parse()
      .ok()?;
    let ab = match parts[0].to_uppercase().as_str() {
      "STR" => "str",
      "DEX" => "dex",
      "CON" => "con",
      "INT" => "int",
      "WIS" => "wis",
      "CHA" => "cha",
      _ => return None,
    };
    return Some((ab, score, modifier));
  }
  None
}

fn parse_ability_score_modifier(line: &str) -> Option<(u16, i16)> {
  // "15 (+2)" or "8 (-1)"
  let line = line.trim();
  if let Some(paren_open) = line.find('(') {
    let score_str = line[..paren_open].trim();
    let score: u16 = score_str.parse().ok()?;
    let mod_str = line[paren_open + 1..].trim_end_matches(')').trim();
    let modifier: i16 =
      mod_str.trim_start_matches('+').parse().ok()?;
    return Some((score, modifier));
  }
  // Plain number (just score)
  let score: u16 = line.parse().ok()?;
  let modifier = crate::types::ability_modifier(score);
  Some((score, modifier))
}

fn parse_senses(text: &str) -> Senses {
  let mut senses = Senses {
    blindsight: None,
    darkvision: None,
    tremorsense: None,
    truesight: None,
    passive_perception: None,
  };
  for part in text.split(',') {
    let part = part.trim().to_lowercase();
    if part.contains("blindsight") {
      senses.blindsight = extract_ft_number(&part);
    } else if part.contains("darkvision") {
      senses.darkvision = extract_ft_number(&part);
    } else if part.contains("tremorsense") {
      senses.tremorsense = extract_ft_number(&part);
    } else if part.contains("truesight") {
      senses.truesight = extract_ft_number(&part);
    } else if part.contains("passive perception") {
      let digits: String =
        part.chars().filter(|c| c.is_ascii_digit()).collect();
      senses.passive_perception = digits.parse().ok();
    }
  }
  senses
}

fn parse_cr(line: &str) -> ChallengeRating {
  let lower = line.to_lowercase();
  let rest = if lower.starts_with("challenge ") {
    &line[10..]
  } else if lower.starts_with("cr ") {
    &line[3..]
  } else {
    line
  };

  // Extract CR value (before any parenthesis)
  let cr: String = rest
    .chars()
    .take_while(|c| c.is_ascii_digit() || *c == '/')
    .collect();

  // Extract XP from parentheses
  let xp = if let (Some(open), Some(close)) =
    (rest.find('('), rest.find(')'))
  {
    let inside = &rest[open + 1..close];
    let digits: String = inside
      .chars()
      .filter(|c| c.is_ascii_digit())
      .collect();
    digits.parse().ok()
  } else {
    None
  };

  ChallengeRating {
    cr: cr.trim().to_string(),
    xp,
    xp_in_lair: None,
    proficiency_bonus: None,
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_parse_dolgrim() {
    let text = "Dolgrim\nSmall Aberration, Chaotic Evil\n\nArmor Class 15 (natural Armour, shield)\nHit Points 13 (3d6 + 3)\nSpeed 30 ft.\n\nSTR\n15 (+2)\nDEX\n14 (+2)\nCON\n12 (+1)\nINT\n8 (-1)\nWIS\n10 (+0)\nCHA\n8 (-1)\n\nSenses Darkvision 60 ft., Passive Perception 10\nLanguages Deep Speech, Goblin\nChallenge 1/2 (100 XP)\n\nTraits\nDual Consciousness. The dolgrim has advantage on saving throws.\n\nActions\nMultiattack. The dolgrim makes three attacks.\n\nMorningstar. Melee Weapon Attack: +4 to hit, reach 5 ft.";
    let creature = parse_stat_block(text).unwrap();
    assert_eq!(creature.name, "Dolgrim");
    assert_eq!(creature.ac, 15);
    assert_eq!(creature.max_hp, 13);
    assert_eq!(creature.cr, "1/2");
    assert_eq!(creature.size.as_deref(), Some("Small"));
    assert_eq!(creature.alignment.as_deref(), Some("Chaotic Evil"));

    let sb = creature.stat_block.as_ref().unwrap();
    let ab = sb.abilities.as_ref().unwrap();
    assert_eq!(ab.str.score, 15);
    assert_eq!(ab.str.modifier, 2);
    assert_eq!(ab.int.score, 8);
    assert_eq!(ab.int.modifier, -1);
    assert_eq!(
      sb.senses.as_ref().unwrap().darkvision,
      Some(60)
    );
    assert!(!sb.traits.is_empty());
    assert!(!sb.actions.is_empty());
  }

  #[test]
  fn test_parse_2024_format() {
    let text =
      "Dragon\nHuge Dragon, Neutral\n\nAC 19\nHP 200 (16d12+96)\nSpeed 40 ft., fly 80 ft.\n\nSTR 25 +7 +7\nDEX 10 +0 +5\nCON 23 +6 +11\nINT 16 +3 +3\nWIS 13 +1 +6\nCHA 21 +5 +10";
    let creature = parse_stat_block(text).unwrap();
    assert_eq!(creature.ac, 19);
    assert_eq!(creature.max_hp, 200);
    let ab = creature
      .stat_block
      .as_ref()
      .unwrap()
      .abilities
      .as_ref()
      .unwrap();
    assert_eq!(ab.str.score, 25);
    assert_eq!(ab.str.modifier, 7);
  }
}
