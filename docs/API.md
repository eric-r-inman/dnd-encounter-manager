# API Reference Documentation

## Overview

This document provides comprehensive API documentation for the D&D Encounter Manager's core services, state management, and event systems.

## Service Layer APIs

### CombatantService

Handles all combatant-related CRUD operations and status management.

#### Static Methods

##### `createCombatant(combatantData)`
Creates a new combatant and adds it to the current encounter.

**Parameters:**
- `combatantData` (Object): Initial combatant data
  - `name` (string): Combatant name
  - `type` (string): 'player', 'enemy', or 'npc'
  - `initiative` (number): Initiative value
  - `ac` (number): Armor class
  - `maxHP` (number): Maximum hit points
  - `currentHP` (number): Current hit points (optional, defaults to maxHP)

**Returns:** `Promise<string>` - New combatant ID

**Throws:** `Error` - If validation fails or creation fails

**Example:**
```javascript
const combatantId = await CombatantService.createCombatant({
    name: "Orc Warrior",
    type: "enemy",
    initiative: 12,
    ac: 13,
    maxHP: 15,
    currentHP: 15
});
```

##### `getCombatant(combatantId)`
Retrieves a combatant by ID.

**Parameters:**
- `combatantId` (string): Combatant ID

**Returns:** `Object|null` - Combatant data or null if not found

##### `getAllCombatants()`
Gets all combatants in the current encounter.

**Returns:** `Array` - Array of all combatants

##### `getCombatantsByType(type)`
Filters combatants by type.

**Parameters:**
- `type` (string): 'player', 'enemy', or 'npc'

**Returns:** `Array` - Filtered combatants

##### `updateCombatant(combatantId, property, value)`
Updates a single combatant property.

**Parameters:**
- `combatantId` (string): Combatant ID
- `property` (string): Property path to update
- `value` (any): New value

**Returns:** `Promise<boolean>` - Success status

**Example:**
```javascript
await CombatantService.updateCombatant("combatant-123", "currentHP", 10);
```

##### `removeCombatant(combatantId)`
Removes a combatant from the encounter.

**Parameters:**
- `combatantId` (string): Combatant ID

**Returns:** `Promise<boolean>` - Success status

##### `addCondition(combatantId, condition)`
Adds a condition to a combatant.

**Parameters:**
- `combatantId` (string): Combatant ID
- `condition` (Object): Condition data
  - `name` (string): Condition name
  - `duration` (number): Duration in rounds (-1 for infinite)
  - `notes` (string): Optional notes

**Returns:** `Promise<boolean>` - Success status

### CombatService

Manages combat flow, turn progression, and initiative tracking.

#### Static Methods

##### `startCombat()`
Initiates combat with current combatants.

**Returns:** `Promise<boolean>` - Success status

##### `nextTurn()`
Advances to the next combatant's turn.

**Returns:** `Promise<Object>` - New active combatant

##### `previousTurn()`
Returns to the previous combatant's turn.

**Returns:** `Promise<Object>` - New active combatant

##### `endCombat()`
Ends the current combat session.

**Returns:** `Promise<boolean>` - Success status

##### `resetCombat()`
Resets combat to initial state.

**Returns:** `Promise<boolean>` - Success status

##### `getCombatStats()`
Gets current combat statistics.

**Returns:** `Object` - Combat statistics
- `isActive` (boolean): Whether combat is active
- `currentRound` (number): Current round number
- `currentTurn` (number): Current turn index
- `activeCombatantId` (string): ID of active combatant

### StorageService

Handles data persistence and retrieval operations.

#### Static Methods

##### `saveEncounter(name, data)`
Saves an encounter to storage.

**Parameters:**
- `name` (string): Encounter name
- `data` (Object): Encounter data

**Returns:** `Promise<string>` - Encounter ID

##### `loadEncounter(encounterId)`
Loads an encounter from storage.

**Parameters:**
- `encounterId` (string): Encounter ID

**Returns:** `Promise<Object>` - Encounter data

##### `getEncounters()`
Gets all saved encounters.

**Returns:** `Promise<Object>` - Map of encounter ID to encounter data

##### `deleteEncounter(encounterId)`
Deletes an encounter from storage.

**Parameters:**
- `encounterId` (string): Encounter ID

**Returns:** `Promise<boolean>` - Success status

##### `exportAllData()`
Exports all application data for backup.

**Returns:** `Promise<Object>` - All exportable data

##### `importAllData(data, overwrite)`
Imports data from backup.

**Parameters:**
- `data` (Object): Data to import
- `overwrite` (boolean): Whether to overwrite existing data

**Returns:** `Promise<boolean>` - Success status

### ValidationService

Provides input validation and data integrity checks.

#### Static Methods

##### `validateCombatant(combatantData)`
Validates combatant data structure.

**Parameters:**
- `combatantData` (Object): Combatant data to validate

