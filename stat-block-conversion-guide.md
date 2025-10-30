# D&D Stat Block to JSON Converter

I need you to convert D&D 5e stat blocks into JSON format for my creature database. Here is the exact structure needed:

## Target JSON Structure:

```json
{
  "id": "creature-name-lowercase-hyphenated",
  "name": "Creature Name",
  "type": "enemy", // or "player" or "npc"
  "ac": 15,
  "maxHP": 45,
  "cr": "2",
  "size": "Medium",
  "race": "Humanoid",
  "subrace": "orc", // optional
  "alignment": "Chaotic Evil", // optional
  "description": "Brief description",
  "source": "Monster Manual",
  "hasFullStatBlock": true,
  "statBlock": {
    "fullType": "Medium humanoid (orc), chaotic evil",
    "armorClass": {
      "value": 15,
      "type": "Natural Armor"
    },
    "hitPoints": {
      "average": 45,
      "formula": "6d8 + 18"
    },
    "initiative": {
      "modifier": 1,
      "total": 11
    },
    "speed": {
      "walk": 30,
      "burrow": null,
      "climb": null,
      "fly": null,
      "swim": null
    },
    "abilities": {
      "str": { "score": 16, "modifier": 3 },
      "dex": { "score": 12, "modifier": 1 },
      "con": { "score": 16, "modifier": 3 },
      "int": { "score": 7, "modifier": -2 },
      "wis": { "score": 11, "modifier": 0 },
      "cha": { "score": 10, "modifier": 0 }
    },
    "savingThrows": {
      "str": null,
      "dex": null,
      "con": null,
      "int": null,
      "wis": null,
      "cha": null
    },
    "skills": {
      "intimidation": 2
    },
    "damageResistances": [],
    "damageImmunities": ["fire"],
    "damageVulnerabilities": [],
    "conditionImmunities": [],
    "senses": {
      "blindsight": null,
      "darkvision": 60,
      "tremorsense": null,
      "truesight": null,
      "passivePerception": 10
    },
    "languages": ["Common", "Orc"],
    "challengeRating": {
      "cr": "2",
      "xp": 450,
      "xpInLair": null,
      "proficiencyBonus": 2
    },
    "traits": [
      {
        "name": "Aggressive",
        "description": "As a bonus action, the orc can move up to its speed toward a hostile creature that it can see.",
        "usage": null
      }
    ],
    "actions": [
      {
        "name": "Greataxe",
        "type": "melee",
        "description": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 9 (1d12 + 3) slashing damage.",
        "attackBonus": 5,
        "reach": "5 ft.",
        "damage": "9 (1d12 + 3)",
        "damageType": "slashing"
      }
    ],
    "reactions": [],
    "legendaryActions": null,
    "lairActions": null,
    "regionalEffects": null,
    "spellcasting": null
  }
}

Conversion Rules:

ID: Convert name to lowercase, replace spaces with hyphens
Type: Default to "enemy" unless specified otherwise
CR: Keep as string (e.g., "1/2", "0", "24")
Abilities: Extract both score and modifier
Skills: Calculate bonus from ability modifier + proficiency
Damage/Condition Arrays: Parse comma-separated lists
Actions: Parse attack bonus, damage dice, and damage type from description
Null Values: Use null for missing properties, not undefined or empty strings

Please convert the following stat block:
[PASTE STAT BLOCK HERE]

End of stat block

If you need a sample, the project file creature-database.json is available in Project knowledge for your reference.

Common Patterns to Watch For

1. **Armor Class Parsing**:
   - "13 (hide armor)" → `"value": 13, "type": "hide armor"`
   - "22 (natural armor)" → `"value": 22, "type": "natural armor"`
   - Just "15" → `"value": 15, "type": null`

2. **Hit Points Parsing**:
   - "15 (2d8 + 6)" → `"average": 15, "formula": "2d8 + 6"`

3. **Speed Parsing**:
   - "30 ft." → `"walk": 30`
   - "30 ft., fly 60 ft." → `"walk": 30, "fly": 60`
   - "30 ft., burrow 20 ft., climb 30 ft." → parse each

4. **Ability Scores**:
   - "STR 16 (+3)" → `"str": { "score": 16, "modifier": 3 }`

5. **Skills Parsing**:
   - "Intimidation +2, Perception +4" → `"intimidation": 2, "perception": 4`

6. **Damage Types**:
   - "Damage Resistances bludgeoning, piercing" → `["bludgeoning", "piercing"]`

7. **Actions Parsing**:
   - Extract attack bonus from "+X to hit"
   - Extract damage from "X (YdZ + A) damage type"
   - Identify action type: melee, ranged, or special

Special Cases

1. **Legendary Creatures**:
   ```json
   "legendaryActions": {
     "description": "The dragon can take 3 legendary actions...",
     "uses": 3,
     "usesInLair": 4,
     "options": [
       {
         "name": "Detect",
         "description": "The dragon makes a Wisdom (Perception) check.",
         "cost": 1
       }
     ]
   }

   "spellcasting": {
  "description": "The lich is an 18th-level spellcaster...",
  "ability": "Intelligence",
  "saveDC": 20,
  "attackBonus": 12,
  "spells": {
    "atWill": [
      { "name": "detect magic", "level": null }
    ],
    "perDay": {
      "1": [
        { "name": "plane shift", "level": 7 }
      ]
    }
  }
}