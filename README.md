# D&D Encounter Manager

A browser-based D&D 5e Encounter Manager for tracking combat initiative, HP, conditions, and effects. Built with vanilla JavaScript and a modular architecture for easy maintenance and development.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-yellow.svg)

## ✨ Features

### 🎲 Combat Management
- **Initiative Tracking**: Automatic turn order with visual indicators
- **Round Counter**: Track combat rounds and turn progression
- **Active Combatant**: Clear highlighting of whose turn it is
- **Dice Roller**: Integrated dice rolling window with history and advantage/disadvantage
- **Clickable Dice Notation**: Click any dice notation in stat blocks to auto-roll

### ⚔️ Combatant Management
- **Add Combatants**: Players, enemies, and NPCs with custom stats
- **HP Tracking**: Current HP, max HP, temporary HP with damage calculations
- **Health States**: Bloodied, unconscious, and death indicators
- **Status Effects**: Concentration, hiding, cover, surprised, and flying states
- **Initiative Editing**: Inline editing of initiative and AC values

### 🩹 Health & Damage System
- **Damage Application**: Smart damage calculation (temp HP first, then current HP)
- **Healing**: Restore HP up to maximum with overflow prevention
- **Temporary HP**: Non-stacking temporary hit points
- **Batch Operations**: Apply damage/healing to multiple combatants
- **HP History**: Track all damage and healing with round numbers

### 🎭 Conditions & Effects
- **D&D 5e Conditions**: Full library with rule descriptions and tooltips
- **Custom Effects**: Add spell effects, abilities, and custom statuses
- **Duration Tracking**: Automatic countdown with manual override
- **Batch Application**: Apply conditions/effects to multiple targets
- **Visual Indicators**: Clear badges with duration counters

### 📚 Creature Compendium
- **Unified Database**: Single working database with localStorage persistence
- **Import/Export**: Save and load creature databases as JSON files
- **Stat Block Parser**: Paste D&D stat blocks to auto-import creatures
- **Quick View**: View active combatant's stat block instantly
- **Search & Filter**: Search by name, type, or CR; filter by creature type
- **Custom Creatures**: Create and edit creatures with full stat blocks
- **Database Management**: Export, import, and reset to base database

### 💾 Data Management
- **Encounter Save/Load**: Save encounters to files and load them later
- **Creature Database**: Import/export entire creature databases
- **Auto-save**: Persistent storage across browser sessions
- **File System Integration**: Native OS file dialogs for save/load (modern browsers)

### 🎯 Advanced Features
- **Batch Selection**: Multi-select combatants for group operations
- **Keyboard Shortcuts**: Quick combat controls
- **Tooltips**: Hover for D&D 5e rule details
- **Responsive Design**: Works on desktop and tablet
- **Modular Architecture**: Clean, maintainable codebase

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ (for development)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd dnd-encounter-manager
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 📖 User Guide

### Adding Combatants
1. Click "Add Combatant" button
2. Enter name, initiative, AC, and HP
3. Select combatant type (Player, Enemy, NPC)
4. Click "Add to Encounter"

### Managing HP
1. Click **Damage**, **Heal**, or **Temp HP** buttons on combatant cards
2. Enter amount in the modal
3. Use batch operations for multiple combatants
4. View HP history for damage tracking

### Applying Conditions
1. Click **Condition** button on combatant card
2. Select from D&D 5e condition list
3. Set duration (rounds or infinite)
4. Add optional notes
5. Apply to single combatant or batch selection

### Combat Flow
1. **Start Combat**: All combatants automatically sorted by initiative
2. **Active Turn**: Current combatant highlighted with green border
3. **Next Turn**: Click "Next Turn" or use keyboard shortcut
4. **End Combat**: Click "Reset Combat" to clear and start fresh

## 🏗️ Architecture

### Modular Design
The application follows a modular architecture for maintainability. A comprehensive refactoring in 2024 successfully extracted a 6,873-line monolithic event handler into focused modules, reducing complexity while maintaining full functionality:

