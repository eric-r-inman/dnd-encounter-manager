# Development Guide

## Getting Started

### Prerequisites

Ensure you have the following installed:
- **Node.js 16+** (LTS recommended)
- **npm 8+** (comes with Node.js)
- **Git** for version control
- **Modern web browser** (Chrome, Firefox, Safari, Edge)

### Initial Setup

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

4. **Open browser:**
   - Navigate to `http://localhost:3000`
   - Application loads with hot module replacement (HMR)

### Development Scripts

```bash
# Development server with HMR
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview

# Type checking (if TypeScript added)
npm run typecheck

# Linting (if ESLint configured)
npm run lint
```

## Project Structure

```
dnd-encounter-manager/
├── public/                 # Static assets
│   ├── icons/             # Application icons
│   └── index.html         # HTML template
├── src/                   # Source code
│   ├── main.js           # Application entry point
│   ├── scripts/          # Core JavaScript modules
│   │   ├── events/       # Event handling system
│   │   ├── services/     # Business logic services
│   │   ├── state/        # State management
│   │   ├── app-core.js   # Application initialization
│   │   ├── state-manager.js  # Central state coordination
│   │   └── data-services.js  # Legacy compatibility layer
│   ├── components/       # Reusable UI components
│   │   ├── combatant-card/   # Combatant display logic
│   │   ├── modals/       # Modal dialog system
│   │   └── toast/        # Notification system
│   └── styles/          # CSS and styling
├── docs/                # Documentation
├── dist/                # Built application (generated)
├── package.json         # Node.js dependencies and scripts
├── vite.config.js       # Vite build configuration
└── README.md           # Project overview
```

## Architecture Overview

### Core Principles

1. **Modular Design**: Each module has a single responsibility
2. **Event-Driven Architecture**: Central event coordination with specialized handlers
3. **Reactive State Management**: State changes trigger UI updates automatically
4. **Service Layer Pattern**: Business logic isolated in dedicated services

### Module Communication

```
User Interaction → EventCoordinator → Event Module → Service → StateManager → UI Update
```

### Key Components

#### 1. EventCoordinator (`src/scripts/events/index.js`)
- **Purpose**: Central event dispatch and coordination
- **Pattern**: Single delegated event listener with action-based routing
- **Usage**: `<button data-action="damage" data-target="combatant-123">Damage</button>`

#### 2. Service Layer (`src/scripts/services/`)
- **CombatantService**: CRUD operations for combatants
- **CombatService**: Combat flow and turn management
- **StorageService**: Data persistence and retrieval
- **ValidationService**: Input validation and data integrity
- **CalculationService**: Game mechanics calculations

#### 3. State Management (`src/scripts/state/`)
- **StateManager**: Central state coordination with reactive subscriptions
- **CombatantState**: Individual combatant data operations
- **CombatState**: Combat session management
- **UIState**: User interface state
- **PersistentState**: localStorage integration

## Development Workflow

### Adding New Features

#### 1. Event-Driven Features

**Example: Adding a "Rest" action**

1. **Add event handler:**
   ```javascript
   // src/scripts/events/combatant-events.js
   static handleRest(target, event) {
       const combatantId = target.dataset.target;
       CombatantService.restoreCombatant(combatantId);
   }
   ```

2. **Register in EventCoordinator:**
   ```javascript
   // src/scripts/events/index.js
   case 'rest':
       CombatantEvents.handleRest(target, event);
       break;
   ```

3. **Add service method:**
   ```javascript
   // src/scripts/services/combatant-service.js
   static async restoreCombatant(combatantId) {
       const combatant = this.getCombatant(combatantId);
       await this.updateCombatant(combatantId, 'currentHP', combatant.maxHP);
   }
   ```

4. **Add UI element:**
   ```html
   <button data-action="rest" data-target="{{id}}">Rest</button>
   ```

#### 2. Service Layer Features

**Example: Adding spell slot tracking**

