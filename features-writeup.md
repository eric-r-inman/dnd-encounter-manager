# D&D Encounter Manager — Complete Feature Writeup

> Context: This document captures every feature, behavior, and design detail of the current application to serve as a reference for a future complete rewrite/port.

---

## Table of Contents

1. [Tech Stack & Architecture](#tech-stack--architecture)
2. [Data Models](#data-models)
3. [Application Layout](#application-layout)
4. [Combatant Card Component](#combatant-card-component)
5. [Combat Flow & Turn Tracking](#combat-flow--turn-tracking)
6. [Creature Management](#creature-management)
7. [HP Tracking & Damage System](#hp-tracking--damage-system)
8. [Conditions System](#conditions-system)
9. [Effects System](#effects-system)
10. [Cover, Concentration, Stealth & Flying](#cover-concentration-stealth--flying)
11. [Death Saving Throws](#death-saving-throws)
12. [Auto-Roll System](#auto-roll-system)
13. [Dice Roller](#dice-roller)
14. [Batch Operations](#batch-operations)
15. [Initiative Order Management](#initiative-order-management)
16. [Encounter Persistence & Auto-Save](#encounter-persistence--auto-save)
17. [Creature Database & Import/Export](#creature-database--importexport)
18. [XP Tracking](#xp-tracking)
19. [Modal System](#modal-system)
20. [Inline Editing](#inline-editing)
21. [Keyboard Shortcuts](#keyboard-shortcuts)
22. [Toast Notifications](#toast-notifications)
23. [Responsive Design](#responsive-design)
24. [Accessibility](#accessibility)
25. [Design System & Theming](#design-system--theming)
26. [Performance Optimizations](#performance-optimizations)
27. [Testing & Build](#testing--build)

---

## Tech Stack & Architecture

- **Backend:** Rust (Axum) HTTP server with REST API
- **Frontend:** Vanilla JavaScript (ES6 modules), no framework
- **Build tools:** Cargo (Rust workspace), Vite 5.0 (frontend)
- **Styling:** Custom CSS with CSS custom properties (design tokens)
- **Testing:** Rust integration tests + Jest 29.7 with Testing Library
- **Data persistence:** Server-side JSON file storage via REST API

### Architecture Pattern

```
User Interaction
  → EventCoordinator (global event delegation via data-action attributes)
    → Event Handler Module (e.g., CombatEvents, HPEvents)
      → Service Layer (CombatService, CombatantService, StorageService, etc.)
        → StateManager (centralized state object)
          → ApiClient (fetch) → Rust Server REST API → JSON files on disk
            → UI Re-render (CombatantCard.render() → DOM)
```

### Directory Structure

```
src/
├── main.js                    # Entry point
├── scripts/
│   ├── app-core.js           # Core app logic
│   ├── constants.js           # Game constants & config
│   ├── data-services.js       # Data layer abstraction
│   ├── state-manager.js       # Centralized state
│   ├── events/                # ~20 event handler modules
│   ├── services/              # Business logic services
│   ├── state/                 # Modular state slices
│   ├── parsers/               # Data parsing utilities
│   ├── renderers/             # HTML rendering functions
│   └── utils/                 # Utility functions
├── components/
│   ├── combatant-card/        # Main combatant UI component
│   ├── modals/                # Modal dialog system
│   ├── dice-roller/           # Standalone dice roller
│   ├── toast/                 # Notification toasts
│   └── stat-block/            # D&D stat block renderer
├── styles/
│   ├── base.css               # Design tokens, variables, resets
│   ├── layout.css             # Grid and layout
│   ├── animations.css         # Keyframe animations
│   └── utilities.css          # Utility classes
└── templates/
    ├── index.html             # Main app shell
    └── modals/                # 18 modal HTML templates
```

### Key Services

| Service | Responsibility |
|---------|---------------|
| **CombatService** | Round/turn management, combat state, advancement logic |
| **CombatantService** | CRUD for combatants, status management, sorting/filtering |
| **CreatureService** | Creature database operations, stat block parsing |
| **StorageService** | localStorage adapter, persistence for all data types |
| **CalculationService** | Damage calcs, saving throw resolution, XP calculations |
| **ValidationService** | Form validation, data constraints, bounds checking |

---

## Data Models

### Creature (database template)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Creature name |
| `type` | enum | `"player"`, `"enemy"`, `"npc"`, `"placeholder"` |
| `ac` | number | Armor Class |
| `maxHP` | number | Maximum hit points |
| `size` | enum | Tiny, Small, Medium, Large, Huge, Gargantuan |
| `race` | string | Creature race |
| `subrace` | string | Creature subrace |
| `alignment` | string | D&D alignment |
| `cr` | string | Challenge Rating (for XP calculations) |
| `description` | string | Flavor text |
| `statBlock` | object | Optional full D&D stat block (abilities, actions, etc.) |

### Combatant Instance (per encounter)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique instance ID |
| `creatureId` | string | Reference to base creature template |
| `name` | string | Display name (overridable from creature) |
| `nameNote` | string | Optional suffix, max 20 chars (e.g., "Leader", "Archer #2") |
| `initiative` | number | Initiative roll result (0–99) |
| `currentHP` | number | Current health |
| `maxHP` | number | Maximum HP (overridable) |
| `tempHP` | number | Temporary hit points |
| `ac` | number | Armor Class (overridable) |
| `orderIndex` | number | Position in visual order |
| `manualOrder` | number | Manual override of initiative order |
| `notes` | string | Free-form user notes |

#### Combatant Status Object

| Field | Type | Description |
|-------|------|-------------|
| `isActive` | boolean | Currently taking their turn |
| `holdAction` | boolean | Holding their action (yellow visual indicator) |
| `concentration` | boolean | Concentrating on a spell/effect |
| `concentrationSpell` | string | Name of the concentration spell |
| `hiding` | boolean | Actively hiding |
| `flying` | boolean | Currently airborne |
| `flyingHeight` | number | Altitude in feet (0–999) |
| `cover` | enum | `"none"`, `"half"`, `"three-quarters"`, `"full"` |
| `surprised` | boolean | Surprised in first round |

#### Combatant Tracking Arrays

| Field | Type | Description |
|-------|------|-------------|
| `conditions[]` | array | Applied conditions with duration metadata |
| `effects[]` | array | Applied custom effects with duration metadata |
| `damageHistory[]` | array | All damage transactions |
| `healHistory[]` | array | All healing transactions |
| `tempHPHistory[]` | array | All temp HP gains |
| `deathSaves[]` | array | Array of 3 booleans (failed saves) |

#### Auto-Roll Configuration

| Field | Type | Description |
|-------|------|-------------|
| `autoRoll.formula` | string | Dice notation (e.g., `"1d20+5"`) |
| `autoRoll.trigger` | enum | `"start"` or `"end"` of turn |
| `autoRoll.rollType` | enum | `"normal"`, `"advantage"`, `"disadvantage"` |
| `autoRoll.lastResult` | number | Result of last auto-roll |

### Condition/Effect Data

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Condition or effect name |
| `duration` | number/string | Remaining turns, or `"infinite"` |
| `expiresAt` | enum | `"start"` or `"end"` of turn for countdown |
| `note` | string | Additional text, max 14 chars |

### Combat State

| Field | Type | Description |
|-------|------|-------------|
| `roundNumber` | number | Current round (starts at 1) |
| `turnCount` | number | Total turns taken in this combat |
| `encounter` | object | Encounter metadata |
| `encounterFileName` | string | Name of loaded encounter file |

---

## Application Layout

### Desktop (>768px): Two-Column Grid

```
┌─────────────────────────────────────────────────────────┐
│  Header (sticky)                                        │
├───────────────────────────────┬─────────────────────────┤
│  Initiative Order (2fr)       │  Sidebar (1fr)          │
│  ┌─────────────────────────┐  │  ┌───────────────────┐  │
│  │ Combatant Card          │  │  │ Encounter Controls│  │
│  │ Combatant Card          │  │  │ - Add Creature    │  │
│  │ Combatant Card          │  │  │ - Save / Load     │  │
│  │ Combatant Card          │  │  │ - Next Turn       │  │
│  │ ... (scrollable)        │  │  │ - Reset / Clear   │  │
│  └─────────────────────────┘  │  │ - Dice Roller     │  │
│                               │  ├───────────────────┤  │
│                               │  │ Compendium        │  │
│                               │  │ Reference Section │  │
│                               │  └───────────────────┘  │
└───────────────────────────────┴─────────────────────────┘
```

### Mobile/Tablet (≤768px): Single Column

Initiative order section stacks above controls. Modals go full-width.

---

## Combatant Card Component

Each combatant in the initiative list is rendered as a card with the following zones:

### Left Sidebar

- **Batch select checkbox** — for multi-select operations
- **Order up/down buttons** (↑ / ↓) — reorder within the initiative list
- **Hold action indicator** — yellow background when holding action

### Header Row

- **Initiative circle** — displays initiative number, click to edit
- **Surprise indicator** — emoji-based (😠 / ✊ / 😲), click to toggle
- **Creature name** — color-coded by type:
  - Green (#39d353) = Player
  - Red (#da3633) = Enemy
  - Yellow (#ffeb3b) = NPC
- **AC display** — click to edit inline
- **Condition badges** — colored pills showing condition name + remaining duration, × to remove
- **Effect badges** — similar to conditions but visually distinct, includes bonus note text

### Body

- **Health Display:**
  - `Current HP / Max HP` text
  - Temp HP shown separately when present
  - Health state icon:
    - Healthy: no icon
    - Bloodied (≤50% HP): 🩸
    - Unconscious (0 HP): 💀
    - Dead (3 failed death saves): 💀
  - Cover level indicator (click to cycle: None → ½ → ¾ → Full)
  - Concentration status (click to toggle)
  - Hiding status (click to toggle)
  - Death save circles (3 circles, appear at 0 HP, click to toggle success/failure)

- **Quick Action Buttons:**
  - **Damage** (red) — opens HP modification modal in damage mode
  - **Heal** (green) — opens HP modification modal in heal mode
  - **Temp HP** (blue) — opens HP modification modal in temp HP mode
  - **Condition** (purple) — opens condition application modal
  - **Effect** (purple) — opens effect application modal

### Right Side Buttons

- **Remove** (×) — red on hover, removes combatant from encounter
- **Set Active** (←) — blue on hover, for placeholder combatants only
- **Duplicate** (🔀) — green on hover, opens duplicate modal

---

## Combat Flow & Turn Tracking

### Starting Combat

1. User adds combatants via "Add Creature" button or `A` key
2. Each combatant gets an initiative value (manually entered)
3. Combatants automatically sort by initiative (highest first)
4. Ties broken alphabetically by name
5. Round counter starts at 1

### Turn Progression

1. User presses `N` key or "Next Turn" button
2. Current active combatant's turn ends:
   - End-of-turn conditions/effects decrement
   - End-of-turn auto-rolls execute
3. Next combatant in initiative order becomes active:
   - Start-of-turn conditions/effects decrement
   - Start-of-turn auto-rolls execute
   - Card highlighted as active (`isActive = true`)
4. When the last combatant's turn ends, round increments and loops back to top

### Combat Controls

| Action | Button | Hotkey | Behavior |
|--------|--------|--------|----------|
| Add Creature | "Add Creature" | `A` | Opens add combatant modal |
| Next Turn | "Next Turn" | `N` | Advances to next combatant |
| Reset Combat | "Reset" | `R` | Clears all status, resets round to 1, preserves combatants |
| Clear Encounter | "Clear" | `C` | Removes all combatants entirely |
| Save Encounter | "Save" | — | Prompts for name, saves full state |
| Load Encounter | "Load" | — | Shows list of saved encounters |
| Dice Roller | "Roll" | — | Opens standalone dice roller window |

---

## Creature Management

### Creature Types

| Type | Color | Purpose |
|------|-------|---------|
| **Player** | Green | Player characters — type is read-only after creation |
| **Enemy** | Red | Hostile creatures |
| **NPC** | Yellow | Non-player characters, neutral parties |
| **Placeholder** | — | Timer-based entries (lair actions, legendary actions, environmental effects) |

### Creating Creatures

- **Creature Type Selection modal** — choose Player, Enemy, NPC, or Placeholder
- **Player Form modal** — name, class, level, ability scores, combat stats (AC, HP)
- **Creature Form modal** — full creature creation with stat block entry
- **Stat Block Parser modal** — paste a D&D 5e stat block as text, parser converts to structured data

### Adding to Encounter

1. "Add Creature" opens the Add Combatant modal
2. Creature dropdown shows all creatures in the database
3. User enters initiative roll
4. Optional: name note (max 20 chars), HP override, starting conditions (Surprised, Hiding)
5. HP percentage quick buttons (100%, 50%, 25%) for fast HP adjustment
6. Combatant appears in initiative order

### Editing Creatures

- **Edit Creature modal** — modify base creature in the database
  - Basic info: name, type, size, race, subrace, alignment, CR, source, description
  - Combat stats: AC, HP, skills
  - Scrollable form (85vh max height)
- **Edit Player modal** — quick-edit subset for player characters in encounter

### Duplicating Combatants

- Click duplicate button (🔀) on any combatant card
- Opens duplicate modal with options for naming and quantity
- Auto-naming prevents name collisions
- Duplicates inherit all properties from source

---

## HP Tracking & Damage System

### HP Display

- Format: `Current HP / Max HP`
- Temp HP shown separately when present (e.g., `+5 temp`)
- Visual health states:
  - **Healthy** (>50% HP): normal display
  - **Bloodied** (≤50% HP): 🩸 icon, yellow/orange indicator
  - **Unconscious** (0 HP): 💀 icon
  - **Dead** (3 failed death saves): 💀 icon, order buttons disabled

### HP Modification Modal

Opened via Damage (red), Heal (green), or Temp HP (blue) buttons.

**Fields:**
- Amount input (0–999)
- Current HP display with full breakdown

**Saving Throw Sub-System:**
- "Roll Save" checkbox enables the saving throw section
- Ability selector: Con, Dex, Str, Wis, Int, Cha
- Modifier input with sign formatting (+0, -2, etc.)
- DC input (1–30)
- Damage reduction on success: 25%, 50%, 75%, or 100%
- System calculates and applies reduced damage if the save succeeds

**HP History:**
- All damage, healing, and temp HP transactions are tracked per combatant
- History displayed in the HP modification modal as a scrollable list
- Each entry shows amount, type, and context

**Batch mode:** "Apply to Selected" button applies the same HP change to all checked combatants.

### Damage Application Rules

- Damage reduces temp HP first, then current HP
- Current HP cannot go below 0
- Healing cannot exceed max HP
- Temp HP does not stack (highest value wins, per D&D 5e rules)

---

## Conditions System

### Supported D&D 5e Conditions (14)

| Category | Conditions |
|----------|-----------|
| Sensory | Blinded, Deafened |
| Mental | Charmed, Frightened |
| Movement | Grappled, Prone, Restrained |
| Physical | Poisoned |
| Advantage | Invisible |
| Action | Incapacitated |
| Severe | Paralyzed, Petrified, Stunned, Unconscious |

### Condition Modal

- **Turn counter** — numeric input for duration in turns
- **Infinity toggle** — sets duration to infinite (no auto-expiry)
- **Condition note** — max 14 chars, appears alongside badge
- **Countdown timing** — "Start of turn" or "End of turn" determines when duration decrements
- **Condition selection** — 14 checkboxes, one per condition
- **Batch apply button** — applies to all selected combatants

### Condition Lifecycle

1. Condition applied → badge appears on combatant card header
2. Badge shows: condition name + remaining duration + optional note
3. Each relevant turn (start or end, per config), duration decrements by 1
4. When duration reaches 0, condition auto-removes
5. Infinite conditions persist until manually removed via × button

---

## Effects System

### How Effects Differ from Conditions

- **Effects** are free-form custom names (not limited to the 14 standard conditions)
- Effect name max: 14 characters
- Effect note max: 14 characters (e.g., "+2 AC", "1d6 fire")
- Recent effects stored in localStorage for autocomplete suggestions
- Visually distinct badge styling from conditions

### Effect Modal

- **Effect name input** — free-form text with autocomplete from recent effects (datalist)
- **Turn counter** — same as conditions
- **Infinity toggle** — same as conditions
- **Effect note** — max 14 chars
- **Countdown timing** — "Start of turn" or "End of turn"
- **Batch apply button** — applies to all selected combatants

### Effect Lifecycle

Same as conditions: apply → badge → decrement per turn → auto-remove at 0 or manual remove.

---

## Cover, Concentration, Stealth & Flying

### Cover

- 4 states: None → Half → Three-Quarters → Full
- Click the cover indicator on a combatant card to cycle through states
- Persists per combatant
- Visual indicator shows current cover level

### Concentration

- Toggle on/off by clicking the concentration indicator
- When active, a free-form field allows entering the spell name
- Displays "Concentrating: [spell name]" or "Not concentrating"

### Hiding/Stealth

- Toggle on/off by clicking the hiding indicator
- Displays "Hiding" or "Not hiding"

### Flying & Height

- Toggle flying status on/off
- When flying, track altitude in feet (0–999, 5-foot increments)
- Provides tactical awareness for 3D combat positioning

---

## Death Saving Throws

- Trigger: combatant reaches 0 HP → becomes unconscious
- **Three circles** appear below HP display
- Click each circle to toggle between success (○) and failure (●)
- **3 failures** → combatant marked as dead:
  - 💀 icon persists
  - Order up/down buttons disabled
  - Card visually muted
- Healing above 0 HP clears death saves and restores consciousness

---

## Auto-Roll System

### Configuration (via Auto-Roll modal)

- **Dice formula** — validated dice notation (e.g., `1d20+5`, `2d6-2`, `3d8`)
- **Roll type** — Normal, Advantage, or Disadvantage (advantage/disadvantage only available for `1d20` formulas)
- **Trigger** — Start of turn or End of turn
- **Batch apply** — configure auto-roll for multiple selected combatants at once

### Execution

- When a combatant's turn starts/ends (matching the trigger), the auto-roll fires automatically
- Result is stored in `autoRoll.lastResult`
- No user interaction required once configured
- Can be cleared/reconfigured at any time

---

## Dice Roller

- **Standalone window** — opens in a separate browser window (no browser chrome)
- Accessible via "Roll" button in encounter controls or `DiceRoller.show()`
- **Rainbow-colored dice buttons:** d4, d6, d8, d10, d12, d20, d100
- **Multiplier input** — roll multiple dice at once
- **Modifier input** — add/subtract from total
- **Roll history** — stores up to 30 recent rolls with timestamps
- **Persistence** — roll history saved to localStorage
- **Window management** — if dice roller window already open, focuses it instead of opening a new one

---

## Batch Operations

### Selection

- Each combatant card has a checkbox in the left sidebar
- Checking multiple combatants enables batch mode in modals

### Supported Batch Operations

| Operation | Modal | Behavior |
|-----------|-------|----------|
| Apply Condition | Condition modal | Same condition(s) applied to all selected |
| Apply Effect | Effect modal | Same effect applied to all selected |
| HP Modification | HP modal | Same damage/heal/temp HP to all selected |
| Auto-Roll Config | Auto-Roll modal | Same auto-roll settings to all selected |

### Batch UI

- "Apply to Selected (N)" button appears in relevant modals when combatants are checked
- Shows count of selected combatants
- Single submission applies the operation to all selected simultaneously

---

## Initiative Order Management

### Sorting Rules (in priority order)

1. **Manual order** — if set via `manualOrder` property (for legendary/lair actions)
2. **Initiative value** — highest first (descending)
3. **Alphabetical** — name-based tiebreaker when initiative values are equal

### Reordering

- **Up/Down buttons** (↑ / ↓) on each combatant card
- **Inline initiative editing** — click the initiative circle to change the value
- Changes immediately resort the list
- Currently active combatant remains highlighted regardless of position changes

### Manual Order Override

- The `manualOrder` field allows inserting entries at specific positions in the initiative order
- Used for legendary actions, lair actions, and other D&D mechanics that interrupt normal initiative flow

---

## Encounter Persistence & Auto-Save

### Auto-Save

- Fires every 5 seconds (`AUTOSAVE_INTERVAL: 5000ms`)
- Saves all combatant instances to localStorage
- Also persists: recent effects for autocomplete, user preferences

### Manual Save

1. Click "Save" button
2. Modal prompts for encounter name
3. Full encounter state serialized and saved to localStorage
4. Includes: all combatants (with full state), combat round/turn info, conditions, effects, HP histories, auto-roll configs

### Manual Load

1. Click "Load" button
2. Modal shows list of previously saved encounters
3. Select an encounter to restore
4. Full state deserialized and applied
5. Encounter filename displayed in header

### localStorage Keys

| Key | Contents |
|-----|----------|
| `dnd-combatant-instances` | Current encounter's combatant data |
| `dnd-creature-database` | Full creature database |
| `dnd-hidden-creatures` | List of hidden/archived creatures |
| `dnd-encounters` | All saved encounter files |
| `recentEffects` | Recent effect names for autocomplete |

---

## Creature Database & Import/Export

### Database Features

- **Browse** — creature database modal with search/filter interface
- **Search/Filter** — filter creatures by name, type, or other properties
- **Quick view** — view stat blocks inline without leaving the database modal
- **Stat block display** — formatted D&D 5e stat block rendering
- **Hidden creatures** — archive/hide creatures from the main list without deleting

### Import/Export

- **Export creature** — download individual creature as JSON file
- **Import creature** — upload JSON creature file, auto-rename on name collision
- **Export database** — export entire creature database as JSON
- **Stat block parser** — paste raw D&D 5e stat block text and convert to structured creature data

---

## XP Tracking

- Click the encounter file info icon (ⓘ) to see XP totals
- **XP Filter dropdown** — filter by party size and party level
- **Difficulty calculation** — shows encounter difficulty rating
- **Adjusted XP per player** — XP divided by party size with CR-based adjustments
- Based on creature Challenge Rating values

---

## Modal System

### Architecture

- **18 modal templates** stored as separate HTML files in `src/templates/modals/`
- **Lazy loading** — modals load on-demand when first requested
- **Modal overlay** with backdrop prevents background interaction
- **Focus trap** — Tab/Shift+Tab cycles within modal
- **ESC to close** — global keyboard handler

### Modal List

| Modal | Purpose |
|-------|---------|
| add-combatant | Add new combatant to encounter |
| condition | Apply D&D conditions |
| effect | Apply custom effects |
| hp-modification | Damage / Heal / Temp HP |
| auto-roll | Configure auto-rolling |
| edit-creature | Edit creature in database |
| creature-database | Browse creature database |
| player-form | Create/edit player character |
| creature-form | Create/edit creature |
| stat-block-parser | Parse pasted stat blocks |
| combatant-note | Add notes to combatant |
| creature-type-selection | Choose creature type on creation |
| edit-player | Quick-edit player in encounter |
| quick-initiative | Rapid initiative entry |
| placeholder-timer | Timer for placeholder combatants |
| duplicate-combatant | Duplicate combatant options |

### Modal Behaviors

- Smooth show/hide animations
- Auto-hide new modals on initial load
- Stacking support (multiple modals can open, but typically one at a time)

---

## Inline Editing

Several fields on combatant cards support click-to-edit:

| Field | Trigger | Validation |
|-------|---------|------------|
| Initiative | Click initiative circle | Number, 0–99 |
| Armor Class | Click AC display | Number, min 0 |
| HP values | Click HP text | Number, min 0, max varies |

### Inline Edit Behavior

1. Click the field → transforms into a number input
2. Input is pre-populated with current value
3. Number validation enforces min/max constraints
4. **Enter** → save and close
5. **Blur** (click away) → save and close
6. **ESC** → cancel edit, revert to original value

---

## Keyboard Shortcuts

| Key | Action | Guard |
|-----|--------|-------|
| `A` | Add Combatant | Blocked when focus is in an input field |
| `N` | Next Turn | Blocked when focus is in an input field |
| `R` | Reset Combat | Blocked when focus is in an input field |
| `C` | Clear Encounter | Blocked when focus is in an input field |
| `ESC` | Close all open modals | Always active |

---

## Toast Notifications

- Provides action feedback (success, error, warning, info)
- Color-coded by type:
  - Success: green
  - Error: red
  - Warning: orange
  - Info: blue
- Auto-dismiss after a configurable duration
- Multiple toasts can stack vertically
- Non-blocking — does not interrupt user workflow

---

## Responsive Design

### Breakpoints

| Breakpoint | Layout |
|------------|--------|
| >768px (desktop) | Two-column grid: initiative list (2fr) + sidebar (1fr) |
| ≤768px (mobile/tablet) | Single column: initiative list (60vh) stacked above controls |

### Sticky Elements

- **Header:** `position: sticky; top: 0; z-index: 20`
- **Section headers:** `position: sticky; top: 0` within their scroll container
- **Sidebar sections:** `position: sticky; top: 20px`

### Scroll Behavior

- Initiative list: scrollable with flex-based layout
- Modal content: `overflow-y: auto` for long forms
- Combat controls: `flex-shrink: 0` for top section (always visible)

### Accessibility Modes

- **High contrast mode:** darker backgrounds, 2px borders, enhanced color contrast
- **Reduced motion:** all animations and transitions disabled via `@media (prefers-reduced-motion: reduce)`

---

## Accessibility

- **Focus trap** in modals (Tab/Shift+Tab cycling)
- **Keyboard navigation** for all core actions
- **Semantic HTML** structure
- **Color-coded indicators** paired with icons/text (not color alone)
- **High contrast mode** support
- **Reduced motion** support

---

## Design System & Theming

### Color Palette

**Backgrounds:**
| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#0d1117` | Page background |
| Secondary | `#161b22` | Card backgrounds |
| Tertiary | `#21262d` | Elevated surfaces |

**Text:**
| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#f0f6fc` | Headings, body text |
| Secondary | `#8b949e` | Labels, descriptions |
| Muted | `#6e7681` | Disabled states, hints |

**Semantic / Type Colors:**
| Token | Value | Usage |
|-------|-------|-------|
| Player | `#39d353` | Player name, badges |
| Enemy | `#da3633` | Enemy name, badges |
| NPC | `#ffeb3b` | NPC name, badges |

**Action Colors:**
| Token | Value | Usage |
|-------|-------|-------|
| Success | `#3fb950` | Heal button, confirmations |
| Danger | `#f85149` | Damage button, deletions |
| Warning | `#f0883e` | Caution states |
| Info/Primary | `#58a6ff` | Links, info badges |
| Purple | `#a371f7` | Condition/effect buttons |

### Spacing Scale

| Token | Value |
|-------|-------|
| XS | `0.25rem` (4px) |
| SM | `0.5rem` (8px) |
| MD | `0.75rem` (12px) |
| LG | `1rem` (16px) |
| XL | `1.5rem` (24px) |
| 2XL | `2rem` (32px) |

### Typography

- **Font stack:** `-apple-system, BlinkMacSystemFont, Segoe UI, ...` (system fonts)
- **Monospace:** `SF Mono, Monaco, Inconsolata, ...`
- **Base size:** `1rem` (16px)
- **Line height:** 1.5
- **Weights used:** 400 (normal), 500 (medium), 600 (semibold), 700 (bold)

### Border Radius

| Token | Value |
|-------|-------|
| Standard | `6px` |
| Large | `8px` |
| XL | `12px` |
| Circle | `50%` |

---

## Performance Optimizations

- **Fragment rendering** — uses `DocumentFragment` for batch DOM inserts (5+ combatants)
- **Conditional re-render** — re-renders based on change percentage, not on every state update
- **GPU acceleration hints** — `will-change`, `backface-visibility: hidden`, `transform: translateZ(0)`
- **Lazy modal loading** — modals loaded on first access, not at startup
- **Separate dice roller window** — offloads dice roller to its own window context
- **Debouncing:**
  - Input auto-save: 500ms
  - Resize handler: 250ms
  - Animation: 300ms

---

## Testing & Build

### Testing

- **Framework:** Jest 29.7 with Testing Library
- **Test types:** Unit tests, integration tests, E2E test framework
- **Helpers:** DOM testing utilities, mock file system, style mock
- **Coverage reporting** available

### Build & Development

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build (optimized, with legacy support) |
| `npm run preview` | Preview production build |
| `npm run serve` | Serve on port 3000 |
| `npm run test` | Run test suite |
| `npm run test:watch` | Test watch mode |
| `npm run test:coverage` | Generate coverage report |

### Version

- **Package version:** 2.0.0

---

## Appendix: Complete Modal Template Files

```
src/templates/modals/
├── add-combatant.html
├── auto-roll.html
├── combatant-note.html
├── condition.html
├── creature-database.html
├── creature-form.html
├── creature-type-selection.html
├── duplicate-combatant.html
├── edit-creature.html
├── edit-player.html
├── effect.html
├── hp-modification.html
├── placeholder-timer.html
├── player-form.html
├── quick-initiative.html
└── stat-block-parser.html
```
