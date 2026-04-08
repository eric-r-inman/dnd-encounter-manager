/**
 * Test Helper Utilities
 * Common functions and fixtures for testing
 */

/**
 * Creates a mock combatant object for testing
 */
export function createMockCombatant(overrides = {}) {
  return {
    id: 'test-combatant-1',
    creatureId: 'creature-1',
    name: 'Test Goblin',
    type: 'enemy',
    ac: 15,
    maxHP: 7,
    currentHP: 7,
    tempHP: 0,
    initiative: 14,
    orderIndex: 0,
    manualOrder: null,
    nameNote: '',
    status: {
      isActive: false,
      holdAction: false,
      concentration: false,
      concentrationSpell: '',
      hiding: false,
      flying: false,
      flyingHeight: 0,
      cover: 'none',
      surprised: false
    },
    conditions: [],
    effects: [],
    notes: '',
    damageHistory: [],
    healHistory: [],
    tempHPHistory: [],
    deathSaves: [false, false, false],
    autoRoll: null,
    isSelected: false,
    ...overrides
  };
}

/**
 * Creates a mock creature object for testing
 */
export function createMockCreature(overrides = {}) {
  return {
    id: 'creature-1',
    name: 'Goblin',
    type: 'enemy',
    ac: 15,
    maxHP: 7,
    cr: '1/4',
    size: 'Small',
    race: 'Goblinoid',
    alignment: 'Neutral Evil',
    source: 'Monster Manual',
    hasFullStatBlock: true,
    statBlock: {
      abilities: {
        STR: 8,
        DEX: 14,
        CON: 10,
        INT: 10,
        WIS: 8,
        CHA: 8
      },
      savingThrows: {},
      skills: { 'Stealth': '+6' },
      damageResistances: [],
      damageImmunities: [],
      damageVulnerabilities: [],
      conditionImmunities: [],
      senses: ['Darkvision 60 ft.'],
      languages: ['Common', 'Goblin'],
      traits: [
        {
          name: 'Nimble Escape',
          description: 'The goblin can take the Disengage or Hide action as a bonus action on each of its turns.'
        }
      ],
      actions: [
        {
          name: 'Scimitar',
          description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.'
        },
        {
          name: 'Shortbow',
          description: 'Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 2) piercing damage.'
        }
      ],
      reactions: [],
      legendaryActions: null,
      lairActions: null,
      spellcasting: null
    },
    ...overrides
  };
}

/**
 * Creates a mock encounter object for testing
 */
export function createMockEncounter(overrides = {}) {
  return {
    id: 'encounter-1',
    name: 'Goblin Ambush',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    version: '2.0.0',
    data: {
      combatants: [
        createMockCombatant({ id: 'combatant-1', name: 'Goblin 1' }),
        createMockCombatant({ id: 'combatant-2', name: 'Goblin 2', initiative: 12 }),
        createMockCombatant({
          id: 'combatant-3',
          name: 'Player Fighter',
          type: 'player',
          maxHP: 30,
          currentHP: 25,
          ac: 18,
          initiative: 15
        })
      ],
      round: 1,
      isActive: false
    },
    ...overrides
  };
}

/**
 * Creates a mock DOM element for testing
 */
export function createMockElement(tag = 'div', attributes = {}, innerHTML = '') {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'dataset') {
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        element.dataset[dataKey] = dataValue;
      });
    } else if (key === 'classList') {
      element.classList.add(...value);
    } else {
      element.setAttribute(key, value);
    }
  });
  element.innerHTML = innerHTML;
  return element;
}

/**
 * Sets up a mock DOM structure for testing
 */
export function setupMockDOM() {
  document.body.innerHTML = `
    <div id="app">
      <div id="toast-container"></div>
      <div id="initiative-order"></div>
      <div id="combat-status">
        <span id="round-number">1</span>
        <span id="active-combatant-name"></span>
      </div>
      <div class="modal" id="test-modal">
        <div class="modal-content">
          <button class="modal-close">&times;</button>
        </div>
      </div>
    </div>
  `;
  return document.body;
}

/**
 * Waits for a condition to be true
 */
export async function waitFor(condition, timeout = 5000) {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

/**
 * Triggers a DOM event
 */
export function triggerEvent(element, eventType, options = {}) {
  const event = new Event(eventType, { bubbles: true, cancelable: true, ...options });
  element.dispatchEvent(event);
}

/**
 * Mock localStorage implementation with actual storage
 */
export class MockLocalStorage {
  constructor() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = value.toString();
  }

  removeItem(key) {
    delete this.store[key];
  }

  clear() {
    this.store = {};
  }

  get length() {
    return Object.keys(this.store).length;
  }

  key(index) {
    return Object.keys(this.store)[index] || null;
  }
}

/**
 * Creates a spy function that tracks calls
 */
export function createSpy(name = 'spy') {
  const spy = jest.fn();
  spy.mockName(name);
  return spy;
}

/**
 * Asserts that an element exists in the DOM
 */
export function assertElementExists(selector) {
  const element = document.querySelector(selector);
  expect(element).toBeTruthy();
  return element;
}

/**
 * Asserts that an element has specific text content
 */
export function assertElementText(selector, expectedText) {
  const element = assertElementExists(selector);
  expect(element.textContent.trim()).toBe(expectedText);
  return element;
}

/**
 * Mock fetch response
 */
export function mockFetchResponse(data, options = {}) {
  const response = {
    ok: true,
    status: 200,
    json: async () => data,
    text: async () => JSON.stringify(data),
    ...options
  };

  global.fetch.mockResolvedValueOnce(response);
  return response;
}

/**
 * Mock fetch error
 */
export function mockFetchError(message = 'Network error') {
  global.fetch.mockRejectedValueOnce(new Error(message));
}