1. **Extend combatant data structure:**
   ```javascript
   // src/scripts/state/combatant-state.js
   static createCombatant(data) {
       const defaults = {
           // ... existing defaults
           spellSlots: {
               level1: 0,
               level2: 0,
               // ... more levels
           }
       };
       return { ...defaults, ...data };
   }
   ```

2. **Add service methods:**
   ```javascript
   // src/scripts/services/combatant-service.js
   static async useSpellSlot(combatantId, level) {
       const combatant = this.getCombatant(combatantId);
       const slotProperty = `spellSlots.level${level}`;
       const currentSlots = combatant.spellSlots[`level${level}`];

       if (currentSlots > 0) {
           await this.updateCombatant(combatantId, slotProperty, currentSlots - 1);
           return true;
       }
       return false;
   }
   ```

3. **Add validation:**
   ```javascript
   // src/scripts/services/validation-service.js
   static validateSpellSlots(spellSlots) {
       const errors = [];
       for (const [level, slots] of Object.entries(spellSlots)) {
           if (typeof slots !== 'number' || slots < 0) {
               errors.push(`Invalid spell slots for ${level}`);
           }
       }
       return { isValid: errors.length === 0, errors };
   }
   ```

### Code Style Guidelines

#### JavaScript Style

1. **ES6+ Syntax**: Use modern JavaScript features
   ```javascript
   // Good
   const combatants = data.map(c => ({ ...c, isActive: false }));

   // Avoid
   var combatants = [];
   for (var i = 0; i < data.length; i++) {
       combatants.push(Object.assign({}, data[i], { isActive: false }));
   }
   ```

2. **Naming Conventions**:
   - **Classes**: PascalCase (`CombatantService`)
   - **Functions**: camelCase (`getCombatant`)
   - **Constants**: UPPER_SNAKE_CASE (`MAX_COMBATANTS`)
   - **Files**: kebab-case (`combatant-service.js`)

3. **Function Documentation**:
   ```javascript
   /**
    * Update combatant property with validation
    * @param {string} combatantId - Combatant ID
    * @param {string} property - Property path to update
    * @param {*} value - New value
    * @returns {Promise<boolean>} Success status
    * @throws {Error} If validation fails
    */
   static async updateCombatant(combatantId, property, value) {
       // Implementation
   }
   ```

#### HTML/CSS Guidelines

1. **Semantic HTML**: Use appropriate HTML elements
   ```html
   <!-- Good -->
   <button data-action="damage" class="btn btn-danger">
       <i class="icon-damage"></i>
       Damage
   </button>

   <!-- Avoid -->
   <div onclick="doDamage()" class="fake-button">Damage</div>
   ```

2. **CSS Classes**: Use BEM methodology
   ```css
   /* Block */
   .combatant-card { }

   /* Element */
   .combatant-card__header { }
   .combatant-card__hp-bar { }

   /* Modifier */
   .combatant-card--active { }
   .combatant-card--unconscious { }
   ```

3. **Data Attributes**: Use for JavaScript hooks
   ```html
   <div data-action="select" data-target="combatant-123" data-type="enemy">
   ```

### File Organization

#### Size Limits
- **Maximum file size**: 500 lines
- **Maximum function size**: 50 lines
- **If exceeded**: Split into smaller, focused modules

#### Module Structure
```javascript
/**
 * Module description
 * @version 1.0.0
 */

// Imports at top
import { Service } from './service.js';

// Class or module exports
export class ModuleName {
    // Static properties first
    static property = value;

    // Constructor (if needed)
    constructor() {
        // Initialization
    }

    // Public methods
    static publicMethod() {
        // Implementation
    }

    // Private methods at bottom (marked with JSDoc @private)
    static _privateMethod() {
        // Implementation
    }
}
```

## Debugging and Testing

### Browser DevTools

#### Console Debugging
```javascript
// Enable debug mode
localStorage.setItem('debug', 'true');
location.reload();

// Debug specific service
CombatantService.debug = true;
```

