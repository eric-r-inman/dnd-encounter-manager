/**
 * Unit tests for HPEvents
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { HPEvents } from '../../../src/scripts/events/hp-events.js';
import { StateManager } from '../../../src/scripts/state-manager.js';
import { ToastSystem } from '../../../src/components/toast/ToastSystem.js';
import {
  createMockCombatant,
  setupMockDOM,
  createMockElement
} from '../../test-helpers.js';

// Mock dependencies
jest.mock('../../../src/scripts/state-manager.js');
jest.mock('../../../src/components/toast/ToastSystem.js');

describe('HPEvents', () => {
  beforeEach(() => {
    // Setup DOM
    setupMockDOM();

    // Reset mocks
    jest.clearAllMocks();

    // Setup default state
    StateManager.getState = jest.fn().mockReturnValue({
      combatants: [
        createMockCombatant({ id: 'combatant-1', currentHP: 20, maxHP: 25, tempHP: 0 }),
        createMockCombatant({ id: 'combatant-2', currentHP: 15, maxHP: 20, tempHP: 5 })
      ],
      combat: { round: 1 }
    });

    StateManager.getCombatant = jest.fn().mockImplementation(id => {
      const state = StateManager.getState();
      return state.combatants.find(c => c.id === id);
    });

    StateManager.updateCombatant = jest.fn();
  });

  describe('handleDamage', () => {
    test('should open damage modal for single combatant', () => {
      const button = createMockElement('button', {
        dataset: { action: 'damage', combatantId: 'combatant-1' }
      });
      document.body.appendChild(button);

      HPEvents.handleDamage(button);

      // Check modal was created
      const modal = document.querySelector('#hp-modification-modal');
      expect(modal).toBeTruthy();

      // Check modal title
      const title = modal.querySelector('h3');
      expect(title.textContent).toContain('Apply Damage');

      // Check combatant name is shown
      const combatantInfo = modal.querySelector('.combatant-info');
      expect(combatantInfo.textContent).toContain('Test Goblin');
    });

    test('should handle batch damage for multiple combatants', () => {
      // Mock selected combatants
      const checkboxes = [
        createMockElement('input', {
          type: 'checkbox',
          checked: true,
          dataset: { combatantId: 'combatant-1' }
        }),
        createMockElement('input', {
          type: 'checkbox',
          checked: true,
          dataset: { combatantId: 'combatant-2' }
        })
      ];
      checkboxes.forEach(cb => {
        cb.classList.add('combatant-select-checkbox');
        document.body.appendChild(cb);
      });

      const button = createMockElement('button', {
        dataset: { action: 'batch-damage' }
      });

      HPEvents.handleDamage(button);

      const modal = document.querySelector('#hp-modification-modal');
      const title = modal.querySelector('h3');
      expect(title.textContent).toContain('Apply Damage to 2 Combatants');
    });

    test('should show warning for batch damage with no selection', () => {
      const button = createMockElement('button', {
        dataset: { action: 'batch-damage' }
      });

      HPEvents.handleDamage(button);

      expect(ToastSystem.show).toHaveBeenCalledWith(
        'No combatants selected',
        'warning'
      );
    });
  });

  describe('applyDamage', () => {
    test('should apply damage correctly to temp HP first', () => {
      const combatant = createMockCombatant({
        id: 'test-1',
        currentHP: 20,
        maxHP: 25,
        tempHP: 10
      });

      const result = HPEvents.applyDamage(combatant, 7);

      expect(StateManager.updateCombatant).toHaveBeenCalledWith('test-1', {
        currentHP: 20,
        tempHP: 3,
        damageHistory: expect.arrayContaining([
          expect.objectContaining({
            amount: 7,
            tempHPLost: 7,
            round: 1
          })
        ])
      });
    });

    test('should overflow damage from temp HP to current HP', () => {
      const combatant = createMockCombatant({
        id: 'test-1',
        currentHP: 20,
        maxHP: 25,
        tempHP: 5
      });

      const result = HPEvents.applyDamage(combatant, 10);

      expect(StateManager.updateCombatant).toHaveBeenCalledWith('test-1', {
        currentHP: 15,
        tempHP: 0,
        damageHistory: expect.arrayContaining([
          expect.objectContaining({
            amount: 10,
            tempHPLost: 5,
            round: 1
          })
        ])
      });
    });

    test('should not reduce HP below 0', () => {
      const combatant = createMockCombatant({
        id: 'test-1',
        currentHP: 5,
        maxHP: 25,
        tempHP: 0
      });

      const result = HPEvents.applyDamage(combatant, 20);

      expect(StateManager.updateCombatant).toHaveBeenCalledWith('test-1', {
        currentHP: 0,
        tempHP: 0,
        damageHistory: expect.any(Array)
      });
    });

    test('should show toast notification on damage', () => {
      const combatant = createMockCombatant({
        name: 'Goblin',
        currentHP: 20,
        tempHP: 0
      });

      HPEvents.applyDamage(combatant, 5);

      expect(ToastSystem.show).toHaveBeenCalledWith(
        'Goblin takes 5 damage',
        'error'
      );
    });
  });

  describe('applyHealing', () => {
    test('should heal up to max HP', () => {
      const combatant = createMockCombatant({
        id: 'test-1',
        currentHP: 10,
        maxHP: 25
      });

      HPEvents.applyHealing(combatant, 10);

      expect(StateManager.updateCombatant).toHaveBeenCalledWith('test-1', {
        currentHP: 20,
        healHistory: expect.arrayContaining([
          expect.objectContaining({
            amount: 10,
            round: 1
          })
        ])
      });
    });

    test('should not heal beyond max HP', () => {
      const combatant = createMockCombatant({
        id: 'test-1',
        currentHP: 20,
        maxHP: 25
      });

      HPEvents.applyHealing(combatant, 20);

      expect(StateManager.updateCombatant).toHaveBeenCalledWith('test-1', {
        currentHP: 25,
        healHistory: expect.any(Array)
      });
    });

    test('should show toast notification on healing', () => {
      const combatant = createMockCombatant({
        name: 'Fighter',
        currentHP: 10,
        maxHP: 30
      });

      HPEvents.applyHealing(combatant, 8);

      expect(ToastSystem.show).toHaveBeenCalledWith(
        'Fighter heals 8 HP',
        'success'
      );
    });

    test('should revive from unconscious (0 HP)', () => {
      const combatant = createMockCombatant({
        id: 'test-1',
        currentHP: 0,
        maxHP: 25
      });

      HPEvents.applyHealing(combatant, 5);

      expect(StateManager.updateCombatant).toHaveBeenCalledWith('test-1', {
        currentHP: 5,
        healHistory: expect.any(Array)
      });

      expect(ToastSystem.show).toHaveBeenCalledWith(
        expect.stringContaining('heals 5 HP'),
        'success'
      );
    });
  });

  describe('applyTempHP', () => {
    test('should set temp HP when none exists', () => {
      const combatant = createMockCombatant({
        id: 'test-1',
        tempHP: 0
      });

      HPEvents.applyTempHP(combatant, 10);

      expect(StateManager.updateCombatant).toHaveBeenCalledWith('test-1', {
        tempHP: 10,
        tempHPHistory: expect.arrayContaining([
          expect.objectContaining({
            amount: 10,
            round: 1
          })
        ])
      });
    });

    test('should keep higher temp HP value', () => {
      const combatant = createMockCombatant({
        id: 'test-1',
        tempHP: 5
      });

      HPEvents.applyTempHP(combatant, 10);

      expect(StateManager.updateCombatant).toHaveBeenCalledWith('test-1', {
        tempHP: 10,
        tempHPHistory: expect.any(Array)
      });

      expect(ToastSystem.show).toHaveBeenCalledWith(
        expect.stringContaining('gains 10 temp HP'),
        'info'
      );
    });

    test('should not replace with lower temp HP', () => {
      const combatant = createMockCombatant({
        name: 'Fighter',
        tempHP: 15
      });

      HPEvents.applyTempHP(combatant, 10);

      expect(StateManager.updateCombatant).not.toHaveBeenCalled();

      expect(ToastSystem.show).toHaveBeenCalledWith(
        'Fighter already has 15 temp HP (keeping higher value)',
        'info'
      );
    });
  });

  describe('handleBatchHPModification', () => {
    test('should apply damage to all selected combatants', () => {
      // Setup selected checkboxes
      const checkboxes = [
        createMockElement('input', {
          type: 'checkbox',
          checked: true,
          dataset: { combatantId: 'combatant-1' }
        }),
        createMockElement('input', {
          type: 'checkbox',
          checked: true,
          dataset: { combatantId: 'combatant-2' }
        })
      ];
      checkboxes.forEach(cb => {
        cb.classList.add('combatant-select-checkbox');
        document.body.appendChild(cb);
      });

      // Mock form submission
      const form = createMockElement('form');
      const amountInput = createMockElement('input', {
        name: 'amount',
        value: '5'
      });
      const typeInput = createMockElement('input', {
        name: 'modificationType',
        value: 'damage'
      });
      form.appendChild(amountInput);
      form.appendChild(typeInput);

      HPEvents.handleBatchHPModification(form, 5, 'damage');

      // Should update both combatants
      expect(StateManager.updateCombatant).toHaveBeenCalledTimes(2);
      expect(StateManager.updateCombatant).toHaveBeenCalledWith(
        'combatant-1',
        expect.objectContaining({ currentHP: 15 })
      );
      expect(StateManager.updateCombatant).toHaveBeenCalledWith(
        'combatant-2',
        expect.objectContaining({ currentHP: 15, tempHP: 0 })
      );
    });

    test('should show summary toast for batch operations', () => {
      const checkboxes = [
        createMockElement('input', {
          type: 'checkbox',
          checked: true,
          dataset: { combatantId: 'combatant-1' }
        })
      ];
      checkboxes[0].classList.add('combatant-select-checkbox');
      document.body.appendChild(checkboxes[0]);

      HPEvents.handleBatchHPModification(null, 10, 'heal');

      expect(ToastSystem.show).toHaveBeenCalledWith(
        'Applied healing to 1 combatant',
        'success'
      );
    });
  });
});