```
src/
├── main.js                 # Application entry point
├── scripts/
│   ├── events/            # Modular event handling system
│   │   ├── index.js       # EventCoordinator (central dispatch)
│   │   ├── tooltip-events.js    # D&D tooltips & batch hints
│   │   ├── hp-events.js         # HP modification & health tracking
│   │   ├── combatant-events.js  # Batch selection & status
│   │   ├── modal-events.js      # Modal handling & forms
│   │   ├── combat-events.js     # Turn progression & initiative
│   │   ├── keyboard-events.js   # Shortcuts & input utilities
│   │   ├── creature-modal-events.js  # Compendium modal handling
│   │   ├── creature-handlers.js      # Creature operations
│   │   ├── form-handlers.js          # Form submission processing
│   │   ├── import-export-handlers.js # Import/export operations
│   │   ├── import-export-events.js   # Encounter save/load
│   │   ├── initiative-events.js      # Initiative editing
│   │   ├── inline-edit-events.js     # Inline value editing
│   │   └── dice-roller-events.js     # Dice roller integration
│   ├── services/          # Business logic services
│   │   ├── creature-service.js      # Creature database management
│   │   ├── calculation-service.js   # HP/damage calculations
│   │   └── storage-service.js       # localStorage utilities
│   ├── parsers/           # Data parsing
│   │   └── stat-block-parser.js     # D&D stat block parsing
│   ├── renderers/         # UI rendering
│   │   ├── stat-block-renderer.js   # Stat block HTML generation
│   │   └── html-utils.js            # HTML utilities
│   ├── utils/             # Utility functions
│   │   ├── dice-link-converter.js   # Clickable dice notation
│   │   ├── dice-parser.js           # Dice notation parsing
│   │   ├── modal-utils.js           # Modal helpers
│   │   ├── validation.js            # Input validation
│   │   └── errors.js                # Error handling
│   ├── state/             # State management
│   │   ├── combat-state.js          # Combat state tracking
│   │   ├── ui-state.js              # UI state management
│   │   └── dice-roller-state.js     # Dice roller state
│   ├── app-core.js        # Core application logic
│   ├── state-manager.js   # Reactive state management
│   ├── data-services.js   # Data layer and persistence
│   └── constants.js       # App-wide constants
├── components/            # Reusable UI components
│   ├── combatant-card/    # Combatant display logic
│   │   ├── CombatantCard.js
│   │   └── CombatantManager.js
│   ├── modals/           # Modal dialog system
│   │   └── ModalSystem.js
│   ├── toast/            # Notification system
│   │   └── ToastSystem.js
│   ├── dice-roller/      # Dice rolling module
│   │   ├── DiceRoller.js
│   │   ├── DiceRollerUI.js
│   │   └── DiceRollerEvents.js
│   └── stat-block/       # Stat block display
└── styles/               # CSS organization
    └── utilities.css     # CSS utility classes
```

### Key Classes

**Event Coordination:**
- **EventCoordinator**: Central event routing and delegation
- **ModalEvents**: Modal handling and form submission processing
- **CombatEvents**: Turn progression, initiative, and combat control
- **CombatantEvents**: Batch operations and combatant status management
- **CreatureModalEvents**: Compendium modal and creature list management
- **FormHandlers**: Form submission processing for all modals
- **KeyboardEvents**: Global shortcuts and input validation utilities

**Services:**
- **CreatureService**: Creature database with save/load functionality
- **CalculationService**: HP, damage, and game mechanic calculations
- **StorageService**: localStorage abstraction and utilities

**UI Components:**
- **CombatantCard**: Individual combatant rendering and logic
- **CombatantManager**: Combatant collection and database management
- **ModalSystem**: Modal display and lifecycle management
- **ToastSystem**: User notifications and feedback
- **DiceRoller**: Integrated dice rolling with history

**Data Processing:**
- **StatBlockParser**: Parse D&D stat block text into structured data
- **DiceParser**: Parse dice notation (e.g., "2d8+3") with damage types
- **StatBlockRenderer**: Generate HTML from creature stat blocks

**State Management:**
- **StateManager**: Reactive state with localStorage persistence
- **CombatState**: Combat-specific state (rounds, active combatant)
- **UIState**: UI state (modals, selections, filters)

## 🛠️ Development

### Code Style
- **ES6+ JavaScript**: Modern syntax with modules
- **JSDoc Documentation**: All public functions documented
- **Consistent Naming**: camelCase for functions, PascalCase for classes
- **File Organization**: Logical grouping under 500 lines per file

### Adding New Features

1. **New Event Handler:**
   ```javascript
   // Add to appropriate events module
   static handleNewFeature(target) {
       // Implementation
   }

   // Register in EventCoordinator
   case 'new-feature':
       this.handleNewFeature(target);
       break;
   ```

2. **New Combatant Property:**
   ```javascript
   // Update CombatantCard.js constructor
   this.newProperty = instanceData.newProperty || defaultValue;

   // Update getInstanceData() method
   newProperty: this.newProperty,
   ```

3. **New D&D Condition:**
   ```javascript
   // Add to tooltip-events.js CONDITION_DETAILS
   'New Condition': {
       effects: [
           { title: "Effect Name", desc: "Description" }
       ]
   }
   ```