#### Performance Monitoring
```javascript
// Monitor state updates
StateManager.subscribe('combatants', (combatants) => {
    console.time('Combatant Render');
    // ... render logic
    console.timeEnd('Combatant Render');
});
```

### Error Handling

#### Service Layer Errors
```javascript
// Consistent error handling pattern
try {
    const result = await CombatantService.createCombatant(data);
    return result;
} catch (error) {
    // Log detailed error
    console.error('Combatant creation failed:', {
        error: error.message,
        data,
        stack: error.stack
    });

    // Show user-friendly message
    ToastSystem.showError(`Failed to create combatant: ${error.message}`);

    // Re-throw for caller handling
    throw error;
}
```

#### State Validation
```javascript
// Validate state changes
StateManager.subscribe('combatants', (combatants) => {
    combatants.forEach(combatant => {
        const validation = CombatantState.validateCombatant(combatant);
        if (!validation.isValid) {
            console.warn('Invalid combatant state:', combatant, validation.errors);
        }
    });
});
```

### Testing Strategies

#### Manual Testing Checklist

**Core Functionality:**
- [ ] Add combatant with valid data
- [ ] Add combatant with invalid data (should show error)
- [ ] Update combatant HP (damage, healing, temp HP)
- [ ] Apply conditions and effects
- [ ] Combat flow (start, next turn, end)
- [ ] Batch operations on multiple combatants

**Edge Cases:**
- [ ] Extremely high HP values
- [ ] Negative damage/healing
- [ ] Multiple conditions with same name
- [ ] Browser refresh during combat
- [ ] localStorage full/disabled

**Cross-Browser Testing:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (if on macOS)
- [ ] Edge (latest)

#### Automated Testing (Future)

Framework recommendations:
- **Unit Tests**: Jest or Vitest
- **Integration Tests**: Testing Library
- **E2E Tests**: Playwright or Cypress

## Performance Optimization

### Rendering Performance

#### Batch DOM Updates
```javascript
// Bad: Multiple DOM manipulations
combatants.forEach(c => {
    document.getElementById(c.id).update(c);
});

// Good: Batch updates
const updates = combatants.map(c => ({ id: c.id, data: c }));
CombatantManager.batchUpdate(updates);
```

#### Template Caching
```javascript
// Cache compiled templates
class CombatantCard {
    constructor(data) {
        this.templateCache = null;
    }

    render() {
        if (!this.templateCache) {
            this.templateCache = this.compileTemplate();
        }
        return this.templateCache(this.data);
    }
}
```

### Memory Management

#### Event Listener Cleanup
```javascript
class Component {
    constructor() {
        this.boundHandler = this.handleEvent.bind(this);
        document.addEventListener('click', this.boundHandler);
    }

    destroy() {
        document.removeEventListener('click', this.boundHandler);
        this.boundHandler = null;
    }
}
```

#### State Subscription Cleanup
```javascript
const unsubscribe = StateManager.subscribe('combatants', this.updateUI.bind(this));

// Clean up when component is destroyed
this.cleanup = () => {
    unsubscribe();
};
```

### Storage Optimization

#### Data Compression
```javascript
// Compress large encounter data
const compressedData = LZString.compress(JSON.stringify(encounterData));
localStorage.setItem('encounter', compressedData);
```

#### Automatic Cleanup
```javascript
// Remove old data automatically
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
const cutoff = Date.now() - THIRTY_DAYS;

Object.keys(localStorage).forEach(key => {
    const data = JSON.parse(localStorage.getItem(key));
    if (data.timestamp && data.timestamp < cutoff) {
        localStorage.removeItem(key);
    }
});
```

## Build Process

### Development Build

```bash
# Start Vite dev server
npm run dev
```

**Features:**
- Hot Module Replacement (HMR)
- Source maps for debugging
- Fast rebuild on file changes
- CSS injection without page reload

