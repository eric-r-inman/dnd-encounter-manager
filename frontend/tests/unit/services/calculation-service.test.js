/**
 * Unit tests for CalculationService
 */

import { describe, test, expect } from '@jest/globals';
import { CalculationService } from '../../../src/scripts/services/calculation-service.js';
import { createMockCombatant } from '../../test-helpers.js';

describe('CalculationService', () => {
  describe('calculateDamage', () => {
    test('should apply damage to current HP when no temp HP', () => {
      const combatant = createMockCombatant({
        currentHP: 20,
        tempHP: 0,
        maxHP: 25
      });

      const result = CalculationService.calculateDamage(combatant, 5);

      expect(result.newCurrentHP).toBe(15);
      expect(result.newTempHP).toBe(0);
      expect(result.effectiveDamage).toBe(5);
      expect(result.damageToTempHP).toBe(0);
      expect(result.damageToCurrentHP).toBe(5);
    });

    test('should apply damage to temp HP first', () => {
      const combatant = createMockCombatant({
        currentHP: 20,
        tempHP: 10,
        maxHP: 25
      });

      const result = CalculationService.calculateDamage(combatant, 7);

      expect(result.newCurrentHP).toBe(20);
      expect(result.newTempHP).toBe(3);
      expect(result.effectiveDamage).toBe(7);
      expect(result.damageToTempHP).toBe(7);
      expect(result.damageToCurrentHP).toBe(0);
    });

    test('should overflow damage from temp HP to current HP', () => {
      const combatant = createMockCombatant({
        currentHP: 20,
        tempHP: 5,
        maxHP: 25
      });

      const result = CalculationService.calculateDamage(combatant, 10);

      expect(result.newCurrentHP).toBe(15);
      expect(result.newTempHP).toBe(0);
      expect(result.effectiveDamage).toBe(10);
      expect(result.damageToTempHP).toBe(5);
      expect(result.damageToCurrentHP).toBe(5);
    });

    test('should not reduce HP below 0', () => {
      const combatant = createMockCombatant({
        currentHP: 5,
        tempHP: 0,
        maxHP: 25
      });

      const result = CalculationService.calculateDamage(combatant, 10);

      expect(result.newCurrentHP).toBe(0);
      expect(result.newTempHP).toBe(0);
      expect(result.effectiveDamage).toBe(5);
      expect(result.overkill).toBe(5);
    });

    test('should handle 0 damage', () => {
      const combatant = createMockCombatant({
        currentHP: 20,
        tempHP: 5,
        maxHP: 25
      });

      const result = CalculationService.calculateDamage(combatant, 0);

      expect(result.newCurrentHP).toBe(20);
      expect(result.newTempHP).toBe(5);
      expect(result.effectiveDamage).toBe(0);
      expect(result.damageToTempHP).toBe(0);
      expect(result.damageToCurrentHP).toBe(0);
    });

    test('should handle negative damage', () => {
      const combatant = createMockCombatant({
        currentHP: 20,
        tempHP: 5,
        maxHP: 25
      });

      const result = CalculationService.calculateDamage(combatant, -5);

      // Negative damage is treated as healing/resistance in this implementation
      expect(result.effectiveDamage).toBeLessThanOrEqual(0);
    });
  });

  describe('calculateHealing', () => {
    test('should heal up to max HP', () => {
      const combatant = createMockCombatant({
        currentHP: 10,
        maxHP: 25
      });

      const result = CalculationService.calculateHealing(combatant, 10);

      expect(result.newCurrentHP).toBe(20);
      expect(result.actualHealing).toBe(10);
      expect(result.overheal).toBe(0);
    });

    test('should not heal beyond max HP', () => {
      const combatant = createMockCombatant({
        currentHP: 20,
        maxHP: 25
      });

      const result = CalculationService.calculateHealing(combatant, 10);

      expect(result.newCurrentHP).toBe(25);
      expect(result.actualHealing).toBe(5);
      expect(result.overheal).toBe(5);
      expect(result.wasReduced).toBe(true);
    });

    test('should handle 0 healing', () => {
      const combatant = createMockCombatant({
        currentHP: 15,
        maxHP: 25
      });

      const result = CalculationService.calculateHealing(combatant, 0);

      expect(result.newCurrentHP).toBe(15);
      expect(result.actualHealing).toBe(0);
      expect(result.overheal).toBe(0);
    });

    test('should handle negative healing', () => {
      const combatant = createMockCombatant({
        currentHP: 15,
        maxHP: 25
      });

      const result = CalculationService.calculateHealing(combatant, -5);

      // Negative healing results in lower HP (damage)
      expect(result.newCurrentHP).toBeLessThan(15);
      expect(result.actualHealing).toBeLessThan(0);
    });

    test('should heal from 0 HP (unconscious)', () => {
      const combatant = createMockCombatant({
        currentHP: 0,
        maxHP: 25
      });

      const result = CalculationService.calculateHealing(combatant, 5);

      expect(result.newCurrentHP).toBe(5);
      expect(result.actualHealing).toBe(5);
    });

    test('should calculate health percentage', () => {
      const combatant = createMockCombatant({
        currentHP: 10,
        maxHP: 20
      });

      const result = CalculationService.calculateHealing(combatant, 5);

      expect(result.healthPercentage).toBe(75); // 15/20 = 75%
    });
  });

  describe('calculateTempHP', () => {
    test('should set temp HP when none exists', () => {
      const combatant = createMockCombatant({
        tempHP: 0
      });

      const result = CalculationService.calculateTempHP(combatant, 10);

      expect(result.newTempHP).toBe(10);
      expect(result.actualGain).toBe(10);
      expect(result.wasReplaced).toBe(false);
      expect(result.wasIgnored).toBe(false);
    });

    test('should keep higher temp HP value', () => {
      const combatant = createMockCombatant({
        tempHP: 5
      });

      const result = CalculationService.calculateTempHP(combatant, 10);

      expect(result.newTempHP).toBe(10);
      expect(result.actualGain).toBe(5);
      expect(result.wasReplaced).toBe(true);
      expect(result.wasIgnored).toBe(false);
    });

    test('should not replace with lower temp HP value', () => {
      const combatant = createMockCombatant({
        tempHP: 15
      });

      const result = CalculationService.calculateTempHP(combatant, 10);

      expect(result.newTempHP).toBe(15);
      expect(result.actualGain).toBe(0);
      expect(result.wasReplaced).toBe(false);
      expect(result.wasIgnored).toBe(true);
    });

    test('should handle 0 temp HP', () => {
      const combatant = createMockCombatant({
        tempHP: 5
      });

      const result = CalculationService.calculateTempHP(combatant, 0);

      expect(result.newTempHP).toBe(5);
      expect(result.actualGain).toBe(0);
      expect(result.wasIgnored).toBe(true);
    });

    test('should handle negative temp HP as keeping current', () => {
      const combatant = createMockCombatant({
        tempHP: 5
      });

      const result = CalculationService.calculateTempHP(combatant, -10);

      expect(result.newTempHP).toBe(5);
      expect(result.actualGain).toBe(0);
      expect(result.wasIgnored).toBe(true);
    });
  });

  describe('applyDamageResistances', () => {
    test('should halve damage for resistance', () => {
      const combatant = createMockCombatant({
        resistances: ['fire']
      });

      const result = CalculationService.applyDamageResistances(10, 'fire', combatant);
      expect(result).toBe(5);
    });

    test('should round down halved damage', () => {
      const combatant = createMockCombatant({
        resistances: ['fire']
      });

      const result = CalculationService.applyDamageResistances(11, 'fire', combatant);
      expect(result).toBe(5);
    });

    test('should reduce to 0 for immunity', () => {
      const combatant = createMockCombatant({
        immunities: ['poison']
      });

      const result = CalculationService.applyDamageResistances(20, 'poison', combatant);
      expect(result).toBe(0);
    });

    test('should double damage for vulnerability', () => {
      const combatant = createMockCombatant({
        vulnerabilities: ['cold']
      });

      const result = CalculationService.applyDamageResistances(10, 'cold', combatant);
      expect(result).toBe(20);
    });

    test('should return original damage for no resistance', () => {
      const combatant = createMockCombatant({
        resistances: ['fire']
      });

      const result = CalculationService.applyDamageResistances(10, 'slashing', combatant);
      expect(result).toBe(10);
    });

    test('should return original damage when no modifiers exist', () => {
      const combatant = createMockCombatant({});

      const result = CalculationService.applyDamageResistances(10, 'fire', combatant);
      expect(result).toBe(10);
    });

    test('should handle 0 damage with resistance', () => {
      const combatant = createMockCombatant({
        resistances: ['fire']
      });

      const result = CalculationService.applyDamageResistances(0, 'fire', combatant);
      expect(result).toBe(0);
    });
  });
});