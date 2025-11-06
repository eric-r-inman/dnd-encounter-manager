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
 * @version 1.0.0
 */

import { PersistentState } from '../state/persistent-state.js';
import { ToastSystem } from '../../components/toast/ToastSystem.js';

export class StorageService {
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
            // Generate unique ID with timestamp to prevent collisions
            const encounterId = this.generateId('encounter');

            // Load existing encounters to merge with new save
            const encounters = await this.getEncounters();

            // Create encounter object with metadata
            // Version field allows future format migrations
            const encounter = {
                id: encounterId,
                name: name.trim(), // Trim whitespace to prevent storage bloat
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                version: '1.0.0', // For future backward compatibility
                data: encounterData
            };

            // Store in object by ID for fast lookups
            encounters[encounterId] = encounter;
            await this.setStorageItem(this.STORAGE_KEYS.ENCOUNTERS, encounters);

            console.log(`✅ Saved encounter: ${name} (${encounterId})`);
            ToastSystem.show(`Encounter "${name}" saved`, 'success', 2000);

            return encounterId;
        } catch (error) {
            // Re-throw after logging to allow caller to handle
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
            const encounters = await this.getEncounters();
            const encounter = encounters[encounterId];

            // Explicitly check for null/undefined encounter
            // This can happen if encounter was deleted or ID is invalid
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
            // Returns object with encounter IDs as keys for O(1) lookup
            // Empty object default ensures code doesn't break on first use
            return await this.getStorageItem(this.STORAGE_KEYS.ENCOUNTERS, {});
        } catch (error) {
            // Graceful degradation: return empty object if storage fails
            // App continues to work without saved encounters
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
            const encounters = await this.getEncounters();
            const encounter = encounters[encounterId];

            // Verify encounter exists before attempting delete
            if (!encounter) {
                throw new Error(`Encounter not found: ${encounterId}`);
            }

            // Save encounter name for toast message before deletion
            // Use delete operator instead of setting to undefined
            // This properly removes the key from the object
            delete encounters[encounterId];
            await this.setStorageItem(this.STORAGE_KEYS.ENCOUNTERS, encounters);

            console.log(`✅ Deleted encounter: ${encounter.name}`);
            ToastSystem.show(`Encounter "${encounter.name}" deleted`, 'info', 2000);

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
            const creatures = await this.getCreatures();

            const creature = {
                id: creatureId,
                name: creatureData.name.trim(),
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                version: '1.0.0',
                ...creatureData
            };

            creatures[creatureId] = creature;
            await this.setStorageItem(this.STORAGE_KEYS.CREATURES, creatures);

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
            return await this.getStorageItem(this.STORAGE_KEYS.CREATURES, {});
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
            const creatures = await this.getCreatures();
            const searchTerm = query.toLowerCase().trim();

            // Empty search = return all creatures
            // Avoids unnecessary filtering operation
            if (!searchTerm) {
                return Object.values(creatures);
            }

            // Search across name, type, and CR
            // Uses optional chaining (?.) to safely handle missing fields
            // toString() on challenge handles both string and number CRs
            return Object.values(creatures).filter(creature =>
                creature.name.toLowerCase().includes(searchTerm) ||
                creature.type?.toLowerCase().includes(searchTerm) ||
                creature.challenge?.toString().includes(searchTerm)
            );
        } catch (error) {
            // Return empty array on error to avoid breaking UI
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
            // Merge with existing preferences to avoid losing unrelated settings
            // Example: saving { theme: 'dark' } won't erase autoSave setting
            const existing = await this.getPreferences();
            const updated = { ...existing, ...preferences, modified: new Date().toISOString() };

            await this.setStorageItem(this.STORAGE_KEYS.PREFERENCES, updated);

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
            // Define sensible defaults for first-time users
            // These ensure the app works correctly before user customization
            const defaults = {
                autoSave: true,              // Prevent data loss
                showTooltips: true,          // Help new users learn
                showHealthBars: true,        // Visual HP indicators
                defaultInitiative: 10,       // Average initiative roll
                confirmActions: true,        // Prevent accidental deletions
                theme: 'default'            // Default color scheme
            };

            // Merge stored preferences with defaults
            // Stored values override defaults, but defaults fill in gaps
            // This allows adding new preferences without breaking old saves
            const stored = await this.getStorageItem(this.STORAGE_KEYS.PREFERENCES, {});
            return { ...defaults, ...stored };
        } catch (error) {
            // Fallback to defaults if storage fails
            // App remains functional even without saved preferences
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
            const templates = await this.getTemplates();

            const template = {
                id: templateId,
                name: name.trim(),
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                data: templateData
            };

            templates[templateId] = template;
            await this.setStorageItem(this.STORAGE_KEYS.TEMPLATES, templates);

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
            return await this.getStorageItem(this.STORAGE_KEYS.TEMPLATES, {});
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
            // Guard: reject empty or whitespace-only names
            if (!effectName?.trim()) return false;

            const recent = await this.getRecentEffects();

            // Add to front of list, remove duplicates, limit to 10 items
            // Logic: [new item, ...all old items except duplicates].slice(0, 10)
            // This ensures most recent items bubble to top
            const updated = [effectName.trim(), ...recent.filter(e => e !== effectName.trim())].slice(0, 10);

            await this.setStorageItem(this.STORAGE_KEYS.RECENT_EFFECTS, updated);
            return true;
        } catch (error) {
            // Silent fail - recent effects are nice-to-have, not critical
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
            return await this.getStorageItem(this.STORAGE_KEYS.RECENT_EFFECTS, []);
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
            const data = {
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                encounters: await this.getEncounters(),
                creatures: await this.getCreatures(),
                preferences: await this.getPreferences(),
                templates: await this.getTemplates(),
                recentEffects: await this.getRecentEffects()
            };

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
            // Validate import data has required version field
            // This protects against importing malformed or incompatible data
            if (!data || !data.version) {
                throw new Error('Invalid import data format');
            }

            // Collect all storage operations for parallel execution
            const operations = [];

            // Import encounters
            if (data.encounters) {
                // Overwrite mode: start fresh with empty object
                // Merge mode: preserve existing data, imported data wins on conflicts
                const existing = overwrite ? {} : await this.getEncounters();
                operations.push(this.setStorageItem(this.STORAGE_KEYS.ENCOUNTERS, { ...existing, ...data.encounters }));
            }

            // Import creatures
            if (data.creatures) {
                const existing = overwrite ? {} : await this.getCreatures();
                operations.push(this.setStorageItem(this.STORAGE_KEYS.CREATURES, { ...existing, ...data.creatures }));
            }

            // Import preferences
            if (data.preferences) {
                const existing = overwrite ? {} : await this.getPreferences();
                operations.push(this.setStorageItem(this.STORAGE_KEYS.PREFERENCES, { ...existing, ...data.preferences }));
            }

            // Import templates
            if (data.templates) {
                const existing = overwrite ? {} : await this.getTemplates();
                operations.push(this.setStorageItem(this.STORAGE_KEYS.TEMPLATES, { ...existing, ...data.templates }));
            }

            // Import recent effects (always overwrites, not merged)
            if (data.recentEffects) {
                operations.push(this.setStorageItem(this.STORAGE_KEYS.RECENT_EFFECTS, data.recentEffects));
            }

            // Execute all storage operations in parallel for speed
            await Promise.all(operations);

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
            // Safety check: ask user to confirm destructive action
            // Can be bypassed programmatically with confirm=false
            if (confirm && !window.confirm('Clear all stored data? This cannot be undone.')) {
                return false;
            }

            // Remove all keys managed by this service
            // Using map() for parallel removal operations
            const clearOperations = Object.values(this.STORAGE_KEYS).map(key =>
                localStorage.removeItem(key)
            );

            await Promise.all(clearOperations);

            // Also clear the main application data (current encounter state)
            // This ensures complete reset of the application
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
            const info = {
                encounters: 0,
                creatures: 0,
                preferences: 0,
                templates: 0,
                recentEffects: 0,
                total: 0
            };

            // Calculate storage size for each category
            // Uses Blob to get accurate byte size of stringified data
            for (const [category, key] of Object.entries(this.STORAGE_KEYS)) {
                const data = localStorage.getItem(key);
                if (data) {
                    // Blob size gives accurate UTF-8 byte count
                    const size = new Blob([data]).size;
                    info[category.toLowerCase()] = size;
                    info.total += size;
                }
            }

            // Add main application data (current encounter state)
            const appInfo = PersistentState.getStorageInfo();
            if (appInfo) {
                info.application = appInfo.totalSize;
                info.total += size;
            }

            // Add human-readable KB versions of all values
            // Rounds to 2 decimal places for readability
            for (const key of Object.keys(info)) {
                info[`${key}KB`] = Math.round(info[key] / 1024 * 100) / 100;
            }

            return info;
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
        // Generate unique ID: prefix-timestamp-random
        // Example: "encounter-1699123456789-k3j9x2p1q"
        // Timestamp ensures chronological ordering
        // Random suffix prevents collisions if generated simultaneously
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get item from localStorage with error handling
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default value if not found
     * @returns {Promise<*>} Stored value or default
     * @private
     */
    static async getStorageItem(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            // Parse JSON if exists, otherwise return default
            // This handles both "key doesn't exist" and "key is null"
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            // JSON parse can fail if data is corrupted
            // Return default value to allow app to continue
            console.warn(`Failed to parse stored item ${key}:`, error);
            return defaultValue;
        }
    }

    /**
     * Set item in localStorage with error handling
     * @param {string} key - Storage key
     * @param {*} value - Value to store
     * @returns {Promise<boolean>} Success status
     * @private
     */
    static async setStorageItem(key, value) {
        try {
            // Serialize to JSON before storing
            // localStorage only stores strings
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Failed to store item ${key}:`, error);

            // Special handling for storage quota errors
            // Most common on mobile devices with limited storage
            // Alerts user to take action (clear old data)
            if (error.name === 'QuotaExceededError') {
                ToastSystem.show('Storage quota exceeded. Consider clearing old data.', 'warning', 5000);
            }

            throw error;
        }
    }
}