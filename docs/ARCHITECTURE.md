# Architecture Documentation

## System Overview

The D&D Encounter Manager follows a modular, event-driven architecture designed for maintainability and scalability. The system was refactored from a monolithic 6,873-line event handler into focused, decoupled modules.

## Core Architecture Principles

### 1. Modular Design
- **Separation of Concerns**: Each module handles a specific domain
- **Loose Coupling**: Modules communicate through well-defined interfaces
- **High Cohesion**: Related functionality grouped together

### 2. Event-Driven Architecture
- **Central Event Coordination**: EventCoordinator dispatches events to appropriate handlers
- **Reactive State Management**: StateManager provides reactive updates
- **DOM Event Delegation**: Single event listener with action-based routing

### 3. Service Layer Pattern
- **Business Logic Isolation**: Core operations isolated in services
- **Data Access Abstraction**: Storage operations through service layer
- **Validation Centralization**: Input validation handled by validation service

## Module Structure

```
src/
├── main.js                 # Application bootstrap
├── scripts/
│   ├── events/            # Event handling modules
│   │   ├── index.js       # EventCoordinator (central dispatch)
│   │   ├── tooltip-events.js    # Tooltips & batch operation hints
│   │   ├── hp-events.js   # Health point modifications
│   │   ├── combatant-events.js  # Batch selection & status
│   │   ├── modal-events.js      # Modal dialogs & forms
│   │   ├── combat-events.js     # Turn progression & initiative
│   │   └── keyboard-events.js   # Shortcuts & input utilities
│   ├── services/          # Business logic services
│   │   ├── index.js       # Services registry
│   │   ├── combatant-service.js  # CRUD operations
│   │   ├── combat-service.js     # Combat flow management
│   │   ├── storage-service.js    # Data persistence
│   │   ├── validation-service.js # Input validation
│   │   └── calculation-service.js # Game calculations
│   ├── state/             # State management
│   │   ├── index.js       # State exports
│   │   ├── combatant-state.js    # Individual combatant logic
│   │   ├── combat-state.js       # Combat session state
│   │   ├── ui-state.js           # UI state management
│   │   └── persistent-state.js   # localStorage persistence
│   ├── app-core.js        # Application initialization
│   ├── state-manager.js   # Central state coordination
│   └── data-services.js   # Legacy compatibility layer
├── components/            # Reusable UI components
│   ├── combatant-card/    # Combatant display logic
│   │   ├── CombatantManager.js   # Multi-combatant management
│   │   └── CombatantCard.js      # Individual card rendering
│   ├── modals/           # Modal dialog system
│   │   └── ModalSystem.js        # Modal lifecycle management
│   └── toast/            # Notification system
│       └── ToastSystem.js        # Toast notifications
└── styles/               # CSS organization
```

## Event Flow Architecture

### 1. Event Registration
```javascript
// Single delegated listener in EventCoordinator
document.addEventListener('click', this.handleDocumentClick.bind(this));

// Action-based routing
<button data-action="damage" data-target="combatant-123">Damage</button>
```

### 2. Event Dispatch
```javascript
// EventCoordinator.handleAction()
switch (action) {
    case 'damage':
        HPEvents.handleDamage(target, event);
        break;
    case 'next-turn':
        CombatEvents.handleNextTurn();
        break;
}
```

### 3. State Updates
```javascript
// Events trigger state changes
StateManager.updateCombatant(id, property, value);

// State changes trigger UI updates
StateManager.subscribe('combatants', this.renderCombatants);
```

## Service Layer Design

### CombatantService
- **Purpose**: CRUD operations for combatant management
- **Responsibilities**: Create, read, update, delete combatants
- **Key Methods**: `createCombatant()`, `updateCombatant()`, `removeCombatant()`

### CombatService
- **Purpose**: Combat flow and turn management
- **Responsibilities**: Initiative tracking, turn progression, combat state
- **Key Methods**: `startCombat()`, `nextTurn()`, `endCombat()`

### StorageService
- **Purpose**: Data persistence and retrieval
- **Responsibilities**: localStorage management, data serialization
- **Key Methods**: `saveEncounter()`, `loadEncounter()`, `exportData()`

### ValidationService
- **Purpose**: Input validation and data integrity
- **Responsibilities**: Validate user inputs, ensure data consistency
- **Key Methods**: `validateCombatant()`, `validateHP()`, `validateInitiative()`

### CalculationService
- **Purpose**: Game mechanics calculations
- **Responsibilities**: HP calculations, damage resolution, effect processing
- **Key Methods**: `applyDamage()`, `applyHealing()`, `calculateEffectiveHP()`

## State Management Architecture

### StateManager (Central Hub)
```javascript
class StateManager {
    static state = {
        combatants: [],     // Active combatants
        combat: {},         // Combat session state
        ui: {},            // UI state (modals, selections)
        persistent: {}     // Saved data references
    };

    static subscribers = new Map(); // Reactive subscriptions
}
```

### State Modules

#### CombatantState
- **Purpose**: Individual combatant data structure and operations
- **Data**: HP, AC, initiative, conditions, effects, status
- **Operations**: Create, validate, update individual combatants

#### CombatState
- **Purpose**: Overall combat session management
- **Data**: Current turn, round number, combat status
- **Operations**: Initiative sorting, turn progression, combat lifecycle

#### UIState
- **Purpose**: User interface state management
- **Data**: Active modals, selected combatants, form states
- **Operations**: Modal lifecycle, batch selection, UI synchronization

