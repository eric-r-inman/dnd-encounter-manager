# D&D 5e Creature Data Structure

This document defines the complete data structure for creatures in the D&D Encounter Manager. It describes all key/value pairs that can be present in a creature entry, their data types, and whether they are required or optional.

## Required Fields

The following fields are **REQUIRED** and must not be null:
- `name` (string)
- `maxHP` (number)
- `ac` (number)

## Top-Level Creature Properties

### Basic Identification
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `id` | string | Yes | Unique identifier for the creature | `"ancient-red-dragon"` |
| `name` | string | **Yes** | Display name of the creature | `"Ancient Red Dragon"` |
| `type` | string | Yes | Creature type (enemy, ally, neutral) | `"enemy"` |

### Core Stats
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `ac` | number | **Yes** | Armor Class value | `22` |
| `maxHP` | number | **Yes** | Maximum Hit Points | `507` |
| `cr` | string | No | Challenge Rating | `"24"` |

### Descriptive Information
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `size` | string | No | Creature size category | `"Gargantuan"` |
| `race` | string | No | Creature race/type | `"Dragon"` |
| `subrace` | string | No | Creature subtype/subrace | `"Chromatic"` |
| `alignment` | string | No | Creature alignment | `"Chaotic Evil"` |
| `description` | string | No | Brief description of the creature | `"The most powerful..."` |
| `source` | string | No | Source book reference | `"Monster Manual"` |

### Stat Block Control
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `hasFullStatBlock` | boolean | No | Whether full stat block is available | `true` |
| `statBlock` | object | No | Complete stat block (see below) | `{ ... }` |

---

## Full Stat Block Structure

The `statBlock` object contains detailed creature statistics following D&D 5e rules.

### General Information

#### fullType
- **Type**: string
- **Required**: No
- **Description**: Complete creature type description
- **Example**: `"Gargantuan Dragon (Chromatic), Chaotic Evil"`

---

### Combat Statistics

#### armorClass
- **Type**: object
- **Required**: No

| Subfield | Type | Required | Description | Example |
|----------|------|----------|-------------|---------|
| `value` | number | No | AC value | `22` |
| `type` | string | No | Type of armor/protection | `"Natural Armor"` |

**Example**:
```json
"armorClass": {
  "value": 22,
  "type": "Natural Armor"
}
```

#### hitPoints
- **Type**: object
- **Required**: No

| Subfield | Type | Required | Description | Example |
|----------|------|----------|-------------|---------|
| `average` | number | No | Average HP value | `507` |
| `formula` | string | No | Hit dice formula | `"26d20 + 234"` |

**Example**:
```json
"hitPoints": {
  "average": 507,
  "formula": "26d20 + 234"
}
```

#### initiative
- **Type**: object
- **Required**: No

| Subfield | Type | Required | Description | Example |
|----------|------|----------|-------------|---------|
| `modifier` | number | No | Initiative modifier | `14` |
| `total` | number | No | Total initiative bonus | `24` |

**Example**:
```json
"initiative": {
  "modifier": 14,
  "total": 24
}
```

#### speed
- **Type**: object
- **Required**: No

| Subfield | Type | Required | Description | Example |
|----------|------|----------|-------------|---------|
| `walk` | number | No | Walking speed in feet | `40` |
| `burrow` | number | No | Burrowing speed in feet | `20` |
| `climb` | number | No | Climbing speed in feet | `40` |
| `fly` | number | No | Flying speed in feet | `80` |
| `swim` | number | No | Swimming speed in feet | `40` |
| `hover` | boolean | No | Whether creature can hover | `true` |

**Example**:
```json
"speed": {
  "walk": 40,
  "burrow": null,
  "climb": 40,
  "fly": 80,
  "swim": null,
  "hover": false
}
```

---

### Ability Scores

#### abilities
- **Type**: object
- **Required**: No
- **Description**: Six core ability scores

Each ability has the following structure:

