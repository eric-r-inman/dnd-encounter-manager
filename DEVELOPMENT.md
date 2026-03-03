# Development Guide

Guide for developers working on the D&D Encounter Manager.

## D&D 5e Terminology Glossary

**For developers unfamiliar with D&D 5e**, here are the key game terms used in this codebase:

- **AC (Armor Class)**: Defense rating - higher AC = harder to hit (typically 10-20)
- **HP (Hit Points)**: Health/life total - reaches 0 = unconscious or dead
- **Temp HP (Temporary HP)**: Damage buffer that doesn't stack, absorbed before regular HP
- **CR (Challenge Rating)**: Monster difficulty level (CR 1 = challenge for 4 level-1 players)
- **Initiative**: Turn order number - rolled at combat start, higher goes first
- **XP (Experience Points)**: Reward for defeating creatures, based on CR
- **Bloodied**: D&D term for creature at ≤50% HP (visual indicator of health status)
- **Concentration**: Maintaining a spell effect - broken if damaged or lose focus
- **Condition**: Status effect from D&D 5e rules (Stunned, Poisoned, etc.)
- **Effect**: Custom status not in core rules (spell effects, abilities, house rules)
- **Round**: One full turn cycle where everyone acts once (typically 6 seconds in-game)
- **Turn**: One creature's actions within a round
- **Surprised**: First-round status - can't act on your first turn
- **Cover**: Protection bonus to AC (half = +2 AC, three-quarters = +5 AC, full = can't target)
- **Saving Throw**: Die roll to resist effects (STR/DEX/CON/INT/WIS/CHA based)
- **Advantage/Disadvantage**: Roll 2d20, take highest/lowest (common D&D 5e mechanic)
- **Lair Actions**: Special environment actions for powerful creatures in their lair
- **Legendary Actions**: Extra actions for boss monsters between other creatures' turns

## Getting Started

### Prerequisites
- Node.js 16+
- npm 7+
- Modern browser (Chrome, Firefox, Safari, Edge)
- Code editor (VS Code recommended)
- **Optional**: Basic D&D 5e knowledge (see glossary above)

### Setup
```bash
# Clone and install
git clone <repository-url>
cd dnd-encounter-manager
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

## Architecture Overview

### Modular Structure
```
src/
├── main.js                 # Application entry point
├── scripts/
│   ├── events/            # Event handling modules (8 files)
│   │   ├── index.js       # EventCoordinator (central dispatch)
│   │   ├── modal-events.js
│   │   ├── hp-events.js
│   │   ├── combat-events.js
│   │   ├── combatant-events.js
│   │   ├── tooltip-events.js
│   │   ├── keyboard-events.js
│   │   └── inline-edit-events.js
│   ├── parsers/           # Parsing logic
│   │   └── stat-block-parser.js
│   ├── services/          # Business logic (5 services)
│   ├── state/             # State management (4 modules)
│   └── utils/             # Utilities (logger, error-handler)
├── components/            # UI components
├── templates/             # HTML templates
└── styles/               # CSS files
```

### Key Concepts

**1. Action-Based Event Routing**
```html
<!-- HTML button with data-action -->
<button data-action="damage" data-target="combatant-123">Damage</button>
```
```javascript
// EventCoordinator routes to handler
handleAction(action, target, event) {
    switch (action) {
        case 'damage':
            HPEvents.handleDamage(target, event);
            break;
    }
}
```

**2. State Management**
```javascript
// Update state - UI updates automatically
StateManager.updateCombatant(id, 'currentHP', newHP);
```

**3. Service Layer**
```javascript
// Use services for business logic
const result = Services.validation.validateCombatant(data);
```

## Common Tasks

### Adding a Button Action
1. Add button to `templates/index.html`:
```html
<button data-action="my-action">Click Me</button>
```
2. Add handler to `events/index.js`:
```javascript
case 'my-action':
    this.handleMyAction(target);
    break;
```
3. Implement handler function
4. Test in browser

### Adding a Modal
1. Add modal HTML to `templates/index.html`
2. Add setup in `modal-events.js`:
```javascript
handleSpecificModalSetup(modal, additionalData) {
    if (modal.dataset.modal === 'my-modal') {
        // Setup logic
    }
}
```
3. Add form handler:
```javascript
handleFormSubmission(form, formData) {
    if (form.id === 'my-modal-form') {
        // Handle submission
    }
}
```

### Modifying State
1. Update via service (e.g., `CombatantService`)
2. Service calls `StateManager.updateCombatant()`
3. UI updates automatically via subscriptions

### Adding New Creature Property
1. Update data structure in relevant service
2. Update form in `templates/index.html`
3. Update form handler in `modal-events.js`
4. Update display in `components/combatant-card/`

## File Organization

**When you need to...** → **Edit this file...**
- Add button click handler → `events/index.js`
- Handle HP changes → `events/hp-events.js`
- Handle combat turns → `events/combat-events.js`
- Handle modals → `events/modal-events.js`
- Add business logic → `services/[appropriate-service].js`
- Add validation → `services/validation-service.js`
- Save/load data → `services/storage-service.js`
- Change combatant rendering → `components/combatant-card/`
- Change styling → `styles/*.css`

## Best Practices

### DO ✅
- Update state through StateManager
- Use services for business logic
- Use action-based routing for events
- Add JSDoc comments to functions
- Test changes thoroughly
- Keep modules focused and under 1,500 lines

### DON'T ❌
- Directly manipulate DOM for state
- Put business logic in event handlers
- Create multiple event listeners for same element
- Skip validation
- Commit without testing

## Debugging

### Check Event Routing
```javascript
// In EventCoordinator.handleAction()
console.log('Action:', action, target);
```

### Check State
```javascript
// In browser console
window.DnDApp          // App instance
window.DataServices    // Data services
```

### Check Service Health
```javascript
// In browser console
await DataServices.getHealthStatus()
```

## Testing

```bash
# Run dev server with hot reload
npm run dev

# Build production
npm run build

# Preview production build
npm run preview
```

## Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes following patterns above
3. Test thoroughly
4. Commit with clear messages
5. Update CHANGELOG.md
6. Submit pull request

## Common Pitfalls

**Direct DOM Manipulation**
```javascript
// ❌ BAD
element.textContent = newValue;

// ✅ GOOD
StateManager.updateCombatant(id, property, newValue);
```

**Business Logic in Events**
```javascript
// ❌ BAD - logic in event handler
function handleDamage(target) {
    const damage = parseInt(input.value);
    combatant.currentHP -= damage;
    if (combatant.currentHP < 0) combatant.currentHP = 0;
}

// ✅ GOOD - use service
function handleDamage(target) {
    const damage = parseInt(input.value);
    Services.calculation.applyDamage(combatantId, damage);
}
```

## Useful Resources

- **README.md** - Project overview and features
- **CHANGELOG.md** - Version history
- **BACKUP_INSTRUCTIONS.md** - Git workflow
- **docs/CODE_EXAMPLES.md** - Practical code examples
- **docs/ARCHITECTURE.md** - System architecture details
- **docs/API.md** - API reference
- **docs/TROUBLESHOOTING.md** - Common issues

## Support

- Check browser console for errors
- Check dev server console for build errors
- Review existing code for patterns
- Test incremental changes frequently

---

## Performance Optimization

### Current Performance Status

**Bundle Size:**
- Main Bundle: 333.02 KB (76.54 KB gzipped)
- Contains: All event handlers, services, and components

**Optimizations Implemented:**

1. **CombatantManager Rendering**
   - Batch DOM updates with `requestAnimationFrame`
   - Document fragments for single DOM insertion
   - 30% threshold: Renders all if >30% need updates
   - Smart update scheduling prevents excessive re-renders

2. **Modal Lazy Loading**
   - Infrastructure in place for on-demand loading
   - Smart caching prevents re-fetching
   - Currently all modals are lazy-loaded from separate HTML files

3. **Dynamic Imports**
   - Dice roller lazy loaded
   - Auto-roll events lazy loaded

### Performance Optimization Opportunities

#### Quick Wins (Low Effort, Medium Impact)

1. **Fix Mixed Import Patterns**
   - Convert static imports to dynamic where already used dynamically
   - Allows Vite to create separate chunks
   - Estimated Impact: 10-15% reduction in main bundle

2. **Preload Critical Modals**
   - Preload commonly-used modals during idle time
   - Use `ModalSystem.preloadModals(['hp-modification', 'condition', 'effect'])`
   - Impact: Better perceived performance

#### Medium Effort (High Impact)

3. **Virtual Scrolling for Combatant List**
   - Only render visible combatants (5-10 at a time)
   - Dramatically improves performance for 50+ combatants
   - Estimated Impact: 80% faster rendering for large encounters

4. **Lazy Load Large Forms**
   - Creature form modal is very large (~500 lines)
   - Apply lazy loading pattern
   - Impact: Further reduce initial bundle size

#### Long Term (Architectural)

5. **Service Worker for Creature Database**
   - Cache creature data in service worker
   - Instant loading for subsequent sessions
   - Impact: Dramatically faster app initialization

6. **Web Workers for Calculations**
   - Move complex combat calculations to web worker
   - Keeps UI thread responsive
   - Impact: Smoother UI, especially for batch operations

### Performance Metrics Goals

**Target Metrics:**
- **Initial Load**: < 2 seconds on 3G
- **Time to Interactive**: < 3 seconds
- **Main Bundle**: < 250 KB (current: 333 KB)
- **Render 50 Combatants**: < 100ms

**How to Measure:**

```bash
# Build production bundle
npm run build

# Check bundle sizes
ls -lh dist/assets/

# Use Chrome DevTools
# 1. Open app in Chrome
# 2. DevTools > Performance tab
# 3. Record page load
# 4. Analyze metrics: FCP, LCP, TTI
```

### References
- [Web.dev Performance Guide](https://web.dev/performance/)
- [Vite Code Splitting Docs](https://vitejs.dev/guide/features.html#dynamic-import)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)

