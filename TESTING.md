# Testing Documentation

## Overview

This project uses Jest as its testing framework with comprehensive unit, integration, and end-to-end testing capabilities. The testing infrastructure was added to ensure code reliability and prevent regressions during refactoring.

## Quick Start

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run only e2e tests
npm run test:e2e

# Run tests in verbose mode
npm run test:verbose

# Debug tests
npm run test:debug
```

## Test Structure

```
tests/
├── __mocks__/          # Mock files for CSS and assets
├── unit/               # Unit tests for individual modules
│   ├── services/       # Service layer tests
│   ├── events/         # Event handler tests
│   ├── components/     # Component tests
│   └── utils/          # Utility function tests
├── integration/        # Integration tests
├── e2e/               # End-to-end tests
├── setup.js           # Jest setup and configuration
└── test-helpers.js    # Shared test utilities
```

## Writing Tests

### Unit Test Example

```javascript
import { describe, test, expect } from '@jest/globals';
import { CalculationService } from '../../../src/scripts/services/calculation-service.js';
import { createMockCombatant } from '../../test-helpers.js';

describe('CalculationService', () => {
  describe('calculateDamage', () => {
    test('should apply damage to temp HP first', () => {
      const combatant = createMockCombatant({
        currentHP: 20,
        tempHP: 10,
        maxHP: 25
      });

      const result = CalculationService.calculateDamage(combatant, 7);

      expect(result.currentHP).toBe(20);
      expect(result.tempHP).toBe(3);
      expect(result.tempHPLost).toBe(7);
    });
  });
});
```

### Event Handler Test Example

```javascript
import { HPEvents } from '../../../src/scripts/events/hp-events.js';
import { setupMockDOM, createMockElement } from '../../test-helpers.js';

describe('HPEvents', () => {
  beforeEach(() => {
    setupMockDOM();
  });

  test('should open damage modal', () => {
    const button = createMockElement('button', {
      dataset: { action: 'damage', combatantId: 'test-1' }
    });

    HPEvents.handleDamage(button);

    const modal = document.querySelector('#hp-modification-modal');
    expect(modal).toBeTruthy();
  });
});
```

## Test Helpers

The `test-helpers.js` file provides utilities for testing:

### Mock Data Creators
- `createMockCombatant(overrides)` - Creates a test combatant
- `createMockCreature(overrides)` - Creates a test creature
- `createMockEncounter(overrides)` - Creates a test encounter

### DOM Testing
- `setupMockDOM()` - Sets up a basic DOM structure
- `createMockElement(tag, attributes, innerHTML)` - Creates DOM elements
- `triggerEvent(element, eventType, options)` - Triggers DOM events
- `assertElementExists(selector)` - Asserts element presence
- `assertElementText(selector, text)` - Asserts element text content

### Storage Testing
- `MockLocalStorage` - Functional localStorage mock with actual storage

### Async Testing
- `waitFor(condition, timeout)` - Waits for conditions in async tests

### Network Testing
- `mockFetchResponse(data, options)` - Mocks successful fetch
- `mockFetchError(message)` - Mocks fetch errors

## Coverage Reports

After running `npm run test:coverage`, view the coverage report:

1. **Console Output**: Shows coverage summary
2. **HTML Report**: Open `coverage/lcov-report/index.html` in a browser

### Coverage Goals
- **Statements**: 80% minimum
- **Branches**: 75% minimum
- **Functions**: 80% minimum
- **Lines**: 80% minimum

### Priority Areas for Testing
1. **Services** (Critical business logic)
   - CalculationService ✅
   - StorageService ✅
   - ValidationService ✅
   - CreatureService
   - CombatService
   - CombatantService

2. **Event Handlers** (User interactions)
   - HPEvents ✅
   - CombatEvents
   - CombatantEvents
   - ModalEvents
   - InitiativeEvents

3. **State Management**
   - StateManager
   - CombatState
   - CombatantState
   - PersistentState

4. **Components**
   - CombatantCard
   - ModalSystem
   - ToastSystem
   - DiceRoller

## Mocking Strategies

### Module Mocks
```javascript
// Mock entire modules
jest.mock('../../../src/scripts/state-manager.js');
jest.mock('../../../src/components/toast/ToastSystem.js');
```

### Function Mocks
```javascript
// Mock specific functions
StateManager.updateCombatant = jest.fn();
ToastSystem.show = jest.fn();
```

### DOM Mocks
```javascript
// Mock browser APIs
global.localStorage = new MockLocalStorage();
global.fetch = jest.fn();
global.alert = jest.fn();
```

## Best Practices

### Test Organization
1. **One describe block per module/class**
2. **Nested describe blocks for methods**
3. **Descriptive test names** that explain what is being tested
4. **Arrange-Act-Assert pattern** in each test

### Test Data
1. **Use test helpers** for consistent mock data
2. **Override only necessary properties** in mocks
3. **Clean up after tests** to prevent test pollution

### Assertions
1. **Test one thing per test**
2. **Use specific matchers** (toBe vs toEqual)
3. **Assert on behavior, not implementation**
4. **Include edge cases** (null, undefined, empty)

### Performance
1. **Mock heavy dependencies** (DOM, network, storage)
2. **Use beforeEach for common setup**
3. **Clear mocks between tests**
4. **Keep tests focused and fast**

## Common Issues and Solutions

### Issue: ES Modules Import Errors
**Solution**: Ensure `jest.config.js` has proper transform configuration and Babel preset.

### Issue: CSS Import Errors
**Solution**: CSS files are mocked via `styleMock.js` in the mocks directory.

### Issue: localStorage is not defined
**Solution**: localStorage is mocked in `setup.js` automatically.

### Issue: Tests Timing Out
**Solution**:
- Check for unresolved promises
- Ensure async tests use await properly
- Increase timeout if needed: `jest.setTimeout(10000)`

### Issue: DOM Not Found
**Solution**: Use `setupMockDOM()` in beforeEach to create DOM structure.

## CI/CD Integration

To integrate with CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v2
        with:
          files: ./coverage/lcov.info
```

## Adding New Tests

### 1. Create Test File
Place in appropriate directory:
- Unit tests: `tests/unit/[category]/[module].test.js`
- Integration: `tests/integration/[feature].test.js`
- E2E: `tests/e2e/[scenario].test.js`

### 2. Import Dependencies
```javascript
import { describe, test, expect, beforeEach } from '@jest/globals';
import { ModuleToTest } from '../../../src/path/to/module.js';
import { testHelpers } from '../../test-helpers.js';
```

### 3. Write Tests
Follow the patterns shown in existing tests.

### 4. Run and Verify
```bash
npm run test:watch -- path/to/new/test.js
```

## Test Maintenance

### Regular Tasks
1. **Run tests before commits**
2. **Update tests when changing code**
3. **Review coverage reports weekly**
4. **Remove obsolete tests**
5. **Refactor test helpers as needed**

### Test Review Checklist
- [ ] Tests pass locally
- [ ] New features have tests
- [ ] Bug fixes include regression tests
- [ ] Coverage hasn't decreased
- [ ] No console errors in tests
- [ ] Mocks are properly cleaned up

## Future Improvements

1. **Visual Regression Testing**: Add screenshot comparison tests
2. **Performance Testing**: Add benchmarks for critical paths
3. **Accessibility Testing**: Add jest-axe for a11y testing
4. **Mutation Testing**: Add Stryker for test quality validation
5. **Contract Testing**: Add tests for API contracts
6. **Snapshot Testing**: Add for component rendering

---

**Remember**: Good tests are an investment in code quality and developer confidence. Write tests that you'll thank yourself for later!