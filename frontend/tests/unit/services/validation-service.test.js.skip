/**
 * Unit tests for ValidationService
 */

import { describe, test, expect } from '@jest/globals';
import { ValidationService } from '../../../src/scripts/services/validation-service.js';
import { createMockCombatant, createMockCreature } from '../../test-helpers.js';

describe('ValidationService', () => {
  describe('validateCombatant', () => {
    test('should validate a proper combatant', () => {
      const combatant = createMockCombatant();
      const result = ValidationService.validateCombatant(combatant);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect missing required fields', () => {
      const combatant = {
        name: 'Test',
        // Missing id, type, ac, maxHP, currentHP
      };

      const result = ValidationService.validateCombatant(combatant);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: id');
      expect(result.errors).toContain('Missing required field: type');
      expect(result.errors).toContain('Missing required field: ac');
    });

    test('should validate combatant type', () => {
      const combatant = createMockCombatant({ type: 'invalid-type' });

      const result = ValidationService.validateCombatant(combatant);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid combatant type: invalid-type');
    });

    test('should validate numeric fields', () => {
      const combatant = createMockCombatant({
        ac: 'not-a-number',
        maxHP: -10,
        currentHP: 100,
        initiative: 'text'
      });

      const result = ValidationService.validateCombatant(combatant);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should validate HP relationships', () => {
      const combatant = createMockCombatant({
        currentHP: 30,
        maxHP: 20
      });

      const result = ValidationService.validateCombatant(combatant);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Current HP cannot exceed max HP');
    });

    test('should validate temp HP is non-negative', () => {
      const combatant = createMockCombatant({
        tempHP: -5
      });

      const result = ValidationService.validateCombatant(combatant);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Temp HP cannot be negative');
    });
  });

  describe('validateCreature', () => {
    test('should validate a proper creature', () => {
      const creature = createMockCreature();
      const result = ValidationService.validateCreature(creature);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect missing required creature fields', () => {
      const creature = {
        name: 'Test Creature'
        // Missing id, type, ac, maxHP
      };

      const result = ValidationService.validateCreature(creature);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: id');
      expect(result.errors).toContain('Missing required field: type');
      expect(result.errors).toContain('Missing required field: ac');
      expect(result.errors).toContain('Missing required field: maxHP');
    });

    test('should validate creature CR format', () => {
      const validCRs = ['1/8', '1/4', '1/2', '1', '5', '20', '30'];
      const invalidCRs = ['abc', '1/3', '-1', '40'];

      validCRs.forEach(cr => {
        const creature = createMockCreature({ cr });
        const result = ValidationService.validateCreature(creature);
        expect(result.isValid).toBe(true);
      });

      invalidCRs.forEach(cr => {
        const creature = createMockCreature({ cr });
        const result = ValidationService.validateCreature(creature);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(`Invalid CR value: ${cr}`);
      });
    });

    test('should validate ability scores', () => {
      const creature = createMockCreature({
        statBlock: {
          abilities: {
            STR: 35, // Too high
            DEX: 0,  // Too low
            CON: 10,
            INT: 10,
            WIS: 10,
            CHA: 'text' // Not a number
          }
        }
      });

      const result = ValidationService.validateCreature(creature);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateForm', () => {
    test('should validate form with required fields', () => {
      const formData = {
        name: 'Test Name',
        type: 'enemy',
        ac: 15,
        maxHP: 20
      };

      const rules = {
        name: { required: true },
        type: { required: true },
        ac: { required: true, min: 0 },
        maxHP: { required: true, min: 1 }
      };

      const result = ValidationService.validateForm(formData, rules);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    test('should detect missing required fields', () => {
      const formData = {
        type: 'enemy'
        // Missing name
      };

      const rules = {
        name: { required: true },
        type: { required: true }
      };

      const result = ValidationService.validateForm(formData, rules);

      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe('This field is required');
    });

    test('should validate min/max constraints', () => {
      const formData = {
        ac: -5,
        maxHP: 0,
        initiative: 35
      };

      const rules = {
        ac: { min: 0, max: 30 },
        maxHP: { min: 1 },
        initiative: { max: 30 }
      };

      const result = ValidationService.validateForm(formData, rules);

      expect(result.isValid).toBe(false);
      expect(result.errors.ac).toContain('Must be at least 0');
      expect(result.errors.maxHP).toContain('Must be at least 1');
      expect(result.errors.initiative).toContain('Must be at most 30');
    });

    test('should validate pattern matching', () => {
      const formData = {
        email: 'not-an-email',
        code: 'ABC123'
      };

      const rules = {
        email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        code: { pattern: /^[A-Z]{3}\d{3}$/ }
      };

      const result = ValidationService.validateForm(formData, rules);

      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('Invalid format');
      expect(result.errors.code).toBeUndefined();
    });

    test('should validate custom validators', () => {
      const formData = {
        password: 'weak',
        confirmPassword: 'different'
      };

      const rules = {
        password: {
          custom: (value) => value.length >= 8 ? null : 'Password too short'
        },
        confirmPassword: {
          custom: (value, formData) =>
            value === formData.password ? null : 'Passwords do not match'
        }
      };

      const result = ValidationService.validateForm(formData, rules);

      expect(result.isValid).toBe(false);
      expect(result.errors.password).toBe('Password too short');
      expect(result.errors.confirmPassword).toBe('Passwords do not match');
    });
  });

  describe('validateRange', () => {
    test('should validate values within range', () => {
      expect(ValidationService.validateRange(5, 0, 10)).toBe(true);
      expect(ValidationService.validateRange(0, 0, 10)).toBe(true);
      expect(ValidationService.validateRange(10, 0, 10)).toBe(true);
    });

    test('should reject values outside range', () => {
      expect(ValidationService.validateRange(-1, 0, 10)).toBe(false);
      expect(ValidationService.validateRange(11, 0, 10)).toBe(false);
    });

    test('should handle no max limit', () => {
      expect(ValidationService.validateRange(1000, 0)).toBe(true);
      expect(ValidationService.validateRange(-1, 0)).toBe(false);
    });

    test('should handle no min limit', () => {
      expect(ValidationService.validateRange(-1000, null, 0)).toBe(true);
      expect(ValidationService.validateRange(1, null, 0)).toBe(false);
    });

    test('should handle non-numeric values', () => {
      expect(ValidationService.validateRange('text', 0, 10)).toBe(false);
      expect(ValidationService.validateRange(NaN, 0, 10)).toBe(false);
      expect(ValidationService.validateRange(null, 0, 10)).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    test('should trim whitespace', () => {
      expect(ValidationService.sanitizeInput('  test  ')).toBe('test');
    });

    test('should escape HTML characters', () => {
      expect(ValidationService.sanitizeInput('<script>alert("xss")</script>'))
        .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    test('should handle special characters', () => {
      expect(ValidationService.sanitizeInput("Test & D&D's <special>"))
        .toBe("Test &amp; D&amp;D&#039;s &lt;special&gt;");
    });

    test('should handle empty and null values', () => {
      expect(ValidationService.sanitizeInput('')).toBe('');
      expect(ValidationService.sanitizeInput(null)).toBe('');
      expect(ValidationService.sanitizeInput(undefined)).toBe('');
    });

    test('should preserve numbers', () => {
      expect(ValidationService.sanitizeInput(123)).toBe('123');
      expect(ValidationService.sanitizeInput(0)).toBe('0');
    });
  });
});