#### PersistentState
- **Purpose**: localStorage integration and data persistence
- **Data**: Saved encounters, preferences, recent data
- **Operations**: Auto-save, data export/import, cleanup

## Component Architecture

### CombatantCard (Individual Rendering)
```javascript
class CombatantCard {
    constructor(instanceData) {
        this.id = instanceData.id;
        this.element = null;        // DOM element
        this.templateCache = null;  // Rendered template cache
    }

    render() { /* Template rendering */ }
    update() { /* Reactive updates */ }
    destroy() { /* Cleanup */ }
}
```

### CombatantManager (Collection Management)
```javascript
class CombatantManager {
    constructor() {
        this.combatants = new Map();     // CombatantCard instances
        this.pendingUpdates = new Set(); // Batch DOM updates
        this.container = null;           // DOM container
    }

    addCombatant() { /* Instance creation */ }
    removeCombatant() { /* Instance destruction */ }
    renderAll() { /* Batch rendering */ }
}
```

## Data Flow Patterns

### 1. User Action → Event → State → UI
```
User clicks "Damage" button
↓
EventCoordinator.handleAction('damage')
↓
HPEvents.handleDamage()
↓
StateManager.updateCombatant()
↓
CombatantCard.update() (via subscription)
```

### 2. Batch Operations
```
User selects multiple combatants
↓
CombatantEvents.handleBatchSelect()
↓
UIState.setSelectedCombatants()
↓
BatchModal.show() with selected targets
↓
HPEvents.handleBatchHPModification()
↓
StateManager.updateMultipleCombatants()
```

### 3. Persistence
```
StateManager.updateCombatant()
↓
PersistentState.autoSave() (debounced)
↓
StorageService.saveEncounter()
↓
localStorage.setItem()
```

## Performance Optimizations

### 1. Efficient Rendering
- **Template Caching**: Pre-compiled templates stored per combatant
- **Batch DOM Updates**: Multiple changes batched into single DOM operation
- **Virtual Scrolling**: For 50+ combatants (planned)

### 2. Memory Management
- **Instance Cleanup**: Proper destruction of CombatantCard instances
- **Event Listener Cleanup**: Remove listeners on component destruction
- **Storage Cleanup**: Automatic cleanup of old localStorage data

### 3. State Updates
- **Reactive Subscriptions**: Only update components that need changes
- **Debounced Operations**: Auto-save and expensive calculations debounced
- **Efficient Selectors**: Minimize DOM queries through caching

## Security Considerations

### 1. Input Validation
- **Client-side Validation**: All user inputs validated before processing
- **Type Checking**: Strict type validation for numeric inputs
- **XSS Prevention**: All user content escaped before DOM insertion

### 2. Data Integrity
- **State Validation**: Combatant state validated on every update
- **Range Checking**: HP, AC, initiative within valid ranges
- **Consistency Checks**: Combat state consistency maintained

## Error Handling Strategy

### 1. Graceful Degradation
```javascript
try {
    await CombatantService.createCombatant(data);
} catch (error) {
    ToastSystem.showError(`Failed to create combatant: ${error.message}`);
    console.error('Combatant creation failed:', error);
    // Application continues functioning
}
```

### 2. Error Boundaries
- **Service Layer**: Each service handles its own errors
- **UI Components**: Components handle rendering errors gracefully
- **State Management**: State corruption prevented through validation

### 3. User Feedback
- **Toast Notifications**: Immediate feedback for user actions
- **Console Logging**: Detailed error information for debugging
- **Fallback UI**: Alternative UI when primary features fail

## Extension Points

### 1. Adding New Event Types
```javascript
// 1. Add handler to appropriate events module
class NewFeatureEvents {
    static handleNewAction(target, event) {
        // Implementation
    }
}

// 2. Register in EventCoordinator
case 'new-action':
    NewFeatureEvents.handleNewAction(target, event);
    break;
```

### 2. Adding New Services
```javascript
// 1. Create service class
class NewService {
    static async newOperation() {
        // Implementation
    }
}

// 2. Register in Services index
export { NewService };
```

### 3. Adding New State Modules
```javascript
// 1. Create state module
class NewState {
    static getInitialState() {
        return { /* initial state */ };
    }
}

// 2. Integrate with StateManager
StateManager.registerStateModule('newState', NewState);
```

## Development Workflow

### 1. Local Development
```bash
npm run dev  # Vite dev server with HMR
```

### 2. Code Organization
- **File Size Limit**: Keep modules under 500 lines
- **Single Responsibility**: One concern per module
- **Clear Naming**: Descriptive function and variable names

### 3. Testing Strategy
- **Manual Testing**: Comprehensive UI testing during development
- **Error Scenarios**: Test error conditions and edge cases
- **Cross-browser Testing**: Verify functionality across browsers

## Future Architecture Considerations

### 1. Scaling to Larger Applications
- **Module Federation**: Consider micro-frontend architecture
- **State Management**: Evaluate dedicated state management libraries
- **Testing Framework**: Implement automated testing

### 2. Performance Enhancements
- **Web Workers**: Move calculations to background threads
- **Service Workers**: Offline functionality and caching
- **Progressive Web App**: Mobile app-like experience

### 3. Feature Additions
- **Plugin System**: Allow third-party feature extensions
- **Theme System**: Customizable UI themes
- **Multi-user Support**: Real-time collaboration features