**Returns:** `Object` - Validation result
- `isValid` (boolean): Whether data is valid
- `errors` (Array): Array of error messages

##### `validateHP(currentHP, maxHP, tempHP)`
Validates HP values.

**Parameters:**
- `currentHP` (number): Current hit points
- `maxHP` (number): Maximum hit points
- `tempHP` (number): Temporary hit points

**Returns:** `Object` - Validation result

##### `validateInitiative(initiative)`
Validates initiative value.

**Parameters:**
- `initiative` (number): Initiative value

**Returns:** `Object` - Validation result

### CalculationService

Handles game mechanics calculations.

#### Static Methods

##### `applyDamage(combatant, damage)`
Calculates damage application with temp HP.

**Parameters:**
- `combatant` (Object): Combatant data
- `damage` (number): Damage amount

**Returns:** `Object` - Updated HP values
- `currentHP` (number): New current HP
- `tempHP` (number): New temporary HP
- `actualDamage` (number): Actual damage taken

##### `applyHealing(combatant, healing)`
Calculates healing application with max HP cap.

**Parameters:**
- `combatant` (Object): Combatant data
- `healing` (number): Healing amount

**Returns:** `Object` - Updated HP values
- `currentHP` (number): New current HP
- `actualHealing` (number): Actual healing received

##### `getEffectiveHP(combatant)`
Calculates total effective hit points.

**Parameters:**
- `combatant` (Object): Combatant data

**Returns:** `number` - Total effective HP (current + temp)

##### `getHealthState(combatant)`
Determines combatant health state.

**Parameters:**
- `combatant` (Object): Combatant data

**Returns:** `string` - Health state ('healthy', 'bloodied', 'unconscious', 'dead')

## State Management APIs

### StateManager

Central state coordination and reactive updates.

#### Static Properties

##### `state`
Current application state object.

**Structure:**
```javascript
{
    combatants: [],     // Array of combatant objects
    combat: {},         // Combat session state
    ui: {},            // UI state
    persistent: {}     // Persistent data references
}
```

#### Static Methods

##### `updateCombatant(id, property, value)`
Updates a combatant property and triggers reactive updates.

**Parameters:**
- `id` (string): Combatant ID
- `property` (string): Property path (supports nested paths with dots)
- `value` (any): New value

**Example:**
```javascript
StateManager.updateCombatant("combatant-123", "currentHP", 10);
StateManager.updateCombatant("combatant-123", "status.concentration", true);
```

##### `addCombatant(combatantData)`
Adds a new combatant to state.

**Parameters:**
- `combatantData` (Object): Combatant data

**Returns:** `string` - New combatant ID

##### `removeCombatant(id)`
Removes a combatant from state.

**Parameters:**
- `id` (string): Combatant ID

##### `getStateSlice(path)`
Gets a slice of the state.

**Parameters:**
- `path` (string): State path (e.g., 'combatants', 'combat.isActive')

**Returns:** `any` - State value at path

##### `subscribe(path, callback)`
Subscribes to state changes.

**Parameters:**
- `path` (string): State path to watch
- `callback` (Function): Callback function to execute on changes

**Returns:** `Function` - Unsubscribe function

**Example:**
```javascript
const unsubscribe = StateManager.subscribe('combatants', (newCombatants) => {
    console.log('Combatants updated:', newCombatants);
});

// Later...
unsubscribe();
```

### State Modules

#### CombatantState

Static methods for individual combatant operations.

##### `createCombatant(data)`
Creates a new combatant with defaults.

##### `validateCombatant(combatant)`
Validates combatant data structure.

##### `addCondition(combatant, condition)`
Adds a condition to combatant.

##### `removeCondition(combatant, conditionName)`
Removes a condition from combatant.

##### `compareInitiative(a, b)`
Compares two combatants for initiative sorting.

#### CombatState

Static methods for combat session management.

##### `getInitialState()`
Returns initial combat state.

##### `sortByInitiative(combatants)`
Sorts combatants by initiative.

##### `getNextCombatant(combatants, currentId)`
Gets the next combatant in turn order.

## Event System APIs

### EventCoordinator

Central event dispatch and coordination.

#### Static Methods

##### `handleAction(action, target, event)`
Handles delegated DOM events.

**Parameters:**
- `action` (string): Action type from data-action attribute
- `target` (Element): Target DOM element
- `event` (Event): Original DOM event

##### `getSelectedCombatants()`
Gets currently selected combatants for batch operations.

**Returns:** `Array` - Array of selected combatant objects

##### `clearSelection()`
Clears current combatant selection.

### Event Modules

#### HPEvents

Health point modification events.

##### `handleDamage(target, event)`
Handles damage application to combatant.

##### `handleHealing(target, event)`
Handles healing application to combatant.

##### `handleTempHP(target, event)`
Handles temporary HP assignment.

##### `handleBatchHPModification(target)`
Handles batch HP operations on multiple combatants.