| Subfield | Type | Required | Description | Example |
|----------|------|----------|-------------|---------|
| `score` | number | No | Raw ability score (1-30) | `30` |
| `modifier` | number | No | Ability modifier | `10` |

**Abilities**:
- `str` - Strength
- `dex` - Dexterity
- `con` - Constitution
- `int` - Intelligence
- `wis` - Wisdom
- `cha` - Charisma

**Example**:
```json
"abilities": {
  "str": { "score": 30, "modifier": 10 },
  "dex": { "score": 10, "modifier": 0 },
  "con": { "score": 29, "modifier": 9 },
  "int": { "score": 18, "modifier": 4 },
  "wis": { "score": 15, "modifier": 2 },
  "cha": { "score": 27, "modifier": 8 }
}
```

---

### Proficiencies and Bonuses

#### savingThrows
- **Type**: object
- **Required**: No
- **Description**: Saving throw modifiers for each ability

| Subfield | Type | Required | Description | Example |
|----------|------|----------|-------------|---------|
| `str` | number | No | Strength save modifier | `10` |
| `dex` | number | No | Dexterity save modifier | `7` |
| `con` | number | No | Constitution save modifier | `9` |
| `int` | number | No | Intelligence save modifier | `4` |
| `wis` | number | No | Wisdom save modifier | `9` |
| `cha` | number | No | Charisma save modifier | `8` |

**Example**:
```json
"savingThrows": {
  "str": 10,
  "dex": 7,
  "con": 9,
  "int": 4,
  "wis": 9,
  "cha": 8
}
```

#### skills
- **Type**: object
- **Required**: No
- **Description**: Skill modifiers (key = skill name, value = modifier)

**Common Skills**:
- `acrobatics`, `animalHandling`, `arcana`, `athletics`, `deception`
- `history`, `insight`, `intimidation`, `investigation`, `medicine`
- `nature`, `perception`, `performance`, `persuasion`, `religion`
- `sleightOfHand`, `stealth`, `survival`

**Example**:
```json
"skills": {
  "perception": 16,
  "stealth": 7,
  "athletics": 15
}
```

---

### Resistances and Immunities

#### damageResistances
- **Type**: array of strings
- **Required**: No
- **Description**: Damage types the creature resists

**Example**: `["Fire", "Cold"]`

#### damageImmunities
- **Type**: array of strings
- **Required**: No
- **Description**: Damage types the creature is immune to

**Example**: `["Fire", "Poison"]`

#### damageVulnerabilities
- **Type**: array of strings
- **Required**: No
- **Description**: Damage types the creature is vulnerable to

**Example**: `["Cold", "Radiant"]`

#### conditionImmunities
- **Type**: array of strings
- **Required**: No
- **Description**: Conditions the creature is immune to

**Common Conditions**:
- `Blinded`, `Charmed`, `Deafened`, `Exhaustion`, `Frightened`
- `Grappled`, `Incapacitated`, `Invisible`, `Paralyzed`, `Petrified`
- `Poisoned`, `Prone`, `Restrained`, `Stunned`, `Unconscious`

**Example**: `["Charmed", "Frightened", "Paralyzed"]`

---

### Senses and Communication

#### senses
- **Type**: object
- **Required**: No

| Subfield | Type | Required | Description | Example |
|----------|------|----------|-------------|---------|
| `blindsight` | number | No | Blindsight range in feet | `60` |
| `darkvision` | number | No | Darkvision range in feet | `120` |
| `tremorsense` | number | No | Tremorsense range in feet | `60` |
| `truesight` | number | No | Truesight range in feet | `120` |
| `passivePerception` | number | No | Passive Perception score | `26` |

**Example**:
```json
"senses": {
  "blindsight": 60,
  "darkvision": 120,
  "tremorsense": null,
  "truesight": null,
  "passivePerception": 26
}
```

#### languages
- **Type**: array of strings
- **Required**: No
- **Description**: Languages the creature can speak/understand

**Example**: `["Common", "Draconic", "Telepathy 120 ft."]`

---

### Challenge Rating

