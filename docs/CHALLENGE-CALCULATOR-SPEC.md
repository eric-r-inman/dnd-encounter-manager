# Challenge Rating Calculator - Implementation Specification

**Date Created:** November 2, 2025
**Feature Status:** Ready for Implementation
**Priority:** High

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [Core Requirements](#core-requirements)
3. [Technical Specifications](#technical-specifications)
4. [UI/UX Design](#uiux-design)
5. [Data Structures](#data-structures)
6. [DMG Reference Tables](#dmg-reference-tables)
7. [Implementation Steps](#implementation-steps)
8. [Files to Create/Modify](#files-to-createmodify)
9. [Integration Points](#integration-points)

---

## Overview

### Purpose
Create a modular Challenge Rating Calculator that helps DMs determine encounter difficulty based on D&D 5e rules (DMG page 82). The calculator opens in a separate browser tab, supports multiple party configurations, and integrates with the existing encounter manager.

### Key Features
- Calculate encounter difficulty (Easy/Medium/Hard/Deadly) based on DMG rules
- Manage multiple saved party configurations
- Import current encounter from main app
- Export calculated encounter back to main app
- Persistent storage across sessions
- Real-time CR calculations with detailed breakdowns

---

## Core Requirements

### 1. Party Information Storage

**Party Composition:**
- Individual party members must reference existing PCs and NPCs from the encounter manager database
- For PCs: Reference creature from database, use their level/stats
- For NPCs: Track everything tracked for enemies (full stat block)
- Support multiple saved party configurations (e.g., "Tuesday Group", "Weekend Campaign")
- Party configurations saved/loaded as separate files (similar to encounter save/load)
- Current party composition stored in localStorage (similar to encounter storage)

### 2. CR Data Availability

**CR Handling:**
- Use existing `cr` field from creature data
- Allow custom CR editing within the calculator
- Leave CR rating empty if creature does not have a CR value
- Handle custom creatures gracefully (with or without CR)
- Display warnings for missing CR values

### 3. Module Display Type

**Standalone Browser Tab:**
- Open calculator in its own browser tab (like standalone creature pages)
- Self-contained HTML page with embedded CSS
- Full access to localStorage for data persistence
- No dependency on main app being open

### 4. Information Display (Level of Detail)

**Full Detail Display:**
- **Difficulty Rating:** Easy/Medium/Hard/Deadly with clear visual indicator
- **Adjusted XP:** Final XP after multiplier applied
- **Total Base XP:** Sum of all enemy XP (before multiplier)
- **XP Breakdown:** Table showing each creature's CR and XP contribution
- **Multiplier Applied:** Show which multiplier was used and why
- **Party Threshold Table:** Show APL and all four difficulty thresholds
- **Warnings/Alerts:** Missing CRs, empty party, deadly encounters, etc.
- **Recommendations:** Optional DM guidance based on difficulty

### 5. Real-time Updates

**Update Behavior:**
- CR calculation updates when module is opened/refreshed
- Manual refresh button available
- **Import from Encounter:** Button to populate calculator with creatures from main app's encounter queue
- **Export to Encounter:**
  - Allow selection of which creatures to export (checkboxes)
  - Options: Export All, or select individual enemies/NPCs/players
  - Confirmation dialog: "Replace current encounter queue with CR calculator setup?"
  - All exported creatures have initiative set to 1 (user sets manually in main app)

### 6. Multiple Parties

**Party Management:**
- Support multiple saved party configurations
- Each configuration has:
  - Name (e.g., "Tuesday Group", "Weekend Campaign")
  - List of party members (references to creatures)
  - Creation/modification dates
- Save/Load party configurations as JSON files
- Current active party stored in localStorage

### 7. Average Party Level Calculation

**APL Calculation:**
- **Automatic:** Calculated from party member levels
- **Editable:** Allow manual override if needed
- Display: "APL: 5 (calculated)" or "APL: 5 (manual override)"

---

## Technical Specifications

### Data Persistence

**localStorage Keys:**
```javascript
'dnd-cr-calculator-state'       // Current calculator state
'dnd-cr-calculator-parties'     // Saved party configurations
'dnd-cr-calculator-current-party' // Currently selected party ID
```

**State Management:**
- Current enemies/NPCs list persists across sessions
- Selected party persists across sessions
- If creature deleted from database, remove from calculator and notify user
- Creature stats update when calculator refreshes (fetch latest from database)

### Creature Database Sync

**Real-time Sync Behavior:**
1. On calculator open/refresh, fetch latest creature data from `dnd-custom-creatures` and base database
2. For each creature in calculator list:
   - If creature exists in database: update stats/CR to latest
   - If creature deleted from database:
     - Remove from calculator list
     - Show toast: "⚠️ Creature '{name}' no longer exists and was removed"
3. Keep calculator list IDs synchronized with database

---

## UI/UX Design

### Button Placement

**Location:** Under the **Compendium** heading (not Encounter heading as initially stated)
- Position: To the right of the "Open" button
- Style: Same as "Open" button (btn btn-primary)
- Icon: Unicode U+1F453 (🎓)
- Label: "CR Calc"

**Button HTML Example:**
```html
<button class="btn btn-primary" data-action="open-cr-calculator">
    🎓 CR Calc
</button>
```

### Standalone Page Layout

**Page Structure:**
```
┌─────────────────────────────────────────────────────┐
│  D&D Challenge Rating Calculator                    │
│  [Save Party] [Load Party] [Import Encounter]       │
│  [Refresh] [Export to Encounter]                    │
├─────────────────────────────────────────────────────┤
│  Party Configuration                                │
│  ┌───────────────────────────────────────────────┐ │
│  │ Party: [Tuesday Group ▼]                      │ │
│  │ APL: 5 (calculated) [Edit]                    │ │
│  │                                                 │ │
│  │ Party Members:                                  │ │
│  │ ☑ Aragorn (Fighter 5)                         │ │
│  │ ☑ Gandalf (Wizard 6)                          │ │
│  │ ☑ Legolas (Ranger 5)                          │ │
│  │ [+ Add Member] [Remove Selected]               │ │
│  └───────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│  Encounter Composition                              │
│  ┌───────────────────────────────────────────────┐ │
│  │ ☑ Goblin (CR 1/4, 50 XP) x2                   │ │
│  │ ☑ Orc (CR 1/2, 100 XP)                        │ │
│  │ ☐ Troll (CR 5, 1,800 XP)                      │ │
│  │ [+ Add Creature] [Remove Selected]             │ │
│  └───────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│  Challenge Rating Results                           │
│  ┌───────────────────────────────────────────────┐ │
│  │ Difficulty: MEDIUM                             │ │
│  │                                                 │ │
│  │ Total Base XP: 200                             │ │
│  │ Multiplier: 1.5 (2 monsters, 3-5 party)       │ │
│  │ Adjusted XP: 300                               │ │
│  │                                                 │ │
│  │ Party Thresholds (APL 5):                     │ │
│  │   Easy: 250 XP                                 │ │
│  │   Medium: 500 XP                               │ │
│  │   Hard: 750 XP                                 │ │
│  │   Deadly: 1,100 XP                            │ │
│  └───────────────────────────────────────────────┘ │
│  ⚠️ Warnings: None                                 │
└─────────────────────────────────────────────────────┘
```

### Visual Design

**Color Coding for Difficulty:**
- **Easy:** Green background, "This encounter should be trivial for the party"
- **Medium:** Yellow/Orange background, "Standard challenge for the party"
- **Hard:** Orange/Red background, "Difficult encounter, party will expend resources"
- **Deadly:** Red background, "⚠️ High risk of character death"

**Responsive Design:**
- Max width: 1000px
- Centered on page
- Same dark theme as main app
- Print-friendly option

---

## Data Structures

### Party Configuration

```javascript
{
  id: "party-uuid-1234",
  name: "Tuesday Group",
  members: [
    {
      creatureId: "aragorn-fighter",
      type: "pc"  // "pc" or "npc"
    },
    {
      creatureId: "gandalf-wizard",
      type: "pc"
    }
  ],
  createdAt: "2025-11-02T10:00:00Z",
  modifiedAt: "2025-11-02T10:00:00Z"
}
```

### Calculator State

```javascript
{
  enemies: [
    {
      creatureId: "goblin",
      count: 2,
      customCR: null  // Override CR if needed
    },
    {
      creatureId: "troll",
      count: 1,
      customCR: 6  // Custom CR override
    }
  ],
  currentPartyId: "party-uuid-1234",
  manualAPL: null  // null = use calculated, number = manual override
}
```

### Export to Encounter Format

```javascript
{
  creatures: [
    {
      creatureId: "goblin",
      initiative: 1,
      count: 2  // Creates 2 instances
    },
    {
      creatureId: "aragorn-fighter",
      initiative: 1,
      count: 1
    }
  ]
}
```

---

## DMG Reference Tables

### XP Thresholds by Character Level

**Source:** DMG page 82

| Character Level | Easy XP | Medium XP | Hard XP | Deadly XP |
|----------------|---------|-----------|---------|-----------|
| 1 | 25 | 50 | 75 | 100 |
| 2 | 50 | 100 | 150 | 200 |
| 3 | 75 | 150 | 225 | 400 |
| 4 | 125 | 250 | 375 | 500 |
| 5 | 250 | 500 | 750 | 1,100 |
| 6 | 300 | 600 | 900 | 1,400 |
| 7 | 350 | 750 | 1,100 | 1,700 |
| 8 | 450 | 900 | 1,400 | 2,100 |
| 9 | 550 | 1,100 | 1,600 | 2,400 |
| 10 | 600 | 1,200 | 1,900 | 2,800 |
| 11 | 800 | 1,600 | 2,400 | 3,600 |
| 12 | 1,000 | 2,000 | 3,000 | 4,500 |
| 13 | 1,100 | 2,200 | 3,400 | 5,100 |
| 14 | 1,250 | 2,500 | 3,800 | 5,700 |
| 15 | 1,400 | 2,800 | 4,300 | 6,400 |
| 16 | 1,600 | 3,200 | 4,800 | 7,200 |
| 17 | 2,000 | 3,900 | 5,900 | 8,800 |
| 18 | 2,100 | 4,200 | 6,300 | 9,500 |
| 19 | 2,400 | 4,900 | 7,300 | 10,900 |
| 20 | 2,800 | 5,700 | 8,500 | 12,700 |

**Formula for Party Thresholds:**
```javascript
partyThreshold = sum of (each member's level threshold)
```

Example: Party of 3 level-5 characters
- Easy: 250 × 3 = 750 XP
- Medium: 500 × 3 = 1,500 XP
- Hard: 750 × 3 = 2,250 XP
- Deadly: 1,100 × 3 = 3,300 XP

### Challenge Rating to XP

**Source:** DMG page 82

| CR | XP | CR | XP |
|----|----|----|-----|
| 0 | 10 | 14 | 11,500 |
| 1/8 | 25 | 15 | 13,000 |
| 1/4 | 50 | 16 | 15,000 |
| 1/2 | 100 | 17 | 18,000 |
| 1 | 200 | 18 | 20,000 |
| 2 | 450 | 19 | 22,000 |
| 3 | 700 | 20 | 25,000 |
| 4 | 1,100 | 21 | 33,000 |
| 5 | 1,800 | 22 | 41,000 |
| 6 | 2,300 | 23 | 50,000 |
| 7 | 2,900 | 24 | 62,000 |
| 8 | 3,900 | 25 | 75,000 |
| 9 | 5,000 | 26 | 90,000 |
| 10 | 5,900 | 27 | 105,000 |
| 11 | 7,200 | 28 | 120,000 |
| 12 | 8,400 | 29 | 135,000 |
| 13 | 10,000 | 30 | 155,000 |

### XP Multiplier Table

**Source:** DMG page 82

| Number of Monsters | Party Size 1-2 | Party Size 3-5 | Party Size 6+ |
|-------------------|----------------|----------------|---------------|
| 1 | × 1.5 | × 1 | × 0.5 |
| 2 | × 2 | × 1.5 | × 1 |
| 3-6 | × 2.5 | × 2 | × 1.5 |
| 7-10 | × 3 | × 2.5 | × 2 |
| 11-14 | × 4 | × 3 | × 2.5 |
| 15+ | × 5 | × 4 | × 3 |

**Important Notes:**
- Count only enemy/hostile creatures for multiplier
- Party size = number of player characters (PCs)
- Single monster multipliers account for action economy advantage

---

## Implementation Steps

### Phase 1: Data Layer (1-2 hours)

1. **Create CR Calculation Engine**
   - File: `src/scripts/services/cr-calculator-service.js`
   - Functions:
     - `getCRXP(cr)` - Convert CR string to XP
     - `getXPMultiplier(monsterCount, partySize)` - Get multiplier from table
     - `getThresholds(characterLevel)` - Get XP thresholds for level
     - `calculatePartyThresholds(partyMembers)` - Sum thresholds
     - `calculateEncounterDifficulty(enemies, party)` - Main calculation
     - `getDifficultyRating(adjustedXP, thresholds)` - Easy/Medium/Hard/Deadly

2. **Create Party Management Service**
   - File: `src/scripts/services/party-manager.js`
   - Functions:
     - `saveParty(partyConfig)` - Save to localStorage
     - `loadParty(partyId)` - Load from localStorage
     - `deleteParty(partyId)` - Remove from localStorage
     - `getAllParties()` - Get all saved parties
     - `exportParty(partyId)` - Export as JSON file
     - `importParty(file)` - Import from JSON file
     - `calculateAPL(partyMembers)` - Calculate average party level

3. **Create Calculator State Manager**
   - File: `src/scripts/services/cr-state-manager.js`
   - Functions:
     - `saveState(state)` - Save current calculator state
     - `loadState()` - Load calculator state
     - `syncWithDatabase()` - Update creature data, remove deleted creatures
     - `validateState()` - Check for missing/invalid data

### Phase 2: UI Layer (2-3 hours)

1. **Create Standalone Page Template**
   - File: `src/templates/cr-calculator-page.js`
   - Export complete HTML page with embedded CSS
   - Similar to `generateStandaloneCreaturePage()` pattern
   - Include all necessary JavaScript inline

2. **Create CR Calculator UI Component**
   - File: `src/scripts/cr-calculator/cr-calculator-ui.js`
   - Render party selection/management UI
   - Render enemy list with checkboxes
   - Render results display
   - Handle all user interactions

3. **Create CSS Styles**
   - File: `src/templates/cr-calculator.css`
   - Dark theme matching main app
   - Responsive layout
   - Color-coded difficulty indicators
   - Print-friendly styles

### Phase 3: Integration (1 hour)

1. **Add Button to Compendium Section**
   - File: `index.html`
   - Add button under Compendium heading, right of "Open" button
   - Icon: 🎓 (U+1F453)
   - Label: "CR Calc"

2. **Create Event Handler**
   - File: `src/scripts/events/cr-calculator-events.js`
   - `handleOpenCRCalculator()` - Open calculator in new tab
   - `handleImportFromEncounter()` - Import current encounter
   - `handleExportToEncounter()` - Export with confirmation

3. **Wire Up Events**
   - File: `src/scripts/events/index.js`
   - Add case for 'open-cr-calculator'
   - Delegate to CR calculator event handler

### Phase 4: Data Export/Import (1 hour)

1. **Encounter Queue Import**
   - Read current combatants from main app
   - Convert to calculator format
   - Populate calculator state
   - Open calculator tab with imported data

2. **Encounter Queue Export**
   - Show modal with checkboxes for each creature
   - "Export All" vs "Export Selected"
   - Confirmation: "Replace current encounter queue?"
   - Create combatants with initiative = 1
   - Update main app encounter queue

### Phase 5: Testing & Polish (1 hour)

1. **Test Calculations**
   - Verify XP values match DMG tables
   - Test all multiplier scenarios
   - Test edge cases (empty party, no enemies, missing CR)

2. **Test Persistence**
   - Verify localStorage saves/loads correctly
   - Test party configurations
   - Test creature database sync

3. **Test Integration**
   - Import from encounter
   - Export to encounter
   - Multiple party configurations

---

## Files to Create/Modify

### New Files to Create

```
src/scripts/services/
  ├── cr-calculator-service.js       # Core CR calculation logic
  ├── party-manager.js                # Party configuration management
  └── cr-state-manager.js             # Calculator state persistence

src/scripts/cr-calculator/
  └── cr-calculator-ui.js             # UI rendering and interactions

src/scripts/events/
  └── cr-calculator-events.js         # Event handlers for CR calculator

src/templates/
  ├── cr-calculator-page.js           # Standalone page template
  └── cr-calculator.css               # Styles for calculator page
```

### Files to Modify

```
index.html
  - Add "CR Calc" button under Compendium heading

src/scripts/events/index.js
  - Add case for 'open-cr-calculator' action
  - Import and delegate to CRCalculatorEvents

src/scripts/data-services.js (optional)
  - Add CRCalculatorService to DataServices if needed
```

---

## Integration Points

### 1. Creature Database Access

```javascript
// Access creature database
const creatures = DataServices.combatantManager?.creatureDatabase || [];

// Get specific creature
const creature = creatures.find(c => c.id === creatureId);

// Get CR and XP
const cr = creature.cr;  // e.g., "1/4", "5", "1/2"
```

### 2. Current Encounter Access

```javascript
// Get all combatants in current encounter
const combatants = DataServices.combatantManager.getAllCombatants();

// Filter enemies (type: 'enemy')
const enemies = combatants.filter(c => c.type === 'enemy');
```

### 3. localStorage Keys (Don't Conflict)

**Existing keys:**
- `dnd-custom-creatures` - Custom creature database
- `dnd-hidden-creatures` - Hidden creatures
- `dnd-encounter-state` - Current encounter state
- `dnd-recent-creatures` - Recently used creatures
- `dnd-recent-encounters` - Recent encounters

**New keys for CR Calculator:**
- `dnd-cr-calculator-state` - Current calculator state
- `dnd-cr-calculator-parties` - Saved party configurations
- `dnd-cr-calculator-current-party` - Active party ID

### 4. Opening New Tab Pattern

```javascript
// Similar to openCreatureInNewWindow()
static handleOpenCRCalculator() {
  // Generate page HTML
  const htmlContent = generateCRCalculatorPage();

  // Open in new tab
  const newTab = window.open('', '_blank');
  newTab.document.write(htmlContent);
  newTab.document.close();
}
```

---

## Warnings to Display

Use judgment, but consider these examples:

### Critical Warnings (Red)
- ⚠️ **Deadly Encounter**: High risk of character death. Consider reducing difficulty.
- ⚠️ **No Party Configured**: Please add party members to calculate difficulty.
- ⚠️ **No Enemies**: Add creatures to calculate encounter difficulty.

### Important Warnings (Orange)
- ⚠️ **Missing CR**: {count} creatures missing CR values. Calculation may be inaccurate.
- ⚠️ **Large Party Size**: Party size > 6. Multipliers adjusted for large groups.
- ⚠️ **Single Monster**: Consider action economy - solo monsters can be easier than CR suggests.

### Info Messages (Blue)
- ℹ️ **Easy Encounter**: Party should handle this with minimal resource expenditure.
- ℹ️ **Creatures Removed**: {creature names} no longer exist in database and were removed.
- ℹ️ **Stats Updated**: Creature data refreshed from database.

---

## Calculation Example

**Given:**
- Party: 4 characters, levels [5, 5, 6, 4]
- Enemies: 2 Goblins (CR 1/4), 1 Orc (CR 1/2)

**Calculation:**

1. **Calculate APL:**
   - APL = (5 + 5 + 6 + 4) / 4 = 5

2. **Get Party Thresholds (using APL 5):**
   - Easy: 250 × 4 = 1,000 XP
   - Medium: 500 × 4 = 2,000 XP
   - Hard: 750 × 4 = 3,000 XP
   - Deadly: 1,100 × 4 = 4,400 XP

3. **Calculate Base XP:**
   - Goblin (CR 1/4) = 50 XP × 2 = 100 XP
   - Orc (CR 1/2) = 100 XP × 1 = 100 XP
   - Total Base XP = 200 XP

4. **Apply Multiplier:**
   - Number of monsters = 3
   - Party size = 4 (falls in 3-5 range)
   - Multiplier = 2 (from table: 3-6 monsters, 3-5 party)
   - Adjusted XP = 200 × 2 = 400 XP

5. **Determine Difficulty:**
   - 400 XP < 1,000 XP (Easy threshold)
   - **Difficulty: EASY**

---

## Success Criteria

✅ Calculator opens in new browser tab
✅ Supports multiple saved party configurations
✅ Accurate CR calculations per DMG rules
✅ Import from current encounter works
✅ Export to encounter with selection works
✅ State persists across browser sessions
✅ Handles missing/deleted creatures gracefully
✅ Updates creature stats on refresh
✅ Clear visual difficulty indicators
✅ Comprehensive warnings and recommendations
✅ APL calculated automatically
✅ CR Calc button properly placed and styled
✅ No conflicts with existing localStorage keys

---

## Notes for Implementation

### Performance Considerations
- Calculator should be fast (<100ms for calculations)
- Avoid unnecessary re-renders
- Cache creature lookups during calculation

### Accessibility
- Keyboard navigation for all controls
- ARIA labels for screen readers
- Sufficient color contrast
- Focus indicators

### Error Handling
- Graceful degradation if localStorage unavailable
- Handle malformed party configurations
- Validate all user inputs
- Clear error messages

### Future Enhancements (Out of Scope)
- Support for multiple simultaneous encounters
- XP budget tool (plan encounters by XP target)
- Encounter balancing suggestions
- Historical encounter tracking
- Custom multiplier rules

---

**End of Specification Document**

This document contains all information needed to implement the Challenge Rating Calculator feature. Review this document thoroughly before beginning implementation, and ask clarifying questions if any requirements are unclear.
