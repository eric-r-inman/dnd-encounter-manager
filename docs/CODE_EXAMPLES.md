# Code Examples - D&D Encounter Manager

This document provides practical code examples for common development tasks in the D&D Encounter Manager application. These examples are designed to help novice developers understand and extend the codebase.

## Table of Contents

1. [Adding a New Button Action](#adding-a-new-button-action)
2. [Adding a New Modal](#adding-a-new-modal)
3. [Adding a New Service Method](#adding-a-new-service-method)
4. [Updating State](#updating-state)
5. [Adding a New Combatant Property](#adding-a-new-combatant-property)
6. [Adding Keyboard Shortcuts](#adding-keyboard-shortcuts)
7. [Adding Tooltips](#adding-tooltips)
8. [Persisting Data to localStorage](#persisting-data-to-localstorage)
9. [Using the Logger](#using-the-logger)
10. [Using Error Handling](#using-error-handling)

---

## Adding a New Button Action

**Scenario**: You want to add a button that shows a summary of the current encounter.

### Step 1: Add the button to HTML

**File**: `src/templates/index.html`

```html
<button class="btn btn-secondary" data-action="show-encounter-summary">
    📊 Show Summary
</button>
```

### Step 2: Add the action handler

**File**: `src/scripts/events/index.js`

```javascript
// In handleAction() method, add a new case
case 'show-encounter-summary':
    this.handleShowEncounterSummary();
    break;

// Add the handler method
static handleShowEncounterSummary() {
    const allCombatants = DataServices.combatantManager.getAllCombatants();

    if (allCombatants.length === 0) {
        ToastSystem.show('No combatants in encounter', 'info', 2000);
        return;
    }

    // Calculate summary stats
    const totalHP = allCombatants.reduce((sum, c) => sum + c.currentHP, 0);
    const maxHP = allCombatants.reduce((sum, c) => sum + c.maxHP, 0);
    const avgAC = Math.round(allCombatants.reduce((sum, c) => sum + c.ac, 0) / allCombatants.length);

    const summary = `
Combatants: ${allCombatants.length}
Total HP: ${totalHP}/${maxHP}
Average AC: ${avgAC}
    `.trim();

    ToastSystem.show(summary, 'info', 5000);
}
```

### Step 3: Test

1. Refresh your browser
2. Click the "Show Summary" button
3. Verify the toast appears with correct information

---

## Adding a New Modal

**Scenario**: You want to add a modal for importing creatures from a JSON file.

### Step 1: Add modal HTML

**File**: `src/templates/index.html`

```html
<div class="modal-overlay" style="display: none;"
     data-modal="import-creatures"
     data-modal-type="form">
    <div class="modal modal-medium">
        <div class="modal-header">
            <h2>📥 Import Creatures</h2>
            <button class="modal-close" data-modal-close>&times;</button>
        </div>
        <div class="modal-body">
            <form data-form-type="import-creatures">
                <div class="form-group">
                    <label for="import-file">Select JSON File:</label>
                    <input type="file"
                           id="import-file"
                           name="importFile"
                           accept=".json"
                           required>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">
                        Import
                    </button>
                    <button type="button" class="btn btn-secondary" data-modal-close>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>
```

### Step 2: Add button to open modal

```html
<button class="btn btn-primary" data-action="open-import-modal">
    📥 Import Creatures
</button>
```

### Step 3: Add action handler

**File**: `src/scripts/events/index.js`

```javascript
case 'open-import-modal':
    ModalSystem.show('import-creatures');
    break;
```

### Step 4: Add form submission handler

**File**: `src/scripts/events/modal-events.js`

```javascript
// In handleFormSubmission() method
case 'import-creatures':
    this.handleImportCreaturesForm(form);
    break;

// Add the handler method
static async handleImportCreaturesForm(form) {
    const formData = new FormData(form);
    const file = formData.get('importFile');

    if (!file) {
        ToastSystem.show('Please select a file', 'warning', 2000);
        return;
    }

    try {
        const text = await file.text();
        const creatures = JSON.parse(text);

        // Validate and import creatures
        let imported = 0;
        for (const creature of creatures) {
            // Add validation here
            if (creature.id && creature.name) {
                // Import creature logic
                imported++;
            }
        }

        ToastSystem.show(`Imported ${imported} creatures`, 'success', 3000);
        ModalSystem.hide('import-creatures');
    } catch (error) {
        ToastSystem.show('Failed to import: ' + error.message, 'error', 4000);
    }
}
```

---

## Adding a New Service Method

**Scenario**: You want to add a method to calculate average damage per round.

### Step 1: Add method to service

**File**: `src/scripts/services/calculation-service.js`

```javascript
/**
 * Calculate average damage per round for a combatant
 * @param {Object} combatant - The combatant
 * @param {number} rounds - Number of rounds to consider
 * @returns {number} Average damage per round
 */
static calculateAverageDPR(combatant, rounds = 3) {
    if (!combatant.damageHistory || combatant.damageHistory.length === 0) {
        return 0;
    }

    // Get last N rounds of damage
    const recentDamage = combatant.damageHistory.slice(-rounds);
    const totalDamage = recentDamage.reduce((sum, dmg) => sum + dmg.amount, 0);

    return Math.round(totalDamage / recentDamage.length);
}
```

### Step 2: Use the method

```javascript
// In any event handler or component
const dpr = Services.calculation.calculateAverageDPR(combatant, 3);
ToastSystem.show(`Average DPR: ${dpr}`, 'info', 2000);
```

---

## Updating State

**Scenario**: You want to update a combatant's property and have the UI update automatically.

### Example 1: Update a simple property

```javascript
import { DataServices } from '../scripts/data-services.js';

// Get the combatant
const combatant = DataServices.combatantManager.getCombatant(combatantId);

// Update the property through the manager
DataServices.combatantManager.updateCombatant(combatantId, 'currentHP', 50);

// The UI will update automatically!
```

### Example 2: Update a nested property

```javascript
// Update a status property
DataServices.combatantManager.updateCombatant(
    combatantId,
    'status.concentration',
    true
);
```

### Example 3: Update an array property

```javascript
// Add a condition
const combatant = DataServices.combatantManager.getCombatant(combatantId);
combatant.conditions.push({
    name: 'Poisoned',
    duration: 3
});

// Trigger update manually for array changes
DataServices.combatantManager.updateCombatant(
    combatantId,
    'conditions',
    combatant.conditions
);
```

---

## Adding a New Combatant Property

**Scenario**: You want to add a "movement speed" property to combatants.

### Step 1: Add property to CombatantCard

**File**: `src/components/combatant-card/CombatantCard.js`

```javascript
// In constructor, add to the properties
this.movementSpeed = instanceData.movementSpeed || creatureData.movementSpeed || 30;
```

### Step 2: Add to instance data export

```javascript
// In getInstanceData() method
movementSpeed: this.movementSpeed,
```

### Step 3: Add to rendering

```javascript
// In render() method, add to the card HTML
<div class="combatant-speed">
    <span class="speed-label">Speed:</span>
    <span class="speed-value">${this.movementSpeed} ft.</span>
</div>
```

### Step 4: Make it editable (optional)

```javascript
// Add inline editing capability
<div class="combatant-speed editable" data-action="edit-speed">
    <span class="speed-label">Speed:</span>
    <span class="speed-value">${this.movementSpeed} ft.</span>
</div>
```

### Step 5: Add to creature database JSON

**File**: `src/data/creatures/creature-database.json`

```json
{
    "id": "goblin",
    "name": "Goblin",
    "type": "enemy",
    "ac": 15,
    "maxHP": 7,
    "movementSpeed": 30,
    ...
}
```

---

## Adding Keyboard Shortcuts

**Scenario**: You want to add a keyboard shortcut (Ctrl+S) to save the encounter.

### File: `src/scripts/events/keyboard-events.js`

```javascript
// In init() method, add to the keydown listener
static init() {
    document.addEventListener('keydown', (event) => {
        // Don't trigger in inputs
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        // Ctrl+S or Cmd+S to save
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            this.handleSaveEncounterShortcut();
        }
    });
}

static handleSaveEncounterShortcut() {
    // Trigger save encounter action
    const trigger = document.createElement('div');
    window.EventCoordinator.handleAction('save-encounter', trigger, new Event('click'));
}
```

---

## Adding Tooltips

**Scenario**: You want to add a tooltip to explain a button's functionality.

### Method 1: Using title attribute (simple)

```html
<button class="btn btn-primary"
        data-action="my-action"
        title="Click to perform this action">
    My Button
</button>
```

### Method 2: Using custom tooltip system

```html
<button class="btn btn-primary"
        data-action="my-action"
        data-tooltip="This button performs a special action"
        data-tooltip-position="top">
    My Button
</button>
```

### Method 3: Programmatically

```javascript
// In your event handler
const button = document.querySelector('[data-action="my-action"]');
TooltipEvents.showTooltip(button, 'This is a helpful tooltip!');
```

---

## Persisting Data to localStorage

**Scenario**: You want to save user preferences.

### Step 1: Save data

```javascript
import { Services } from '../scripts/services/index.js';

// Save preferences
await Services.storage.savePreferences({
    autoSave: true,
    showTooltips: true,
    theme: 'dark'
});
```

### Step 2: Load data

```javascript
// Load preferences
const preferences = await Services.storage.getPreferences();
console.log(preferences.theme); // 'dark'
```

### Step 3: Custom storage

```javascript
// Save custom data
const myData = {
    customSetting: 'value',
    timestamp: Date.now()
};

localStorage.setItem('my-custom-key', JSON.stringify(myData));

// Load custom data
const loaded = JSON.parse(localStorage.getItem('my-custom-key'));
```

---

## Using the Logger

**Scenario**: You want to add logging to track what's happening in your code.

### Import the Logger

```javascript
import { Logger } from '../scripts/utils/logger.js';
```

### Basic logging

```javascript
// Debug (only in development)
Logger.debug('Checking combatant state', { combatantId, status });

// Info
Logger.info('Encounter loaded successfully');

// Warning
Logger.warn('Combatant HP is low', { name: combatant.name, hp: combatant.currentHP });

// Error
Logger.error('Failed to save encounter', error);
```

### Group logging

```javascript
Logger.group('Processing Turn', () => {
    Logger.debug('Current combatant:', activeCombatant.name);
    Logger.debug('Round:', currentRound);
    Logger.debug('Initiative:', activeCombatant.initiative);
});
```

### Performance timing

```javascript
Logger.time('Render Combatants');

// Your rendering code here
renderAllCombatants();

Logger.timeEnd('Render Combatants'); // Logs: "Render Combatants: 15.2ms"
```

### Table logging

```javascript
const combatants = getAllCombatants();
Logger.table(combatants, ['name', 'currentHP', 'maxHP', 'ac']);
```

---

## Using Error Handling

**Scenario**: You want to add robust error handling to your code.

### Import the ErrorHandler

```javascript
import { ErrorHandler, CombatantError, ValidationError } from '../scripts/utils/error-handler.js';
```

### Basic error handling

```javascript
try {
    // Your code that might fail
    await someDangerousOperation();
} catch (error) {
    ErrorHandler.handle(error, 'Operation Context');
}
```

### Using custom error types

```javascript
// Throw a custom error
throw new CombatantError(
    'Combatant not found',
    combatantId,
    'update'
);

// Throw a validation error
throw new ValidationError(
    'HP must be a positive number',
    'currentHP',
    -5
);
```

### Async error handling

```javascript
const result = await ErrorHandler.handleAsync(
    async () => {
        return await DataServices.loadEncounter(encounterId);
    },
    'Load Encounter',
    ErrorHandler.strategies.NOTIFY_USER
);

if (result) {
    // Success!
    console.log('Encounter loaded:', result);
}
```

### Wrapping functions with error handling

```javascript
const safeLoadCreatures = ErrorHandler.wrap(
    loadCreaturesFromDatabase,
    'Load Creatures'
);

// Now this function has automatic error handling
await safeLoadCreatures();
```

### Making safe versions of functions

```javascript
// Create a version that won't crash if it fails
const safeGetCombatant = ErrorHandler.makeSafe(
    (id) => DataServices.combatantManager.getCombatant(id),
    'Get Combatant',
    null // Return null on error
);

const combatant = safeGetCombatant(combatantId);
if (combatant) {
    // Use combatant
}
```

---

## Common Patterns

### Pattern 1: Event Handler Template

```javascript
static handleMyNewFeature(target) {
    // 1. Get necessary data
    const combatantId = target.closest('[data-combatant-id]')
        ?.getAttribute('data-combatant-id');

    if (!combatantId) {
        Logger.warn('No combatant ID found');
        return;
    }

    // 2. Get combatant
    const combatant = DataServices.combatantManager.getCombatant(combatantId);
    if (!combatant) {
        ToastSystem.show('Combatant not found', 'error', 2000);
        return;
    }

    // 3. Perform operation with error handling
    try {
        // Your logic here

        // 4. Update UI
        ToastSystem.show('Operation successful', 'success', 2000);

    } catch (error) {
        ErrorHandler.handle(error, 'My New Feature');
    }
}
```

### Pattern 2: Form Validation

```javascript
static validateMyForm(formData) {
    const errors = [];

    const name = formData.get('name');
    if (!name || name.trim().length === 0) {
        errors.push('Name is required');
    }

    const hp = parseInt(formData.get('hp'));
    if (isNaN(hp) || hp < 1) {
        errors.push('HP must be a positive number');
    }

    if (errors.length > 0) {
        ToastSystem.show(errors.join(', '), 'error', 4000);
        return false;
    }

    return true;
}
```

### Pattern 3: Batch Operations

```javascript
static handleBatchOperation() {
    const selectedCombatants = DataServices.combatantManager
        .getAllCombatants()
        .filter(c => c.isSelected);

    if (selectedCombatants.length === 0) {
        ToastSystem.show('No combatants selected', 'warning', 2000);
        return;
    }

    // Perform operation on each
    selectedCombatants.forEach(combatant => {
        // Your operation here
    });

    ToastSystem.show(
        `Operation applied to ${selectedCombatants.length} combatants`,
        'success',
        2000
    );
}
```

---

## Tips and Best Practices

1. **Always validate input** before processing
2. **Use descriptive variable names** (`combatantId` not `cid`)
3. **Log important operations** for debugging
4. **Handle errors gracefully** - don't let the app crash
5. **Test edge cases** (empty lists, null values, invalid input)
6. **Keep functions small** (< 50 lines when possible)
7. **Use the service layer** for business logic, not event handlers
8. **Document complex logic** with comments
9. **Follow existing patterns** in the codebase
10. **Test thoroughly** after making changes

---

## Getting Help

- Check `docs/ARCHITECTURE.md` for system design
- Check `CODE_OPTIMIZATION_PLAN.md` for development guidelines
- Search existing code for similar implementations
- Use Logger.debug() to trace execution
- Check browser console for errors

---

**Last Updated**: October 31, 2025
**Version**: 1.0.0