#### challengeRating
- **Type**: object
- **Required**: No

| Subfield | Type | Required | Description | Example |
|----------|------|----------|-------------|---------|
| `cr` | string | No | Challenge Rating value | `"24"` |
| `xp` | number | No | Experience points awarded | `62000` |
| `xpInLair` | number | No | XP when fought in lair | `75000` |
| `proficiencyBonus` | number | No | Proficiency bonus | `7` |

**Example**:
```json
"challengeRating": {
  "cr": "24",
  "xp": 62000,
  "xpInLair": 75000,
  "proficiencyBonus": 7
}
```

---

### Special Abilities and Features

#### traits
- **Type**: array of objects
- **Required**: No
- **Description**: Passive features and traits

**Trait Object Structure**:

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `name` | string | Yes | Trait name | `"Legendary Resistance"` |
| `description` | string | Yes | Full trait description | `"(4/Day)..."` |
| `usage` | object | No | Usage limitations | `{ ... }` |

**Usage Object Structure** (when present):

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `type` | string | No | Usage type | `"perDay"`, `"recharge"` |
| `amount` | number | No | Number of uses | `4` |
| `amountInLair` | number | No | Uses when in lair | `5` |
| `recharge` | string | No | Recharge condition | `"5-6"`, `"shortRest"` |

**Example**:
```json
"traits": [
  {
    "name": "Legendary Resistance",
    "description": "(4/Day, or 5/Day in Lair). If the dragon fails a saving throw, it can choose to succeed instead.",
    "usage": {
      "type": "perDay",
      "amount": 4,
      "amountInLair": 5
    }
  },
  {
    "name": "Amphibious",
    "description": "The creature can breathe air and water.",
    "usage": null
  }
]
```

---

### Actions

#### actions
- **Type**: array of objects
- **Required**: No
- **Description**: Actions the creature can take

**Action Object Structure**:

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `name` | string | Yes | Action name | `"Rend"` |
| `type` | string | Yes | Action type | `"melee"`, `"ranged"`, `"special"`, `"multiattack"` |
| `description` | string | Yes | Full action description | `"Melee Attack Roll..."` |
| `attackBonus` | number | No | Attack roll bonus | `17` |
| `reach` | string | No | Melee reach | `"15 ft."` |
| `range` | string | No | Ranged range | `"30/120 ft."` |
| `damage` | string | No | Primary damage | `"19 (2d8 + 10)"` |
| `damageType` | string | No | Primary damage type | `"slashing"` |
| `additionalDamage` | string | No | Secondary damage | `"10 (3d6)"` |
| `additionalDamageType` | string | No | Secondary damage type | `"fire"` |
| `saveDC` | number | No | Saving throw DC | `24` |
| `saveType` | string | No | Saving throw ability | `"Dexterity"` |
| `area` | string | No | Area of effect | `"90-foot cone"` |
| `recharge` | string | No | Recharge condition | `"5-6"` |
| `usage` | object | No | Usage limitations | `{ ... }` |

**Example - Melee Attack**:
```json
{
  "name": "Rend",
  "type": "melee",
  "description": "Melee Attack Roll: +17, reach 15 ft. Hit: 19 (2d8 + 10) Slashing damage plus 10 (3d6) Fire damage.",
  "attackBonus": 17,
  "reach": "15 ft.",
  "damage": "19 (2d8 + 10)",
  "damageType": "slashing",
  "additionalDamage": "10 (3d6)",
  "additionalDamageType": "fire"
}
```

**Example - Special Ability**:
```json
{
  "name": "Fire Breath",
  "type": "special",
  "description": "(Recharge 5–6). Dexterity Saving Throw: DC 24, each creature in a 90-foot Cone. Failure: 91 (26d6) Fire damage. Success: Half damage.",
  "saveDC": 24,
  "saveType": "Dexterity",
  "area": "90-foot cone",
  "damage": "91 (26d6)",
  "damageType": "fire",
  "recharge": "5-6"
}
```

