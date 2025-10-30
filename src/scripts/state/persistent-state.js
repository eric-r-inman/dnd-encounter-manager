/**
 * PersistentState - LocalStorage management and data persistence
 *
 * Handles data persistence including:
 * - Auto-save with debouncing
 * - LocalStorage operations with error handling
 * - State serialization and deserialization
 * - Backup and recovery mechanisms
 * - Data migration for version updates
 *
 * @version 1.0.0
 */

export class PersistentState {
    static STORAGE_KEY = 'dnd-encounter-manager';
    static BACKUP_KEY = 'dnd-encounter-manager-backup';
    static VERSION_KEY = 'dnd-encounter-manager-version';
    static CURRENT_VERSION = '1.0.0';
    static AUTO_SAVE_DELAY = 300; // 300ms debounce
    static BACKUP_INTERVAL = 30000; // 30 seconds

    static autoSaveTimeout = null;
    static backupInterval = null;

    /**
     * Initialize persistent state management
     */
    static init() {
        console.log('💾 Persistent State initializing...');
        this.setupAutoSave();
        console.log('✅ Persistent State initialized');
    }

    /**
     * Save state to localStorage with error handling
     * @param {Object} state - Complete application state
     * @returns {boolean} Success status
     */
    static saveState(state) {
        try {
            const saveData = {
                version: this.CURRENT_VERSION,
                timestamp: Date.now(),
                state: this.serializeState(state)
            };

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(saveData));
            console.log('💾 State saved to localStorage');
            return true;
        } catch (error) {
            console.error('❌ Failed to save state:', error);
            this.handleStorageError(error);
            return false;
        }
    }

    /**
     * Load state from localStorage with error handling
     * @returns {Object|null} Loaded state or null if not found
     */
    static loadState() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (!saved) {
                console.log('📂 No saved state found');
                return null;
            }

            const saveData = JSON.parse(saved);

            // Validate save data structure
            if (!this.validateSaveData(saveData)) {
                console.warn('⚠️ Invalid save data format, ignoring');
                return null;
            }

            // Check version compatibility
            if (!this.isVersionCompatible(saveData.version)) {
                console.log(`🔄 Migrating state from version ${saveData.version} to ${this.CURRENT_VERSION}`);
                const migratedState = this.migrateState(saveData.state, saveData.version);
                if (migratedState) {
                    console.log('✅ State migration successful');
                    return migratedState;
                } else {
                    console.warn('❌ State migration failed');
                    return null;
                }
            }

            const deserializedState = this.deserializeState(saveData.state);
            console.log('📂 Loaded state from localStorage');
            console.log('Save timestamp:', new Date(saveData.timestamp).toLocaleString());

            return deserializedState;
        } catch (error) {
            console.error('❌ Failed to load state:', error);
            this.handleStorageError(error);
            return null;
        }
    }

    /**
     * Create backup of current state
     * @param {Object} state - State to backup
     * @returns {boolean} Success status
     */
    static createBackup(state) {
        try {
            const backupData = {
                version: this.CURRENT_VERSION,
                timestamp: Date.now(),
                state: this.serializeState(state),
                source: 'auto-backup'
            };

            localStorage.setItem(this.BACKUP_KEY, JSON.stringify(backupData));
            console.log('💾 Backup created');
            return true;
        } catch (error) {
            console.error('❌ Failed to create backup:', error);
            return false;
        }
    }

    /**
     * Load backup state
     * @returns {Object|null} Backup state or null if not found
     */
    static loadBackup() {
        try {
            const backup = localStorage.getItem(this.BACKUP_KEY);
            if (!backup) {
                console.log('📂 No backup found');
                return null;
            }

            const backupData = JSON.parse(backup);
            if (!this.validateSaveData(backupData)) {
                console.warn('⚠️ Invalid backup data format');
                return null;
            }

            console.log('📂 Loaded backup from localStorage');
            console.log('Backup timestamp:', new Date(backupData.timestamp).toLocaleString());

            return this.deserializeState(backupData.state);
        } catch (error) {
            console.error('❌ Failed to load backup:', error);
            return null;
        }
    }

    /**
     * Schedule auto-save with debouncing
     * @param {Object} state - State to save
     */
    static scheduleAutoSave(state) {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }

        this.autoSaveTimeout = setTimeout(() => {
            this.saveState(state);
        }, this.AUTO_SAVE_DELAY);
    }

    /**
     * Set up auto-save and backup systems
     */
    static setupAutoSave() {
        // Save on page unload
        window.addEventListener('beforeunload', (event) => {
            // Get current state from window reference if available
            if (window.StateManager && window.StateManager.getState) {
                this.saveState(window.StateManager.getState());
            }
        });

        // Periodic backup
        this.backupInterval = setInterval(() => {
            if (window.StateManager && window.StateManager.getState) {
                this.createBackup(window.StateManager.getState());
            }
        }, this.BACKUP_INTERVAL);

        // Handle page visibility changes for mobile
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && window.StateManager && window.StateManager.getState) {
                this.saveState(window.StateManager.getState());
            }
        });
    }

    /**
     * Serialize state for storage (prepare for JSON.stringify)
     * @param {Object} state - State to serialize
     * @returns {Object} Serialized state
     */
    static serializeState(state) {
        // Create a deep copy and handle any special serialization needs
        const serialized = JSON.parse(JSON.stringify(state));

        // Add any special serialization logic here
        // For example, converting Date objects to timestamps

        return serialized;
    }

    /**
     * Deserialize state from storage
     * @param {Object} serializedState - Serialized state data
     * @returns {Object} Deserialized state
     */
    static deserializeState(serializedState) {
        // Handle any special deserialization needs
        const state = { ...serializedState };

        // Add any special deserialization logic here
        // For example, converting timestamps back to Date objects

        return state;
    }

    /**
     * Validate save data structure
     * @param {Object} saveData - Data to validate
     * @returns {boolean} True if valid
     */
    static validateSaveData(saveData) {
        if (!saveData || typeof saveData !== 'object') {
            return false;
        }

        const requiredFields = ['version', 'timestamp', 'state'];
        return requiredFields.every(field => field in saveData);
    }

    /**
     * Check if version is compatible with current
     * @param {string} version - Version to check
     * @returns {boolean} True if compatible
     */
    static isVersionCompatible(version) {
        // For now, only exact version match is compatible
        // In the future, implement semantic version checking
        return version === this.CURRENT_VERSION;
    }

    /**
     * Migrate state from older version
     * @param {Object} oldState - State to migrate
     * @param {string} fromVersion - Version to migrate from
     * @returns {Object|null} Migrated state or null if migration failed
     */
    static migrateState(oldState, fromVersion) {
        console.log(`🔄 Migrating state from ${fromVersion} to ${this.CURRENT_VERSION}`);

        try {
            let migratedState = { ...oldState };

            // Add migration logic for different versions
            // Example:
            // if (fromVersion === '0.9.0') {
            //     migratedState = this.migrate_0_9_0_to_1_0_0(migratedState);
            // }

            // For now, assume no migration is needed for minor version differences
            return migratedState;
        } catch (error) {
            console.error('Migration failed:', error);
            return null;
        }
    }

    /**
     * Handle storage errors (quota exceeded, etc.)
     * @param {Error} error - Storage error
     */
    static handleStorageError(error) {
        if (error.name === 'QuotaExceededError') {
            console.warn('⚠️ Storage quota exceeded, attempting cleanup...');
            this.cleanupOldData();
        } else if (error.name === 'SecurityError') {
            console.warn('⚠️ Storage access denied (private browsing?)');
        } else {
            console.error('💥 Unknown storage error:', error);
        }
    }

    /**
     * Clean up old data to free storage space
     */
    static cleanupOldData() {
        try {
            // Remove old backup if it exists
            localStorage.removeItem(this.BACKUP_KEY);

            // Could also implement more sophisticated cleanup:
            // - Remove old encounter data
            // - Compress state data
            // - Remove unused preferences

            console.log('🧹 Storage cleanup completed');
        } catch (error) {
            console.error('❌ Cleanup failed:', error);
        }
    }

    /**
     * Get storage usage information
     * @returns {Object} Storage usage stats
     */
    static getStorageInfo() {
        try {
            const currentData = localStorage.getItem(this.STORAGE_KEY);
            const backupData = localStorage.getItem(this.BACKUP_KEY);

            const currentSize = currentData ? new Blob([currentData]).size : 0;
            const backupSize = backupData ? new Blob([backupData]).size : 0;
            const totalSize = currentSize + backupSize;

            return {
                currentSize,
                backupSize,
                totalSize,
                currentSizeKB: Math.round(currentSize / 1024 * 100) / 100,
                backupSizeKB: Math.round(backupSize / 1024 * 100) / 100,
                totalSizeKB: Math.round(totalSize / 1024 * 100) / 100
            };
        } catch (error) {
            console.error('❌ Failed to get storage info:', error);
            return null;
        }
    }

    /**
     * Clear all stored data
     * @returns {boolean} Success status
     */
    static clearAllData() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            localStorage.removeItem(this.BACKUP_KEY);
            localStorage.removeItem(this.VERSION_KEY);
            console.log('🗑️ All stored data cleared');
            return true;
        } catch (error) {
            console.error('❌ Failed to clear data:', error);
            return false;
        }
    }

    /**
     * Export state data for download/backup
     * @param {Object} state - State to export
     * @returns {string} JSON string of state data
     */
    static exportState(state) {
        const exportData = {
            version: this.CURRENT_VERSION,
            timestamp: Date.now(),
            state: this.serializeState(state),
            source: 'manual-export'
        };

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Import state data from JSON
     * @param {string} jsonData - JSON string to import
     * @returns {Object|null} Imported state or null if invalid
     */
    static importState(jsonData) {
        try {
            const importData = JSON.parse(jsonData);

            if (!this.validateSaveData(importData)) {
                throw new Error('Invalid import data format');
            }

            // Handle version compatibility
            if (!this.isVersionCompatible(importData.version)) {
                const migratedState = this.migrateState(importData.state, importData.version);
                if (!migratedState) {
                    throw new Error('Migration failed');
                }
                return migratedState;
            }

            return this.deserializeState(importData.state);
        } catch (error) {
            console.error('❌ Failed to import state:', error);
            return null;
        }
    }

    /**
     * Cleanup on destroy
     */
    static destroy() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
            this.autoSaveTimeout = null;
        }

        if (this.backupInterval) {
            clearInterval(this.backupInterval);
            this.backupInterval = null;
        }

        console.log('💾 Persistent State destroyed');
    }
}