/**
 * StorageService - Data persistence and storage operations
 *
 * Handles all data storage operations including:
 * - Encounter save/load functionality
 * - Creature database management
 * - User preferences storage
 * - Template and preset management
 * - Import/export operations
 * - Data cleanup and maintenance
 *
 * All persistence is routed through the Rust server REST API.
 *
 * @version 2.0.0
 */

import { PersistentState } from '../state/persistent-state.js';
import { ToastSystem } from '../../components/toast/ToastSystem.js';
import { ApiClient } from './api-client.js';

export class StorageService {
    // Keep keys as constants for backward-compatible references
    static STORAGE_KEYS = {
        ENCOUNTERS: 'dnd-encounters',
        CREATURES: 'dnd-creatures',
        PREFERENCES: 'dnd-preferences',
        TEMPLATES: 'dnd-templates',
        RECENT_EFFECTS: 'dnd-recent-effects'
    };

    /**
     * Save current encounter
     * @param {string} name - Encounter name
     * @param {Object} encounterData - Encounter data to save
     * @returns {Promise<string>} Encounter ID
     */
    static async saveEncounter(name, encounterData) {
        try {
            const encounterId = this.generateId('encounter');

            const encounter = {
                id: encounterId,
                name: name.trim(),
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                version: '1.0.0',
                data: encounterData
            };

            await ApiClient.post('/encounters', encounter);

            console.log(`✅ Saved encounter: ${name} (${encounterId})`);
            ToastSystem.show(`Encounter "${name}" saved`, 'success', 2000);

            return encounterId;
        } catch (error) {
            console.error('Failed to save encounter:', error);
            ToastSystem.show(`Failed to save encounter: ${error.message}`, 'error', 3000);
            throw error;
        }
    }

    /**
     * Load encounter by ID
     * @param {string} encounterId - Encounter ID
     * @returns {Promise<Object|null>} Encounter data or null
     */
    static async loadEncounter(encounterId) {
        try {
            const encounter = await ApiClient.get(`/encounters/${encounterId}`);

            if (!encounter) {
                throw new Error(`Encounter not found: ${encounterId}`);
            }

            console.log(`✅ Loaded encounter: ${encounter.name}`);
            return encounter;
        } catch (error) {
            console.error('Failed to load encounter:', error);
            ToastSystem.show(`Failed to load encounter: ${error.message}`, 'error', 3000);
            throw error;
        }
    }

    /**
     * Get all saved encounters
     * @returns {Promise<Object>} Object with encounter IDs as keys
     */
    static async getEncounters() {
        try {
            return await ApiClient.get('/encounters');
        } catch (error) {
            console.warn('Failed to load encounters, returning empty object:', error);
            return {};
        }
    }

    /**
     * Delete encounter
     * @param {string} encounterId - Encounter ID
     * @returns {Promise<boolean>} Success status
     */
    static async deleteEncounter(encounterId) {
        try {
            // Get encounter name for toast before deleting
            let encounterName = 'Unknown';
            try {
                const encounter = await ApiClient.get(`/encounters/${encounterId}`);
                encounterName = encounter?.name || 'Unknown';
            } catch { /* proceed with delete even if name lookup fails */ }

            await ApiClient.delete(`/encounters/${encounterId}`);

            console.log(`✅ Deleted encounter: ${encounterName}`);
            ToastSystem.show(`Encounter "${encounterName}" deleted`, 'info', 2000);

            return true;
        } catch (error) {
            console.error('Failed to delete encounter:', error);
            ToastSystem.show(`Failed to delete encounter: ${error.message}`, 'error', 3000);
            throw error;
        }
    }

    /**
     * Save creature to database
     * @param {Object} creatureData - Creature data
     * @returns {Promise<string>} Creature ID
     */
    static async saveCreature(creatureData) {
        try {
            const creatureId = this.generateId('creature');

            const creature = {
                id: creatureId,
                name: creatureData.name.trim(),
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                version: '1.0.0',
                ...creatureData
            };

            await ApiClient.post('/creatures', creature);

            console.log(`✅ Saved creature: ${creature.name} (${creatureId})`);
            ToastSystem.show(`Creature "${creature.name}" saved`, 'success', 2000);

            return creatureId;
        } catch (error) {
            console.error('Failed to save creature:', error);
            ToastSystem.show(`Failed to save creature: ${error.message}`, 'error', 3000);
            throw error;
        }
    }

    /**
     * Get all creatures from database
     * @returns {Promise<Object>} Object with creature IDs as keys
     */
    static async getCreatures() {
        try {
            return await ApiClient.get('/creatures');
        } catch (error) {
            console.warn('Failed to load creatures, returning empty object:', error);
            return {};
        }
    }

    /**
     * Search creatures by name or type
     * @param {string} query - Search query
     * @returns {Promise<Array>} Matching creatures
     */
    static async searchCreatures(query) {
        try {
            const creaturesDb = await this.getCreatures();
            const creatures = creaturesDb.creatures || [];
            const searchTerm = query.toLowerCase().trim();

            if (!searchTerm) {
                return creatures;
            }

            return creatures.filter(creature =>
                creature.name.toLowerCase().includes(searchTerm) ||
                creature.type?.toLowerCase().includes(searchTerm) ||
                creature.challenge?.toString().includes(searchTerm)
            );
        } catch (error) {
            console.error('Failed to search creatures:', error);
            return [];
        }
    }