**Example - Multiattack**:
```json
{
  "name": "Multiattack",
  "type": "multiattack",
  "description": "The dragon makes three Rend attacks. It can replace one attack with a use of Spellcasting to cast Scorching Ray (level 3 version)."
}
```

---

### Reactions

#### reactions
- **Type**: array of objects
- **Required**: No
- **Description**: Reactions the creature can take

**Reaction Object Structure** (same as actions):

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `name` | string | Yes | Reaction name | `"Parry"` |
| `description` | string | Yes | Full reaction description | `"The creature adds..."` |
| `trigger` | string | No | What triggers the reaction | `"When hit by a melee attack"` |

**Example**:
```json
"reactions": [
  {
    "name": "Parry",
    "description": "The creature adds 5 to its AC against one melee attack that would hit it.",
    "trigger": "When hit by a melee attack"
  }
]
```

---

### Legendary Actions

#### legendaryActions
- **Type**: object
- **Required**: No
- **Description**: Legendary actions available to the creature

**Legendary Actions Object Structure**:

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `description` | string | No | General description | `"Legendary Action Uses: 3..."` |
| `uses` | number | No | Number of uses per round | `3` |
| `usesInLair` | number | No | Number of uses in lair | `4` |
| `options` | array | No | Available legendary actions | `[...]` |

**Legendary Action Option Structure**:

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `name` | string | Yes | Action name | `"Pounce"` |
| `description` | string | Yes | Action description | `"The dragon moves..."` |
| `cost` | number | No | Cost in legendary actions | `1`, `2`, `3` |

**Example**:
```json
"legendaryActions": {
  "description": "Legendary Action Uses: 3 (4 in Lair). Immediately after another creature's turn, the dragon can expend a use to take one of the following actions.",
  "uses": 3,
  "usesInLair": 4,
  "options": [
    {
      "name": "Pounce",
      "description": "The dragon moves up to half its Speed, and it makes one Rend attack.",
      "cost": 1
    },
    {
      "name": "Wing Attack",
      "description": "The dragon beats its wings. Each creature within 15 feet must succeed on a DC 25 Dexterity saving throw or take 17 (2d6 + 10) bludgeoning damage and be knocked prone.",
      "cost": 2
    }
  ]
}
```

---

### Lair Actions

#### lairActions
- **Type**: object or array
- **Required**: No
- **Description**: Actions the creature can take in its lair

**Structure** (flexible, depends on creature):

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `initiative` | number | No | Initiative count for lair actions | `20` |
| `description` | string | No | General description | `"On initiative count 20..."` |
| `options` | array | No | Available lair actions | `[...]` |

**Example**:
```json
"lairActions": {
  "initiative": 20,
  "description": "On initiative count 20 (losing initiative ties), the dragon can take one of the following lair actions:",
  "options": [
    {
      "name": "Tremor",
      "description": "The dragon causes a tremor. Each creature on the ground within 60 feet must succeed on a DC 15 Dexterity saving throw or be knocked prone."
    }
  ]
}
```

---

### Regional Effects

#### regionalEffects
- **Type**: object or array
- **Required**: No
- **Description**: Passive effects in the region around the creature's lair

**Structure**:

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `radius` | string | No | Affected area | `"1 mile"`, `"6 miles"` |
| `description` | string | No | General description | `"The region containing..."` |
| `effects` | array | No | List of effects | `[...]` |

**Example**:
```json
"regionalEffects": {
  "radius": "6 miles",
  "description": "The region containing a legendary dragon's lair is warped by the dragon's magic:",
  "effects": [
    {
      "name": "Scorching Heat",
      "description": "The temperature is extremely hot within 6 miles of the lair."
    },
    {
      "name": "Volcanic Fissures",
      "description": "Rocky fissures form portals to the Elemental Plane of Fire."
    }
  ]
}
```

---

### Spellcasting

#### spellcasting
- **Type**: object
- **Required**: No
- **Description**: Spellcasting abilities

