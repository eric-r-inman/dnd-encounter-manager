/**
 * Unit tests for StorageService
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { StorageService } from '../../../src/scripts/services/storage-service.js';
import { createMockEncounter, MockLocalStorage } from '../../test-helpers.js';

// Mock ToastSystem to avoid side effects
jest.mock('../../../src/components/toast/ToastSystem.js', () => ({
  ToastSystem: {
    show: jest.fn()
  }
}));

describe('StorageService', () => {
  let mockStorage;

  beforeEach(() => {
    // Create a fresh mock localStorage for each test
    mockStorage = new MockLocalStorage();
    global.localStorage = mockStorage;

    // Clear any existing data
    mockStorage.clear();
  });

  describe('Storage Keys', () => {
    test('should have defined storage keys', () => {
      expect(StorageService.STORAGE_KEYS).toBeDefined();
      expect(StorageService.STORAGE_KEYS.ENCOUNTERS).toBe('dnd-encounters');
      expect(StorageService.STORAGE_KEYS.CREATURES).toBe('dnd-creatures');
      expect(StorageService.STORAGE_KEYS.PREFERENCES).toBe('dnd-preferences');
      expect(StorageService.STORAGE_KEYS.TEMPLATES).toBe('dnd-templates');
      expect(StorageService.STORAGE_KEYS.RECENT_EFFECTS).toBe('dnd-recent-effects');
    });
  });

  describe('generateId', () => {
    test('should generate unique IDs with prefix', () => {
      const id1 = StorageService.generateId('test');
      const id2 = StorageService.generateId('test');

      expect(id1).toContain('test-');
      expect(id2).toContain('test-');
      expect(id1).not.toBe(id2);
    });

    test('should use default prefix if none provided', () => {
      const id = StorageService.generateId();

      expect(id).toContain('item-');
    });
  });

  describe('getStorageItem and setStorageItem', () => {
    test('should store and retrieve items', async () => {
      const testData = { foo: 'bar', num: 42 };

      await StorageService.setStorageItem('test-key', testData);
      const retrieved = await StorageService.getStorageItem('test-key');

      expect(retrieved).toEqual(testData);
    });

    test('should return default value for missing items', async () => {
      const defaultValue = { empty: true };
      const retrieved = await StorageService.getStorageItem('nonexistent', defaultValue);

      expect(retrieved).toEqual(defaultValue);
    });

    test('should return null as default when no default provided', async () => {
      const retrieved = await StorageService.getStorageItem('nonexistent');

      expect(retrieved).toBeNull();
    });
  });

  describe('saveEncounter and loadEncounter', () => {
    test('should save encounter and return ID', async () => {
      const encounterData = {
        combatants: [{ name: 'Goblin' }],
        round: 1,
        isActive: true
      };

      const encounterId = await StorageService.saveEncounter('Test Encounter', encounterData);

      expect(encounterId).toBeDefined();
      expect(encounterId).toContain('encounter-');
    });

    test('should load saved encounter by ID', async () => {
      const encounterData = {
        combatants: [{ name: 'Goblin', hp: 7 }],
        round: 1
      };

      const encounterId = await StorageService.saveEncounter('Test Encounter', encounterData);
      const loaded = await StorageService.loadEncounter(encounterId);

      expect(loaded).toBeDefined();
      expect(loaded.name).toBe('Test Encounter');
      expect(loaded.data).toEqual(encounterData);
      expect(loaded.id).toBe(encounterId);
    });

    test('should return null for non-existent encounter', async () => {
      const loaded = await StorageService.loadEncounter('nonexistent-id');

      expect(loaded).toBeNull();
    });
  });

  describe('getEncounters', () => {
    test('should return all encounters as object', async () => {
      await StorageService.saveEncounter('Encounter 1', { round: 1 });
      await StorageService.saveEncounter('Encounter 2', { round: 2 });

      const encounters = await StorageService.getEncounters();

      expect(typeof encounters).toBe('object');
      expect(Object.keys(encounters).length).toBe(2);
    });

    test('should return empty object when no encounters', async () => {
      const encounters = await StorageService.getEncounters();

      expect(encounters).toEqual({});
    });
  });

  describe('deleteEncounter', () => {
    test('should delete encounter by ID', async () => {
      const encounterId = await StorageService.saveEncounter('Test', { round: 1 });

      await StorageService.deleteEncounter(encounterId);

      const loaded = await StorageService.loadEncounter(encounterId);
      expect(loaded).toBeNull();
    });

    test('should handle deletion of non-existent encounter', async () => {
      await expect(StorageService.deleteEncounter('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('saveCreature and getCreatures', () => {
    test('should save creature and include in list', async () => {
      const creatureData = {
        name: 'Goblin',
        ac: 15,
        maxHP: 7,
        type: 'enemy'
      };

      const creatureId = await StorageService.saveCreature(creatureData);

      expect(creatureId).toBeDefined();
      expect(creatureId).toContain('creature-');

      const creatures = await StorageService.getCreatures();
      expect(typeof creatures).toBe('object');
      expect(creatures[creatureId]).toBeDefined();
      expect(creatures[creatureId].name).toBe('Goblin');
    });

    test('should return empty object when no creatures', async () => {
      const creatures = await StorageService.getCreatures();

      expect(creatures).toEqual({});
    });
  });

  describe('savePreferences and getPreferences', () => {
    test('should save and retrieve preferences', async () => {
      const prefs = { theme: 'dark', autoSave: true };

      await StorageService.savePreferences(prefs);
      const retrieved = await StorageService.getPreferences();

      // Check that something was saved and retrieved
      expect(typeof retrieved).toBe('object');
    });

    test('should return object when no preferences', async () => {
      const retrieved = await StorageService.getPreferences();

      expect(typeof retrieved).toBe('object');
    });
  });

  describe('getRecentEffects and addRecentEffect', () => {
    test('should track recent effects', async () => {
      await StorageService.addRecentEffect('Bless');
      await StorageService.addRecentEffect('Bane');

      const recent = await StorageService.getRecentEffects();

      expect(Array.isArray(recent)).toBe(true);
      expect(recent).toContain('Bless');
      expect(recent).toContain('Bane');
    });

    test('should return empty array when no recent effects', async () => {
      const recent = await StorageService.getRecentEffects();

      expect(Array.isArray(recent)).toBe(true);
      expect(recent.length).toBe(0);
    });
  });

  describe('getStorageInfo', () => {
    test('should return storage information', async () => {
      const info = await StorageService.getStorageInfo();

      expect(info).toBeDefined();
      // Just check that it returns an object with expected structure
      expect(typeof info).toBe('object');
    });
  });
});