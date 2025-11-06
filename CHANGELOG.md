# Changelog

All notable changes to the D&D Encounter Manager project.

## [2.0.0] - 2025-11-05

### Added
- **Integrated Dice Roller Module**: Standalone dice rolling window
  - Support for all standard D&D dice (d4, d6, d8, d10, d12, d20, d100)
  - Advantage/disadvantage rolls for d20
  - Coin flip feature
  - Roll history with timestamps
  - Re-roll functionality
  - Multiplier and modifier support (±999 range)
  - Cross-window communication with main app
- **Clickable Dice Notation in Stat Blocks**
  - All dice notation (e.g., "2d8+3") automatically converted to clickable links
  - Click to auto-roll in dice roller window
  - Damage type support and color coding
  - Smart deduplication of overlapping dice patterns
- **Creature Database Save/Load System**
  - Unified working database in localStorage
  - Export database to JSON with native OS file picker
  - Import database from JSON files
  - Reset to base database functionality
  - Auto-save on all creature operations
  - File status indicator in Compendium modal
- **Flying Status Toggle**: Added flying indicator for combatants
- **Enhanced Stat Block Display**:
  - Clickable dice notation throughout
  - Improved HTML rendering with proper escaping
  - Better damage type parsing and display

### Changed
- **Creature Storage Architecture**: Complete rewrite from dual-system to unified database
  - Migrated from separate base/custom databases to single working database
  - `CombatantManager` now uses `CreatureService` for all creature operations
  - Removed `'dnd-custom-creatures'` localStorage in favor of `'dnd-creature-database'`
  - All creature CRUD operations now go through `CreatureService`
- **Import/Export System**: Enhanced with native file system integration
  - Modern browsers use File System Access API for better UX
  - Fallback to standard download for older browsers
  - User can choose save location and filename
- **Dice Roller**: Refactored from inline to modular architecture
  - Separated into `DiceRoller.js`, `DiceRollerUI.js`, and `DiceRollerState.js`
  - State management pattern for maintainability
  - PostMessage API for cross-window communication
- **Event System Expansion**: Added new specialized event modules
  - `creature-handlers.js`: Creature operations (search, filter, CRUD)
  - `import-export-handlers.js`: Import/export operations
  - `dice-roller-events.js`: Dice roller integration
  - `initiative-events.js`: Initiative editing
  - `inline-edit-events.js`: Inline value editing

### Fixed
- Hidden creatures list now cleared on database import
- Creature database export now includes all creatures (not just base)
- Creature form submission now properly adds to working database
- Duplicate dice links removed with overlap detection
- First dice roll from stat block now appears in history
- HTML/code no longer appears in stat block text
- Dice roller window properly opens with correct content
- Import count toast now shows accurate creature count

### Breaking Changes
- **localStorage Structure**: Creature storage keys changed
  - Old: `'dnd-custom-creatures'` (deprecated)
  - New: `'dnd-creature-database'` (unified working database)
  - Migration: Creatures in old system should be exported before upgrading
- **Database Format**: Creatures now use unified structure
  - No more `isCustom` flag distinction
  - All creatures in single `creatures` array

### Documentation
- Updated README.md with new features and architecture
- Updated CREATURE-STORAGE-RULES.md with new system details
- Added comprehensive module documentation
- Updated architecture diagrams

## [1.2.0] - 2025-11-03

### Fixed
- Initiative values now display in stat blocks for all creatures
- Initiative fields persist regardless of stat block completeness
- Stat block renderer displays initiative when data exists

## [1.1.0] - 2025-11-02

### Added
- **StatBlockParser Module**: Extracted 583 lines of parsing logic into dedicated module
- Stat block parser now in `src/scripts/parsers/stat-block-parser.js`
- Initiative parsing from Monster Manual stat blocks
- Initiative display in creature stat blocks

### Changed
- EventCoordinator reduced from 1,661 to 1,081 lines (35% reduction)
- Improved modularity following single responsibility principle

### Fixed
- Initiative parsing now supports standalone and inline formats
- Initiative modifier used in Quick Initiative rolls (not just DEX)

## [1.0.0] - 2025-10-31

### Added
- **Quick Initiative Feature**: Roll initiative for selected creatures
  - Shift+click trigger or "Quick" button in inline edit
  - Modal for rolling d20 + initiative modifier
  - Support for single or multiple creature selection
  - Real-time encounter list re-sorting
- **InitiativeEvents Module**: Dedicated module for initiative operations
- **Creature Database**: Search, filter, and CRUD operations
  - Real-time search across creature names, types, and stats
  - Type filter dropdown (All, Players, Enemies, NPCs)
  - Add, Edit, Delete custom creatures
  - Add creatures to encounter from compendium
- **Infrastructure Improvements**:
  - Logger utility with environment-aware logging
  - Centralized error handling with custom error types
  - Comprehensive code examples documentation

### Changed
- **Event System Refactoring**: Split monolithic 6,873-line event handler into 8 focused modules:
  - `events/index.js` - EventCoordinator (531 lines)
  - `events/modal-events.js` - Modal handling (1,000 lines)
  - `events/hp-events.js` - HP modifications (545 lines)
  - `events/combat-events.js` - Combat flow (383 lines)
  - `events/combatant-events.js` - Batch operations (363 lines)
  - `events/tooltip-events.js` - Tooltips (395 lines)
  - `events/keyboard-events.js` - Shortcuts (297 lines)
  - `events/inline-edit-events.js` - Inline editing (159 lines)
- **Service Layer**: Implemented comprehensive service architecture
  - CombatantService, CombatService, StorageService
  - ValidationService, CalculationService
  - Services coordinator with health monitoring
- **State Management**: Modular state system
  - combatant-state.js, combat-state.js, ui-state.js, persistent-state.js

### Fixed
- Eliminated circular dependencies in event modules
- Combat header updates now use proper delegation
- Ongoing damage/healing effects processing
- Duplicate creature creation bug
- Creature highlighting in Compendium

## [0.9.0] - Initial Development

### Added
- Core D&D 5e encounter tracking functionality
- HP tracking with damage/healing
- Conditions and effects system
- Turn progression and initiative tracking
- Batch operations for multiple combatants
- Auto-save with localStorage persistence
- Responsive dark theme UI

---

**Versioning**: This project follows [Semantic Versioning](https://semver.org/).