**Spellcasting Object Structure**:

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `description` | string | No | Spellcasting description | `"The dragon casts..."` |
| `ability` | string | No | Spellcasting ability | `"Charisma"`, `"Intelligence"` |
| `saveDC` | number | No | Spell save DC | `23` |
| `attackBonus` | number | No | Spell attack bonus | `15` |
| `spells` | object | No | Available spells | `{ ... }` |

**Spells Object Structure**:

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `atWill` | array | No | At-will spells | `[...]` |
| `perDay` | object | No | Limited use spells | `{ "1": [...], "2": [...] }` |
| `slots` | object | No | Spell slots by level | `{ "1": 4, "2": 3 }` |

**Spell Entry Structure**:

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `name` | string | Yes | Spell name | `"Fireball"` |
| `level` | number | No | Spell level (null for cantrips) | `3`, `null` |

**Example**:
```json
"spellcasting": {
  "description": "The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 23, +15 to hit with spell attacks):",
  "ability": "Charisma",
  "saveDC": 23,
  "attackBonus": 15,
  "spells": {
    "atWill": [
      { "name": "Command", "level": 2 },
      { "name": "Detect Magic", "level": null }
    ],
    "perDay": {
      "1": [
        { "name": "Fireball", "level": 6 },
        { "name": "Scrying", "level": null }
      ],
      "3": [
        { "name": "Minor Illusion", "level": null }
      ]
    }
  }
}
```

---

## Common Damage Types

- `Acid`, `Bludgeoning`, `Cold`, `Fire`, `Force`
- `Lightning`, `Necrotic`, `Piercing`, `Poison`, `Psychic`
- `Radiant`, `Slashing`, `Thunder`

**Physical Damage Variants**:
- `Bludgeoning (Nonmagical)`
- `Piercing (Nonmagical)`
- `Slashing (Nonmagical)`

---

## Common Ability Score Abbreviations

- `str` - Strength
- `dex` - Dexterity
- `con` - Constitution
- `int` - Intelligence
- `wis` - Wisdom
- `cha` - Charisma

---

## Size Categories

- `Tiny`
- `Small`
- `Medium`
- `Large`
- `Huge`
- `Gargantuan`

---

## Creature Types (Race)

- `Aberration`
- `Beast`
- `Celestial`
- `Construct`
- `Dragon`
- `Elemental`
- `Fey`
- `Fiend`
- `Giant`
- `Humanoid`
- `Monstrosity`
- `Ooze`
- `Plant`
- `Undead`

---

## Alignment Options

- `Lawful Good`, `Neutral Good`, `Chaotic Good`
- `Lawful Neutral`, `True Neutral`, `Chaotic Neutral`
- `Lawful Evil`, `Neutral Evil`, `Chaotic Evil`
- `Unaligned` (for creatures without moral agency)

---

## Example: Minimal Required Creature

```json
{
  "id": "goblin",
  "name": "Goblin",
  "type": "enemy",
  "ac": 15,
  "maxHP": 7
}
```

## Example: Fully Detailed Creature

See `src/data/creatures/creature-database.json` for complete examples of:
- Ancient Red Dragon (legendary creature with full stat block)
- Aboleth (creature with legendary resistance and lair actions)

---

## Notes for Developers

1. **Required Fields**: Only `name`, `maxHP`, and `ac` are strictly required. All other fields can be `null` or omitted.

2. **Null vs Omitted**: For optional fields, use `null` to explicitly indicate "not applicable" or omit the field entirely.

3. **Extensibility**: The structure is designed to be extensible. New fields can be added without breaking existing functionality.

4. **Validation**: When creating creatures programmatically, always validate that required fields are present and non-null.

5. **Custom Creatures**: User-created creatures should follow the same structure but may have fewer fields populated.

6. **Data Sources**: Creatures can reference their source book for DMs who want to look up additional information.

---

**Last Updated**: October 31, 2025
**Schema Version**: 2.0.0
**Compatible with**: D&D 5e (2014 and 2024 rules)
