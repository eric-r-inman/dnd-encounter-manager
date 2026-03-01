/**
 * Unit tests for StorageService
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { StorageService } from '../../../src/scripts/services/storage-service.js';
import { createMockEncounter, MockLocalStorage } from '../../test-helpers.js';

describe('StorageService', () => {
  let mockStorage;

  beforeEach(() => {
    // Create a fresh mock localStorage for each test
    mockStorage = new MockLocalStorage();
    global.localStorage = mockStorage;

    // Clear any existing data
    StorageService.clearAll();
  });

  describe('saveEncounter', () => {
    test('should save encounter to localStorage', () => {
      const encounter = createMockEncounter();

      StorageService.saveEncounter(encounter);

      const stored = JSON.parse(mockStorage.getItem('dnd-encounters'));
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe(encounter.id);
      expect(stored[0].name).toBe(encounter.name);
    });

    test('should add to existing encounters', () => {
      const encounter1 = createMockEncounter({ id: 'enc-1', name: 'Encounter 1' });
      const encounter2 = createMockEncounter({ id: 'enc-2', name: 'Encounter 2' });

      StorageService.saveEncounter(encounter1);
      StorageService.saveEncounter(encounter2);

      const stored = JSON.parse(mockStorage.getItem('dnd-encounters'));
      expect(stored).toHaveLength(2);
      expect(stored.map(e => e.id)).toContain('enc-1');
      expect(stored.map(e => e.id)).toContain('enc-2');
    });

    test('should update existing encounter with same ID', () => {
      const original = createMockEncounter({ id: 'enc-1', name: 'Original' });
      const updated = createMockEncounter({ id: 'enc-1', name: 'Updated' });

      StorageService.saveEncounter(original);
      StorageService.saveEncounter(updated);

      const stored = JSON.parse(mockStorage.getItem('dnd-encounters'));
      expect(stored).toHaveLength(1);
      expect(stored[0].name).toBe('Updated');
    });

    test('should handle save errors gracefully', () => {
      const encounter = createMockEncounter();
      mockStorage.setItem = jest.fn().mockImplementation(() => {
        throw new Error('Storage full');
      });

      expect(() => StorageService.saveEncounter(encounter)).not.toThrow();
    });
  });

  describe('loadEncounter', () => {
    test('should load encounter by ID', () => {
      const encounter = createMockEncounter({ id: 'enc-1' });
      mockStorage.setItem('dnd-encounters', JSON.stringify([encounter]));

      const loaded = StorageService.loadEncounter('enc-1');

      expect(loaded).toBeTruthy();
      expect(loaded.id).toBe('enc-1');
      expect(loaded.name).toBe(encounter.name);
    });

    test('should return null for non-existent encounter', () => {
      const encounter = createMockEncounter({ id: 'enc-1' });
      mockStorage.setItem('dnd-encounters', JSON.stringify([encounter]));

      const loaded = StorageService.loadEncounter('non-existent');

      expect(loaded).toBeNull();
    });

    test('should handle empty encounters list', () => {
      mockStorage.setItem('dnd-encounters', JSON.stringify([]));

      const loaded = StorageService.loadEncounter('any-id');

      expect(loaded).toBeNull();
    });

    test('should handle corrupted data gracefully', () => {
      mockStorage.setItem('dnd-encounters', 'invalid json');

      const loaded = StorageService.loadEncounter('enc-1');

      expect(loaded).toBeNull();
    });
  });

  describe('getEncounters', () => {
    test('should return all encounters', () => {
      const encounters = [
        createMockEncounter({ id: 'enc-1' }),
        createMockEncounter({ id: 'enc-2' }),
        createMockEncounter({ id: 'enc-3' })
      ];
      mockStorage.setItem('dnd-encounters', JSON.stringify(encounters));

      const loaded = StorageService.getEncounters();

      expect(loaded).toHaveLength(3);
      expect(loaded.map(e => e.id)).toEqual(['enc-1', 'enc-2', 'enc-3']);
    });

    test('should return empty array when no encounters', () => {
      const loaded = StorageService.getEncounters();

      expect(loaded).toEqual([]);
    });

    test('should handle corrupted data', () => {
      mockStorage.setItem('dnd-encounters', 'not valid json');

      const loaded = StorageService.getEncounters();

      expect(loaded).toEqual([]);
    });
  });

  describe('deleteEncounter', () => {
    test('should delete encounter by ID', () => {
      const encounters = [
        createMockEncounter({ id: 'enc-1' }),
        createMockEncounter({ id: 'enc-2' }),
        createMockEncounter({ id: 'enc-3' })
      ];
      mockStorage.setItem('dnd-encounters', JSON.stringify(encounters));

      StorageService.deleteEncounter('enc-2');

      const stored = JSON.parse(mockStorage.getItem('dnd-encounters'));
      expect(stored).toHaveLength(2);
      expect(stored.map(e => e.id)).toEqual(['enc-1', 'enc-3']);
    });

    test('should handle deletion of non-existent encounter', () => {
      const encounters = [createMockEncounter({ id: 'enc-1' })];
      mockStorage.setItem('dnd-encounters', JSON.stringify(encounters));

      StorageService.deleteEncounter('non-existent');

      const stored = JSON.parse(mockStorage.getItem('dnd-encounters'));
      expect(stored).toHaveLength(1);
    });

    test('should handle empty encounters list', () => {
      mockStorage.setItem('dnd-encounters', JSON.stringify([]));

      expect(() => StorageService.deleteEncounter('any-id')).not.toThrow();
    });
  });

  describe('saveCreatures', () => {
    test('should save creatures to localStorage', () => {
      const creatures = [
        { id: 'c1', name: 'Goblin' },
        { id: 'c2', name: 'Orc' }
      ];

      StorageService.saveCreatures(creatures);

      const stored = JSON.parse(mockStorage.getItem('dnd-custom-creatures'));
      expect(stored).toEqual(creatures);
    });

    test('should overwrite existing creatures', () => {
      const oldCreatures = [{ id: 'old', name: 'Old' }];
      const newCreatures = [{ id: 'new', name: 'New' }];

      StorageService.saveCreatures(oldCreatures);
      StorageService.saveCreatures(newCreatures);

      const stored = JSON.parse(mockStorage.getItem('dnd-custom-creatures'));
      expect(stored).toEqual(newCreatures);
    });
  });

  describe('getCreatures', () => {
    test('should return saved creatures', () => {
      const creatures = [
        { id: 'c1', name: 'Goblin' },
        { id: 'c2', name: 'Orc' }
      ];
      mockStorage.setItem('dnd-custom-creatures', JSON.stringify(creatures));

      const loaded = StorageService.getCreatures();

      expect(loaded).toEqual(creatures);
    });

    test('should return empty array when no creatures', () => {
      const loaded = StorageService.getCreatures();

      expect(loaded).toEqual([]);
    });

    test('should handle corrupted data', () => {
      mockStorage.setItem('dnd-custom-creatures', 'invalid');

      const loaded = StorageService.getCreatures();

      expect(loaded).toEqual([]);
    });
  });

  describe('clearAll', () => {
    test('should clear all D&D related storage', () => {
      // Set up various storage items
      mockStorage.setItem('dnd-encounters', JSON.stringify(['encounter']));
      mockStorage.setItem('dnd-custom-creatures', JSON.stringify(['creature']));
      mockStorage.setItem('dnd-preferences', JSON.stringify({ theme: 'dark' }));
      mockStorage.setItem('other-key', 'should not be cleared');

      StorageService.clearAll();

      // Check D&D keys are cleared
      expect(mockStorage.getItem('dnd-encounters')).toBeNull();
      expect(mockStorage.getItem('dnd-custom-creatures')).toBeNull();
      expect(mockStorage.getItem('dnd-preferences')).toBeNull();

      // Other keys should remain
      expect(mockStorage.getItem('other-key')).toBe('should not be cleared');
    });

    test('should handle clear errors gracefully', () => {
      mockStorage.removeItem = jest.fn().mockImplementation(() => {
        throw new Error('Clear failed');
      });

      expect(() => StorageService.clearAll()).not.toThrow();
    });
  });

  describe('getPreferences and savePreferences', () => {
    test('should save and retrieve preferences', () => {
      const prefs = { theme: 'dark', autoSave: true };

      StorageService.savePreferences(prefs);
      const loaded = StorageService.getPreferences();

      expect(loaded).toEqual(prefs);
    });

    test('should return empty object when no preferences', () => {
      const loaded = StorageService.getPreferences();

      expect(loaded).toEqual({});
    });

    test('should merge preferences on save', () => {
      StorageService.savePreferences({ theme: 'dark' });
      StorageService.savePreferences({ autoSave: true });

      const loaded = StorageService.getPreferences();

      expect(loaded).toEqual({ theme: 'dark', autoSave: true });
    });

    test('should override existing preference values', () => {
      StorageService.savePreferences({ theme: 'dark' });
      StorageService.savePreferences({ theme: 'light' });

      const loaded = StorageService.getPreferences();

      expect(loaded.theme).toBe('light');
    });
  });
});