### Production Build

```bash
# Create optimized build
npm run build
```

**Optimizations:**
- JavaScript minification and tree-shaking
- CSS optimization and purging
- Asset optimization (images, fonts)
- Bundle splitting for better caching
- Legacy browser compatibility

### Build Configuration

#### Vite Configuration (`vite.config.js`)
```javascript
export default {
    // Development server configuration
    server: {
        port: 3000,
        open: true
    },

    // Build configuration
    build: {
        outDir: 'dist',
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['lodash', 'dayjs']
                }
            }
        }
    },

    // Plugin configuration
    plugins: [
        // Add plugins as needed
    ]
};
```

## Deployment

### Static Hosting

The application is a static SPA that can be deployed to any static hosting service:

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Deploy the `dist/` folder** to your hosting service:
   - **Netlify**: Drag and drop `dist/` folder
   - **Vercel**: Import repository and set build command to `npm run build`
   - **GitHub Pages**: Upload `dist/` contents to `gh-pages` branch
   - **AWS S3**: Upload `dist/` contents to S3 bucket

### Environment-Specific Builds

#### Development Environment
```bash
NODE_ENV=development npm run build
```

#### Production Environment
```bash
NODE_ENV=production npm run build
```

## Contributing Guidelines

### Git Workflow

1. **Create feature branch:**
   ```bash
   git checkout -b feature/new-feature-name
   ```

2. **Make commits with clear messages:**
   ```bash
   git commit -m "feat: add spell slot tracking for combatants"
   git commit -m "fix: resolve HP calculation edge case"
   git commit -m "docs: update API documentation for new service"
   ```

3. **Push and create pull request:**
   ```bash
   git push origin feature/new-feature-name
   ```

### Code Review Checklist

**Functionality:**
- [ ] New feature works as intended
- [ ] No existing functionality broken
- [ ] Edge cases handled appropriately
- [ ] Error handling implemented

**Code Quality:**
- [ ] Follows established code style
- [ ] Functions are well-documented
- [ ] No unnecessary complexity
- [ ] Performance considerations addressed

**Architecture:**
- [ ] Follows existing patterns
- [ ] Proper separation of concerns
- [ ] State management used correctly
- [ ] Event handling follows conventions

### Release Process

1. **Update version number** in `package.json`
2. **Update CHANGELOG.md** with new features and fixes
3. **Create release tag:**
   ```bash
   git tag -a v1.2.0 -m "Release version 1.2.0"
   git push origin v1.2.0
   ```
4. **Deploy to production**

## Troubleshooting Common Issues

### Development Server Issues

**Port already in use:**
```bash
# Use different port
npm run dev -- --port 3001
```

**Module not found errors:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Build Issues

**Out of memory errors:**
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

**Import path resolution:**
```javascript
// Use absolute imports from src/
import { CombatantService } from '/scripts/services/combatant-service.js';
```

### Runtime Issues

**State not updating:**
- Check if StateManager subscriptions are properly set up
- Verify state mutations go through StateManager methods
- Check browser console for JavaScript errors

**Performance issues:**
- Limit number of active combatants (50+ may impact performance)
- Clear localStorage if it becomes too large
- Check for memory leaks in browser DevTools

**Cross-browser compatibility:**
- Test in multiple browsers
- Check for unsupported JavaScript features
- Verify CSS compatibility

## Resources

### Documentation
- [Vite Documentation](https://vitejs.dev/)
- [MDN Web Docs](https://developer.mozilla.org/)
- [D&D 5e SRD](https://dnd.wizards.com/resources/systems-reference-document)

### Tools
- [VS Code](https://code.visualstudio.com/) with recommended extensions
- [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools)
- [Firefox DevTools](https://developer.mozilla.org/en-US/docs/Tools)

### Code Quality
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io/) for code formatting
- [JSDoc](https://jsdoc.app/) for documentation

Happy coding! 🎲⚔️