#### CombatEvents

Combat flow and turn management events.

##### `handleNextTurn()`
Advances to next turn.

##### `handlePreviousTurn()`
Returns to previous turn.

##### `handleStartCombat()`
Initiates combat.

##### `handleEndCombat()`
Ends combat session.

#### CombatantEvents

Combatant selection and status events.

##### `handleCombatantSelect(target, event)`
Handles combatant selection for batch operations.

##### `handleToggleStatus(target, event)`
Toggles combatant status flags.

##### `handleInitiativeChange(target, event)`
Handles initiative value changes.

## Component APIs

### CombatantCard

Individual combatant rendering and interaction.

#### Constructor

```javascript
new CombatantCard(instanceData)
```

**Parameters:**
- `instanceData` (Object): Combatant data for this card

#### Instance Methods

##### `render()`
Renders the combatant card to DOM.

**Returns:** `HTMLElement` - Rendered card element

##### `update(newData)`
Updates card with new combatant data.

**Parameters:**
- `newData` (Object): Updated combatant data

##### `destroy()`
Destroys the card and cleans up resources.

##### `getInstanceData()`
Gets current instance data.

**Returns:** `Object` - Current combatant data

### CombatantManager

Manages multiple CombatantCard instances.

#### Constructor

```javascript
new CombatantManager()
```

#### Instance Methods

##### `init(containerElement)`
Initializes the manager with a DOM container.

**Parameters:**
- `containerElement` (HTMLElement): Container for combatant cards

##### `addCombatant(combatantData)`
Adds a new combatant card.

**Parameters:**
- `combatantData` (Object): Combatant data

**Returns:** `CombatantCard` - New card instance

##### `removeCombatant(combatantId)`
Removes a combatant card.

**Parameters:**
- `combatantId` (string): Combatant ID

##### `updateCombatant(combatantId, newData)`
Updates a combatant card.

**Parameters:**
- `combatantId` (string): Combatant ID
- `newData` (Object): Updated data

##### `renderAll()`
Renders all combatant cards.

### ToastSystem

User notification system.

#### Static Methods

##### `show(message, type, duration)`
Shows a toast notification.

**Parameters:**
- `message` (string): Notification message
- `type` (string): 'success', 'error', 'info', 'warning'
- `duration` (number): Display duration in milliseconds

##### `showError(message)`
Shows an error toast.

##### `showSuccess(message)`
Shows a success toast.

##### `showInfo(message)`
Shows an info toast.

### ModalSystem

Modal dialog management.

#### Static Methods

##### `show(modalId, data)`
Shows a modal dialog.

**Parameters:**
- `modalId` (string): Modal identifier
- `data` (Object): Data to pass to modal

##### `hide(modalId)`
Hides a modal dialog.

**Parameters:**
- `modalId` (string): Modal identifier

##### `hideAll()`
Hides all open modals.

## Error Handling

### Error Types

#### ValidationError
Thrown when input validation fails.

```javascript
try {
    await CombatantService.createCombatant(invalidData);
} catch (error) {
    if (error instanceof ValidationError) {
        // Handle validation error
    }
}
```

#### StorageError
Thrown when storage operations fail.

#### CalculationError
Thrown when game calculations fail.

### Error Response Format

All service methods return consistent error information:

```javascript
{
    message: "Human-readable error message",
    code: "ERROR_CODE",
    details: { /* Additional error details */ }
}
```

## Usage Examples

### Complete Combatant Workflow

```javascript
// Create a new combatant
const combatantId = await CombatantService.createCombatant({
    name: "Fire Elemental",
    type: "enemy",
    initiative: 15,
    ac: 13,
    maxHP: 102
});

// Add a condition
await CombatantService.addCondition(combatantId, {
    name: "Burning",
    duration: 3,
    notes: "Take 1d6 fire damage at start of turn"
});

// Apply damage
const damageResult = CalculationService.applyDamage(
    CombatantService.getCombatant(combatantId),
    25
);

await CombatantService.updateCombatant(
    combatantId,
    "currentHP",
    damageResult.currentHP
);
```

### Combat Flow Example

```javascript
// Start combat
await CombatService.startCombat();

// Progress through turns
while (CombatService.getCombatStats().isActive) {
    const activeCombatant = await CombatService.nextTurn();
    console.log(`${activeCombatant.name}'s turn`);

    // Handle turn actions...

    if (combatEnded) {
        await CombatService.endCombat();
        break;
    }
}
```

### Reactive State Updates

```javascript
// Subscribe to combatant changes
const unsubscribe = StateManager.subscribe('combatants', (combatants) => {
    // Update UI when combatants change
    updateCombatantDisplay(combatants);
});

// Update a combatant (triggers subscription)
StateManager.updateCombatant("combatant-123", "currentHP", 50);

// Clean up subscription
unsubscribe();
```