/**
 * DataServices - Enhanced data layer with modular services
 *
 * Coordinates between the new service layer and existing components.
 * Provides backward compatibility while using the comprehensive
 * service architecture under the hood.
 *
 * @version 2.0.0 (Service-based)
 */

import { CombatantManager } from '../components/combatant-card/CombatantManager.js';
import { Services } from './services/index.js';

export class DataServices {
    static combatantManager = null;
    static isInitialized = false;

    /**
     * Initialize data services with new service layer
     */
    static async init() {
        if (this.isInitialized) {
            console.warn('DataServices already initialized');
            return;
        }

        console.log('📁 Data Services v2.0 initializing...');

        try {
            // Initialize the service layer
            await Services.init();

            // Create the combatant manager instance
            this.combatantManager = new CombatantManager();

            this.isInitialized = true;
            console.log('✅ Data Services v2.0 initialized with service layer');
        } catch (error) {
            console.error('❌ Failed to initialize DataServices:', error);
            throw error;
        }
    }

    /**
     * Load creature database using storage service
     */
    static async loadCreatureDatabase() {
        console.log('📁 Loading creature database...');

        try {
            // Use the new storage service to load creatures
            const creaturesDb = await Services.storage.getCreatures();
            const count = creaturesDb?.creatures?.length || Object.keys(creaturesDb || {}).length;
            console.log(`📁 Loaded ${count} creatures from database`);

            // Initialize CombatantManager with creature data
            if (this.combatantManager) {
                await this.combatantManager.loadCreatureDatabase();
            }
        } catch (error) {
            console.error('❌ Failed to load creature database:', error);
            throw error;
        }
    }

    /**
     * Initialize combatant manager after DOM is ready
     */
    static async initializeCombatantManager() {
        try {
            const container = document.getElementById('initiative-order-list');
            if (container && this.combatantManager) {
                await this.combatantManager.init(container);
                console.log('✅ CombatantManager initialized with DOM container');
            } else {
                console.warn('⚠️ Could not initialize CombatantManager - container or manager not available');
            }
        } catch (error) {
            console.error('❌ Failed to initialize CombatantManager:', error);
            throw error;
        }
    }

    /**
     * Load reference data using storage service
     */
    static async loadReferenceData() {
        console.log('📁 Loading reference data...');

        try {
            // Load user preferences
            const preferences = await Services.storage.getPreferences();
            console.log('📁 Loaded user preferences:', preferences);

            // Load templates
            const templates = await Services.storage.getTemplates();
            console.log(`📁 Loaded ${Object.keys(templates).length} templates`);

            // Load recent effects
            const recentEffects = await Services.storage.getRecentEffects();
            console.log(`📁 Loaded ${recentEffects.length} recent effects`);

        } catch (error) {
            console.error('❌ Failed to load reference data:', error);
            // Don't throw - reference data failure shouldn't break app initialization
        }
    }

    /**
     * Load saved encounters using storage service
     */
    static async loadSavedEncounters() {
        console.log('📁 Loading saved encounters...');

        try {
            const encounters = await Services.storage.getEncounters();
            console.log(`📁 Loaded ${Object.keys(encounters).length} saved encounters`);
            return encounters;
        } catch (error) {
            console.error('❌ Failed to load saved encounters:', error);
            return {};
        }
    }

    /**
     * Save current encounter
     * @param {string} name - Encounter name
     * @returns {Promise<string>} Encounter ID
     */
    static async saveCurrentEncounter(name) {
        try {
            // Get current encounter data from state
            const encounterData = {
                combatants: Services.combatant.getAllCombatants(),
                combat: Services.combat.getCombatStats(),
                timestamp: new Date().toISOString()
            };

            const encounterId = await Services.storage.saveEncounter(name, encounterData);
            console.log(`✅ Saved current encounter as: ${name}`);
            return encounterId;
        } catch (error) {
            console.error('❌ Failed to save current encounter:', error);
            throw error;
        }
    }

    /**
     * Load encounter by ID
     * @param {string} encounterId - Encounter ID
     * @returns {Promise<Object>} Loaded encounter
     */
    static async loadEncounter(encounterId) {
        try {
            const encounter = await Services.storage.loadEncounter(encounterId);
            console.log(`✅ Loaded encounter: ${encounter.name}`);
            return encounter;
        } catch (error) {
            console.error('❌ Failed to load encounter:', error);
            throw error;
        }
    }

    /**
     * Get service health status
     * @returns {Promise<Object>} Health check results
     */
    static async getHealthStatus() {
        if (!this.isInitialized) {
            return {
                overall: 'not_initialized',
                message: 'DataServices not initialized'
            };
        }

        return await Services.healthCheck();
    }

    /**
     * Get storage usage information
     * @returns {Promise<Object>} Storage usage stats
     */
    static async getStorageInfo() {
        return await Services.storage.getStorageInfo();
    }

    /**
     * Export all data for backup
     * @returns {Promise<Object>} All exportable data
     */
    static async exportAllData() {
        try {
            const data = await Services.storage.exportAllData();

            // Add current state data
            data.currentState = {
                combatants: Services.combatant.getAllCombatants(),
                combat: Services.combat.getCombatStats()
            };

            console.log('✅ Exported all data for backup');
            return data;
        } catch (error) {
            console.error('❌ Failed to export data:', error);
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
            return await Services.storage.importAllData(data, overwrite);
        } catch (error) {
            console.error('❌ Failed to import data:', error);
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
            return await Services.storage.clearAllData(confirm);
        } catch (error) {
            console.error('❌ Failed to clear data:', error);
            throw error;
        }
    }

    /**
     * Get services usage statistics
     * @returns {Object} Usage statistics
     */
    static getUsageStats() {
        return {
            dataServices: {
                initialized: this.isInitialized,
                combatantManagerReady: !!this.combatantManager
            },
            services: Services.getUsageStats()
        };
    }

    /**
     * Validate system integrity
     * @returns {Promise<Object>} Validation results
     */
    static async validateSystem() {
        const results = {
            dataServices: this.isInitialized,
            combatantManager: !!this.combatantManager,
            services: await Services.healthCheck(),
            timestamp: new Date().toISOString()
        };

        const hasErrors = !results.dataServices ||
                         !results.combatantManager ||
                         results.services.overall !== 'healthy';

        results.overall = hasErrors ? 'degraded' : 'healthy';
        return results;
    }

    /**
     * Destroy data services
     */
    static destroy() {
        console.log('📁 Destroying DataServices...');

        // Destroy services
        Services.destroy();

        // Clean up references
        this.combatantManager = null;
        this.isInitialized = false;

        console.log('✅ DataServices destroyed');
    }

    // Convenience accessors for backward compatibility
    static get services() {
        return Services;
    }

    static get combatant() {
        return Services.combatant;
    }

    static get combat() {
        return Services.combat;
    }

    static get storage() {
        return Services.storage;
    }

    static get validation() {
        return Services.validation;
    }

    static get calculation() {
        return Services.calculation;
    }
}