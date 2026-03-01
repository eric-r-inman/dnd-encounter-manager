/**
 * Unit tests for CalculationService
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
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

      expect(result.currentHP).toBe(15);
      expect(result.tempHP).toBe(0);
      expect(result.damageApplied).toBe(5);
      expect(result.tempHPLost).toBe(0);
    });

    test('should apply damage to temp HP first', () => {
      const combatant = createMockCombatant({
        currentHP: 20,
        tempHP: 10,
        maxHP: 25
      });

      const result = CalculationService.calculateDamage(combatant, 7);

      expect(result.currentHP).toBe(20);
      expect(result.tempHP).toBe(3);
      expect(result.damageApplied).toBe(7);
      expect(result.tempHPLost).toBe(7);
    });

    test('should overflow damage from temp HP to current HP', () => {
      const combatant = createMockCombatant({
        currentHP: 20,
        tempHP: 5,
        maxHP: 25
      });

      const result = CalculationService.calculateDamage(combatant, 10);

      expect(result.currentHP).toBe(15);
      expect(result.tempHP).toBe(0);
      expect(result.damageApplied).toBe(10);
      expect(result.tempHPLost).toBe(5);
    });

    test('should not reduce HP below 0', () => {
      const combatant = createMockCombatant({
        currentHP: 5,
        tempHP: 0,
        maxHP: 25
      });

      const result = CalculationService.calculateDamage(combatant, 10);

      expect(result.currentHP).toBe(0);
      expect(result.tempHP).toBe(0);
      expect(result.damageApplied).toBe(5);
    });

    test('should handle 0 damage', () => {
      const combatant = createMockCombatant({
        currentHP: 20,
        tempHP: 5,
        maxHP: 25
      });

      const result = CalculationService.calculateDamage(combatant, 0);

      expect(result.currentHP).toBe(20);
      expect(result.tempHP).toBe(5);
      expect(result.damageApplied).toBe(0);
      expect(result.tempHPLost).toBe(0);
    });

    test('should handle negative damage as 0', () => {
      const combatant = createMockCombatant({
        currentHP: 20,
        tempHP: 5,
        maxHP: 25
      });

      const result = CalculationService.calculateDamage(combatant, -5);

      expect(result.currentHP).toBe(20);
      expect(result.tempHP).toBe(5);
      expect(result.damageApplied).toBe(0);
      expect(result.tempHPLost).toBe(0);
    });
  });

  describe('calculateHealing', () => {
    test('should heal up to max HP', () => {
      const combatant = createMockCombatant({
        currentHP: 10,
        maxHP: 25
      });

      const result = CalculationService.calculateHealing(combatant, 10);

      expect(result.currentHP).toBe(20);
      expect(result.healingApplied).toBe(10);
    });

    test('should not heal beyond max HP', () => {
      const combatant = createMockCombatant({
        currentHP: 20,
        maxHP: 25
      });

      const result = CalculationService.calculateHealing(combatant, 10);

      expect(result.currentHP).toBe(25);
      expect(result.healingApplied).toBe(5);
    });

    test('should handle 0 healing', () => {
      const combatant = createMockCombatant({
        currentHP: 15,
        maxHP: 25
      });

      const result = CalculationService.calculateHealing(combatant, 0);

      expect(result.currentHP).toBe(15);
      expect(result.healingApplied).toBe(0);
    });

    test('should handle negative healing as 0', () => {
      const combatant = createMockCombatant({
        currentHP: 15,
        maxHP: 25
      });

      const result = CalculationService.calculateHealing(combatant, -5);

      expect(result.currentHP).toBe(15);
      expect(result.healingApplied).toBe(0);
    });

    test('should heal from 0 HP (unconscious)', () => {
      const combatant = createMockCombatant({
        currentHP: 0,
        maxHP: 25
      });

      const result = CalculationService.calculateHealing(combatant, 5);

      expect(result.currentHP).toBe(5);
      expect(result.healingApplied).toBe(5);
    });
  });

  describe('calculateTempHP', () => {
    test('should set temp HP when none exists', () => {
      const combatant = createMockCombatant({
        tempHP: 0
      });

      const result = CalculationService.calculateTempHP(combatant, 10);

      expect(result.tempHP).toBe(10);
      expect(result.tempHPGained).toBe(10);
    });

    test('should keep higher temp HP value', () => {
      const combatant = createMockCombatant({
        tempHP: 5
      });

      const result = CalculationService.calculateTempHP(combatant, 10);

      expect(result.tempHP).toBe(10);
      expect(result.tempHPGained).toBe(10);
    });

    test('should not replace with lower temp HP value', () => {
      const combatant = createMockCombatant({
        tempHP: 15
      });

      const result = CalculationService.calculateTempHP(combatant, 10);

      expect(result.tempHP).toBe(15);
      expect(result.tempHPGained).toBe(0);
    });

    test('should handle 0 temp HP', () => {
      const combatant = createMockCombatant({
        tempHP: 5
      });

      const result = CalculationService.calculateTempHP(combatant, 0);

      expect(result.tempHP).toBe(5);
      expect(result.tempHPGained).toBe(0);
    });

    test('should handle negative temp HP as 0', () => {
      const combatant = createMockCombatant({
        tempHP: 5
      });

      const result = CalculationService.calculateTempHP(combatant, -10);

      expect(result.tempHP).toBe(5);
      expect(result.tempHPGained).toBe(0);
    });
  });

  describe('applyDamageResistances', () => {
    test('should halve damage for resistance', () => {
      const result = CalculationService.applyDamageResistances(10, 'resistance');
      expect(result).toBe(5);
    });

    test('should round down halved damage', () => {
      const result = CalculationService.applyDamageResistances(11, 'resistance');
      expect(result).toBe(5);
    });

    test('should reduce to 0 for immunity', () => {
      const result = CalculationService.applyDamageResistances(20, 'immunity');
      expect(result).toBe(0);
    });

    test('should double damage for vulnerability', () => {
      const result = CalculationService.applyDamageResistances(10, 'vulnerability');
      expect(result).toBe(20);
    });

    test('should return original damage for no resistance', () => {
      const result = CalculationService.applyDamageResistances(10, 'none');
      expect(result).toBe(10);
    });

    test('should handle invalid resistance type', () => {
      const result = CalculationService.applyDamageResistances(10, 'invalid');
      expect(result).toBe(10);
    });

    test('should handle 0 damage with resistance', () => {
      const result = CalculationService.applyDamageResistances(0, 'resistance');
      expect(result).toBe(0);
    });
  });
});