### Testing
```bash
# Run development server with hot reload
npm run dev

# Build and test production bundle
npm run build && npm run preview
```

### Common Patterns

**State Updates:**
```javascript
// Update through StateManager for reactivity
StateManager.updateCombatant(id, { currentHP: newHP });
```

**Event Handling:**
```javascript
// Use data-action attributes for event delegation
<button data-action="damage">Damage</button>
```

**Error Handling:**
```javascript
// Consistent error handling with user feedback
try {
    await operation();
} catch (error) {
    ToastSystem.showError(error.message);
    console.error('Operation failed:', error);
}
```

## 🔧 Configuration

### Environment Variables
None required - application runs entirely in browser.

### Browser Storage
- **localStorage**:
  - `dnd-creature-database`: Working creature database
  - `dnd-combatant-instances`: Combatant data and combat state
  - `dnd-hidden-creatures`: Hidden creature IDs
  - State persistence for UI
- **sessionStorage**: Temporary UI state and modal context
- **File System**: Encounter and database exports (JSON files)

### Keyboard Shortcuts
- **Space**: Next turn
- **R**: Reset combat (with confirmation)
- **Ctrl+C**: Clear encounter (with confirmation)
- **Escape**: Close modal/cancel action

## 📚 API Reference

### EventCoordinator
```javascript
// Central event handler registration
EventCoordinator.handleAction(action, target, event)

// Get selected combatants for batch operations
EventCoordinator.getSelectedCombatants()
```

### HPEvents
```javascript
// Apply damage with temp HP calculation
HPEvents.applyDamage(combatant, amount)

// Apply healing with max HP cap
HPEvents.applyHealing(combatant, amount)

// Handle batch HP modifications
HPEvents.handleBatchHPModification(target)
```

### StateManager
```javascript
// Update combatant property reactively
StateManager.updateCombatant(id, property, value)

// Get current combat state
StateManager.state.combat
```

## 🐛 Troubleshooting

### Common Issues

**Combatants not appearing:**
- Check browser console for JavaScript errors
- Verify localStorage isn't full
- Try clearing browser data and refreshing

**HP calculations wrong:**
- Temporary HP is consumed first before current HP
- Healing cannot exceed maximum HP
- Check HP history for calculation trail

**Tooltips not showing:**
- Ensure you're hovering over condition badges
- Check that condition name matches CONDITION_DETAILS
- Verify JavaScript is enabled

**Performance issues:**
- Clear old combat data from localStorage
- Reduce number of combatants in encounter
- Check browser memory usage

### Debug Mode
Open browser console and enable verbose logging:
```javascript
// In browser console
localStorage.setItem('debug', 'true');
location.reload();
```

## 📚 Documentation

### Root Documentation
- **[README.md](README.md)** - This file (project overview)
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Developer guide and common tasks
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and notable changes
- **[BACKUP_INSTRUCTIONS.md](BACKUP_INSTRUCTIONS.md)** - Git workflow and backup strategies

### Detailed Documentation (`docs/` folder)
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System design and module structure
- **[API.md](docs/API.md)** - API reference for services
- **[CODE_EXAMPLES.md](docs/CODE_EXAMPLES.md)** - Practical code examples
- **[TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Production deployment guide
- **[CHALLENGE-CALCULATOR-SPEC.md](docs/CHALLENGE-CALCULATOR-SPEC.md)** - Future feature specification

## 🤝 Contributing

### For New Developers

1. **Setup**: Follow Quick Start instructions above
2. **Explore**: Browse the codebase structure and run the app
3. **Code Style**: Follow existing patterns and JSDoc standards
4. **Small Changes**: Start with tooltip text, condition descriptions
5. **Test Thoroughly**: Verify all functionality before committing

### Making Changes

1. **Create Feature Branch**: `git checkout -b feature/your-feature`
2. **Follow Patterns**: Use existing code as examples
3. **Document Changes**: Update JSDoc and inline comments
4. **Test Everything**: Verify no existing functionality breaks
5. **Commit Frequently**: Small, logical commits with clear messages
6. **Update CHANGELOG.md**: Document your changes

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **D&D 5e Rules**: Wizards of the Coast
- **Icons**: Various open source icon libraries
- **Inspiration**: Digital D&D tools and community feedback

## 📞 Support

- **Troubleshooting**: Check the Troubleshooting section above
- **Code Questions**: Review the Architecture section and explore the codebase
- **Version History**: See [CHANGELOG.md](CHANGELOG.md) for recent changes
- **Bug Reports**: Open an issue with detailed reproduction steps

---

**Happy DMing! 🎲⚔️**