    /**
     * Save user preferences
     * @param {Object} preferences - User preferences
     * @returns {Promise<boolean>} Success status
     */
    static async savePreferences(preferences) {
        try {
            await ApiClient.put('/preferences', { ...preferences, modified: new Date().toISOString() });
            console.log('✅ Preferences saved');
            return true;
        } catch (error) {
            console.error('Failed to save preferences:', error);
            ToastSystem.show(`Failed to save preferences: ${error.message}`, 'error', 3000);
            throw error;
        }
    }

    /**
     * Get user preferences
     * @returns {Promise<Object>} User preferences
     */
    static async getPreferences() {
        try {
            const defaults = {
                autoSave: true,
                showTooltips: true,
                showHealthBars: true,
                defaultInitiative: 10,
                confirmActions: true,
                theme: 'default'
            };

            const stored = await ApiClient.get('/preferences');
            return { ...defaults, ...(stored || {}) };
        } catch (error) {
            console.warn('Failed to load preferences, using defaults:', error);
            return {
                autoSave: true,
                showTooltips: true,
                showHealthBars: true,
                defaultInitiative: 10,
                confirmActions: true,
                theme: 'default'
            };
        }
    }

    /**
     * Save template
     * @param {string} name - Template name
     * @param {Object} templateData - Template data
     * @returns {Promise<string>} Template ID
     */
    static async saveTemplate(name, templateData) {
        try {
            const templateId = this.generateId('template');

            const template = {
                id: templateId,
                name: name.trim(),
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                data: templateData
            };

            await ApiClient.post('/state/templates', template);

            console.log(`✅ Saved template: ${name} (${templateId})`);
            ToastSystem.show(`Template "${name}" saved`, 'success', 2000);

            return templateId;
        } catch (error) {
            console.error('Failed to save template:', error);
            ToastSystem.show(`Failed to save template: ${error.message}`, 'error', 3000);
            throw error;
        }
    }

    /**
     * Get all templates
     * @returns {Promise<Object>} Object with template IDs as keys
     */
    static async getTemplates() {
        try {
            return await ApiClient.get('/state/templates');
        } catch (error) {
            console.warn('Failed to load templates, returning empty object:', error);
            return {};
        }
    }

    /**
     * Add to recent effects list
     * @param {string} effectName - Effect name to add
     * @returns {Promise<boolean>} Success status
     */
    static async addRecentEffect(effectName) {
        try {
            if (!effectName?.trim()) return false;

            await ApiClient.post('/state/recent-effects', { effect: effectName.trim() });
            return true;
        } catch (error) {
            console.error('Failed to add recent effect:', error);
            return false;
        }
    }

    /**
     * Get recent effects list
     * @returns {Promise<Array>} Recent effects
     */
    static async getRecentEffects() {
        try {
            return await ApiClient.get('/state/recent-effects');
        } catch (error) {
            console.warn('Failed to load recent effects:', error);
            return [];
        }
    }

    /**
     * Export all data for backup
     * @returns {Promise<Object>} All stored data
     */
    static async exportAllData() {
        try {
            const data = await ApiClient.get('/export');
            console.log('✅ Exported all data');
            return data;
        } catch (error) {
            console.error('Failed to export data:', error);
            throw error;
        }
    }

    /**
     * Import data from backup
     * @param {Object} data - Data to import
     * @param {boolean} overwrite - Whether to overwrite existing data
     * @returns {Promise<boolean>} Success status
     */
    static async importAllData(data, overwrite = false) {
        try {
            if (!data || !data.version) {
                throw new Error('Invalid import data format');
            }

            // For overwrite mode, clear first then import
            if (overwrite) {
                await ApiClient.delete('/storage');
            }

            await ApiClient.post('/import', data);

            console.log('✅ Imported all data');
            ToastSystem.show('Data imported successfully', 'success', 3000);
            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            ToastSystem.show(`Failed to import data: ${error.message}`, 'error', 3000);
            throw error;
        }
    }

    /**
     * Clear all stored data
     * @param {boolean} confirm - Whether to show confirmation
     * @returns {Promise<boolean>} Success status
     */
    static async clearAllData(confirm = true) {
        try {
            if (confirm && !window.confirm('Clear all stored data? This cannot be undone.')) {
                return false;
            }

            await ApiClient.delete('/storage');
            PersistentState.clearAllData();

            console.log('✅ Cleared all data');
            ToastSystem.show('All data cleared', 'info', 2000);
            return true;
        } catch (error) {
            console.error('Failed to clear data:', error);
            ToastSystem.show(`Failed to clear data: ${error.message}`, 'error', 3000);
            throw error;
        }
    }

    /**
     * Get storage usage statistics
     * @returns {Promise<Object>} Storage usage info
     */
    static async getStorageInfo() {
        try {
            return await ApiClient.get('/storage-info');
        } catch (error) {
            console.error('Failed to get storage info:', error);
            return null;
        }
    }

    /**
     * Generate unique ID
     * @param {string} prefix - ID prefix
     * @returns {string} Unique ID
     * @private
     */
    static generateId(prefix = 'item') {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
