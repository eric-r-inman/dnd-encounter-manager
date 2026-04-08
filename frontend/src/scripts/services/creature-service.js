/**
 * CreatureService - Creature Database Management
 *
 * CRITICAL: Creature database management with save/load functionality
 * Similar to encounter save/load system, but for creatures.
 *
 * How it works:
 * 1. Base creatures loaded from JSON file (read-only, shipped with app)
 * 2. Working database stored in localStorage ('dnd-creature-database')
 * 3. On first load, base database is copied to working database
 * 4. Users can add/edit/delete creatures in working database
 * 5. Users can export database to JSON file (download)
 * 6. Users can import database from JSON file (replaces working database)
 * 7. Users can reset to base database (discard all changes)
 *
 * ⚠️ There is NO distinction between "base" and "custom" creatures
 * ⚠️ All creatures exist in a single unified database
 * ⚠️ localStorage is ONLY used for the working creature database
 *
 * @version 2.0.0
 */

import { ToastSystem } from '../../components/toast/ToastSystem.js';
import { ApiClient } from './api-client.js';

export class CreatureService {
    static DATABASE_PATH = '/src/data/creatures/creature-database.json';
    static STORAGE_KEY = 'dnd-creature-database';
    static LAST_EXPORT_KEY = 'dnd-creature-database-last-export';
    static baseDatabase = null;  // Read-only base from JSON file
    static workingDatabase = null;  // In-memory working copy

    /**
     * Initialize the creature database system
     * Loads base database and working database
     * @returns {Promise<Object>} Working database
     */
    static async initialize() {
        // Load base database from JSON file
        if (!this.baseDatabase) {
            await this.loadBaseDatabase();
        }

        // Load or create working database
        await this.loadWorkingDatabase();

        console.log(`✅ Creature database initialized: ${this.workingDatabase.creatures.length} creatures`);
        return this.workingDatabase;
    }

    /**
     * Load base database from JSON file (read-only)
     * @returns {Promise<Object>} Base database
     */
    static async loadBaseDatabase() {
        try {
            const response = await fetch(this.DATABASE_PATH);
            if (!response.ok) {
                throw new Error(`Failed to load base creature database: ${response.statusText}`);
            }

            this.baseDatabase = await response.json();
            console.log(`✅ Loaded base database: ${this.baseDatabase.creatures.length} creatures`);
            return this.baseDatabase;
        } catch (error) {
            console.error('❌ Failed to load base creature database:', error);
            // Create empty database if file doesn't exist
            this.baseDatabase = {
                creatures: [],
                metadata: {
                    version: '2.0.0',
                    lastUpdated: new Date().toISOString().split('T')[0],
                    totalCreatures: 0,
                    schema: {
                        version: '2.0',
                        description: 'D&D 5e creature database'
                    }
                }
            };
            return this.baseDatabase;
        }
    }

    /**
     * Load working database from localStorage
     * If not found, copy from base database
     *
     * WHY THIS SYSTEM: We use a "base + working" database pattern similar to
     * how text editors work (original file + unsaved changes). The base database
     * ships with the app and never changes. The working database is where users
     * make modifications (add/edit/delete creatures).
     *
     * WHY: Benefits of this approach:
     * 1. Users can always reset to the original shipped creatures
     * 2. Changes persist across browser sessions (localStorage)
     * 3. Users can export/import their custom databases
     * 4. No server required - everything works offline
     *
     * @returns {Promise<Object>} Working database
     */
    static async loadWorkingDatabase() {
        try {
            // Load working database from the server API
            // The server seeds from the base database on first run
            const db = await ApiClient.get('/creatures');

            if (db && db.creatures && db.creatures.length > 0) {
                this.workingDatabase = db;
                console.log(`✅ Loaded working database from server: ${this.workingDatabase.creatures.length} creatures`);
            } else {
                // Server returned empty - seed from base database
                if (!this.baseDatabase) {
                    await this.loadBaseDatabase();
                }
                this.workingDatabase = JSON.parse(JSON.stringify(this.baseDatabase));
                await this.saveWorkingDatabase();
                console.log(`✅ Initialized working database from base: ${this.workingDatabase.creatures.length} creatures`);
            }

            return this.workingDatabase;
        } catch (error) {
            console.error('❌ Failed to load working database:', error);
            // Fall back to base database if server is unavailable
            if (!this.baseDatabase) {
                await this.loadBaseDatabase();
            }
            this.workingDatabase = JSON.parse(JSON.stringify(this.baseDatabase));
            return this.workingDatabase;
        }
    }

    /**
     * Save working database to localStorage
     * @returns {Promise<boolean>} Success status
     */
    static async saveWorkingDatabase() {
        try {
            await ApiClient.put('/creatures', this.workingDatabase);
            console.log(`✅ Saved working database to server: ${this.workingDatabase.creatures.length} creatures`);
            return true;
        } catch (error) {
            console.error('❌ Failed to save working database:', error);
            ToastSystem.show('Failed to save creature database', 'error', 3000);
            return false;
        }
    }

    /**
     * Get all creatures from working database
     * @returns {Promise<Array>} Array of all creatures
     */
    static async loadCreatures() {
        if (!this.workingDatabase) {
            await this.initialize();
        }
        return this.workingDatabase.creatures || [];
    }

    /**
     * Get a single creature by ID
     * @param {string} creatureId - Creature ID
     * @returns {Promise<Object|null>} Creature object or null
     */
    static async getCreature(creatureId) {
        const creatures = await this.loadCreatures();
        return creatures.find(c => c.id === creatureId) || null;
    }

    /**
     * Add a new creature to the working database
     * @param {Object} creatureData - Creature data to add
     * @returns {Promise<boolean>} Success status
     */
    static async addCreature(creatureData) {
        try {
            if (!this.workingDatabase) {
                await this.initialize();
            }

            // Ensure unique ID
            if (!creatureData.id) {
                creatureData.id = this.generateCreatureId(creatureData.name);
            }

            // Check for duplicates
            const existing = this.workingDatabase.creatures.find(c => c.id === creatureData.id);
            if (existing) {
                throw new Error(`Creature with ID "${creatureData.id}" already exists`);
            }

            // Add to database
            this.workingDatabase.creatures.push(creatureData);
            this.workingDatabase.metadata.totalCreatures = this.workingDatabase.creatures.length;
            this.workingDatabase.metadata.lastUpdated = new Date().toISOString().split('T')[0];

            // Save to localStorage
            await this.saveWorkingDatabase();

            // Mark database as modified (needs export)
            this.markAsModified();

            console.log(`✅ Added creature: ${creatureData.name} (${creatureData.id})`);
            ToastSystem.show(`Added ${creatureData.name} to database`, 'success', 2000);

            return true;
        } catch (error) {
            console.error('❌ Failed to add creature:', error);
            ToastSystem.show(`Failed to add creature: ${error.message}`, 'error', 3000);
            return false;
        }
    }

    /**
     * Update an existing creature in the database
     * @param {string} creatureId - Creature ID to update
     * @param {Object} updates - Partial creature data to update
     * @returns {Promise<boolean>} Success status
     */
    static async updateCreature(creatureId, updates) {
        try {
            if (!this.workingDatabase) {
                await this.initialize();
            }

            const index = this.workingDatabase.creatures.findIndex(c => c.id === creatureId);
            if (index === -1) {
                throw new Error(`Creature not found: ${creatureId}`);
            }

            // Merge updates
            this.workingDatabase.creatures[index] = {
                ...this.workingDatabase.creatures[index],
                ...updates
            };

            this.workingDatabase.metadata.lastUpdated = new Date().toISOString().split('T')[0];

            // Save to localStorage
            await this.saveWorkingDatabase();

            // Mark database as modified (needs export)
            this.markAsModified();

            console.log(`✅ Updated creature: ${creatureId}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to update creature:', error);
            ToastSystem.show(`Failed to update creature: ${error.message}`, 'error', 3000);
            return false;
        }
    }

    /**
     * Delete a creature from the database
     * @param {string} creatureId - Creature ID to delete
     * @returns {Promise<boolean>} Success status
     */
    static async deleteCreature(creatureId) {
        try {
            if (!this.workingDatabase) {
                await this.initialize();
            }

            const index = this.workingDatabase.creatures.findIndex(c => c.id === creatureId);
            if (index === -1) {
                throw new Error(`Creature not found: ${creatureId}`);
            }

            const creature = this.workingDatabase.creatures[index];
            this.workingDatabase.creatures.splice(index, 1);
            this.workingDatabase.metadata.totalCreatures = this.workingDatabase.creatures.length;
            this.workingDatabase.metadata.lastUpdated = new Date().toISOString().split('T')[0];

            // Save to localStorage
            await this.saveWorkingDatabase();

            // Mark database as modified (needs export)
            this.markAsModified();

            console.log(`✅ Deleted creature: ${creature.name} (${creatureId})`);
            ToastSystem.show(`Deleted ${creature.name}`, 'success', 2000);

            return true;
        } catch (error) {
            console.error('❌ Failed to delete creature:', error);
            ToastSystem.show(`Failed to delete creature: ${error.message}`, 'error', 3000);
            return false;
        }
    }

    /**
     * Export working database to JSON file (with OS file save dialog)
     * Uses File System Access API when available, falls back to download
     *
     * WHY TWO EXPORT METHODS: Different browsers support different file APIs.
     * Chrome/Edge support the modern File System Access API (native save dialog),
     * while Safari/Firefox require the older download method. We try the modern
     * API first, then fall back if it's not available.
     *
     * WHY EXPORT: Allows users to:
     * 1. Back up their custom creature database
     * 2. Share creatures with other DMs
     * 3. Transfer their database between computers
     * 4. Keep multiple themed databases (e.g., "desert-campaigns.json")
     *
     * @param {string} filename - Optional filename (default: creature-database-YYYY-MM-DD.json)
     * @returns {Promise<boolean>} Success status
     */
    static async exportDatabase(filename) {
        try {
            if (!this.workingDatabase) {
                await this.initialize();
            }

            const defaultFilename = `creature-database-${new Date().toISOString().split('T')[0]}.json`;
            const suggestedFilename = filename || defaultFilename;

            const json = JSON.stringify(this.workingDatabase, null, 2);

            // WHY: Try modern File System Access API first (better UX)
            // This gives users a native OS save dialog where they can choose
            // location and filename, just like saving a Word document
            if ('showSaveFilePicker' in window) {
                try {
                    const fileHandle = await window.showSaveFilePicker({
                        suggestedName: suggestedFilename,
                        types: [{
                            description: 'JSON Files',
                            accept: { 'application/json': ['.json'] }
                        }]
                    });

                    const writable = await fileHandle.createWritable();
                    await writable.write(json);
                    await writable.close();

                    // Mark database as exported (no pending changes)
                    this.markAsExported();

                    console.log(`✅ Exported creature database: ${fileHandle.name}`);
                    ToastSystem.show(`Exported creature database: ${fileHandle.name}`, 'success', 3000);

                    return true;
                } catch (error) {
                    // WHY: User clicked "Cancel" in the save dialog - not an error
                    if (error.name === 'AbortError') {
                        console.log('Export cancelled by user');
                        return false;
                    }
                    console.warn('File System Access API failed, falling back to download:', error);
                }
            }

            // WHY: Fallback for browsers without File System Access API
            // Creates a temporary blob URL and triggers a download. File goes to
            // the browser's default download folder (user can't choose location)
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = suggestedFilename;
            a.click();

            // WHY: Clean up the temporary URL to free memory
            URL.revokeObjectURL(url);

            // Mark database as exported (no pending changes)
            this.markAsExported();

            console.log(`✅ Exported creature database: ${suggestedFilename}`);
            ToastSystem.show(`Exported creature database: ${suggestedFilename}`, 'success', 3000);

            return true;
        } catch (error) {
            console.error('❌ Failed to export database:', error);
            ToastSystem.show(`Failed to export database: ${error.message}`, 'error', 3000);
            return false;
        }
    }

    /**
     * Import database from JSON file (replaces working database)
     * @param {File} file - JSON file to import
     * @returns {Promise<boolean>} Success status
     */
    static async importDatabase(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Validate structure
            if (!data.creatures || !Array.isArray(data.creatures)) {
                throw new Error('Invalid database format: missing creatures array');
            }

            if (!data.metadata) {
                throw new Error('Invalid database format: missing metadata');
            }

            // Store the count before replacing
            const importedCount = data.creatures.length;

            // Replace working database
            this.workingDatabase = data;
            await this.saveWorkingDatabase();

            // Mark as exported since we just imported a complete database
            this.markAsExported();

            // Clear the hidden creatures list when importing a new database
            // Otherwise hidden creatures from the old database will hide creatures in the new one
            localStorage.removeItem('dnd-hidden-creatures');

            console.log(`✅ Imported creature database: ${importedCount} creatures`);
            ToastSystem.show(`Imported ${importedCount} creatures (database replaced)`, 'success', 3000);

            return true;
        } catch (error) {
            console.error('❌ Failed to import database:', error);
            ToastSystem.show(`Failed to import database: ${error.message}`, 'error', 3000);
            return false;
        }
    }

    /**
     * Reset working database to base database (discard all changes)
     * @returns {Promise<boolean>} Success status
     */
    static async resetToBase() {
        try {
            if (!this.baseDatabase) {
                await this.loadBaseDatabase();
            }

            const confirm = window.confirm(
                'This will reset the creature database to the original version, discarding all your changes. Continue?'
            );

            if (!confirm) {
                return false;
            }

            // Copy base to working
            this.workingDatabase = JSON.parse(JSON.stringify(this.baseDatabase));
            await this.saveWorkingDatabase();

            // Mark as exported since we just reset to the original base
            this.markAsExported();

            console.log(`✅ Reset to base database: ${this.workingDatabase.creatures.length} creatures`);
            ToastSystem.show('Reset to base creature database', 'success', 2000);

            return true;
        } catch (error) {
            console.error('❌ Failed to reset database:', error);
            ToastSystem.show(`Failed to reset database: ${error.message}`, 'error', 3000);
            return false;
        }
    }

    /**
     * Search creatures by name, type, or CR
     * @param {string} query - Search query
     * @returns {Promise<Array>} Filtered creatures
     */
    static async searchCreatures(query) {
        const creatures = await this.loadCreatures();
        const lowerQuery = query.toLowerCase();

        return creatures.filter(creature =>
            creature.name.toLowerCase().includes(lowerQuery) ||
            creature.type?.toLowerCase().includes(lowerQuery) ||
            creature.race?.toLowerCase().includes(lowerQuery) ||
            creature.cr?.toString().includes(lowerQuery)
        );
    }

    /**
     * Generate a unique creature ID from name
     * @param {string} name - Creature name
     * @returns {string} Generated ID
     */
    static generateCreatureId(name) {
        const base = name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        // Add timestamp to ensure uniqueness
        const timestamp = Date.now().toString(36);
        return `${base}-${timestamp}`;
    }

    /**
     * Get database statistics
     * @returns {Promise<Object>} Statistics object
     */
    static async getStats() {
        if (!this.workingDatabase) {
            await this.initialize();
        }

        return {
            total: this.workingDatabase.creatures.length,
            lastUpdated: this.workingDatabase.metadata.lastUpdated,
            version: this.workingDatabase.metadata.version
        };
    }

    /**
     * Mark the database as modified (needs export)
     *
     * WHY: Track when users make changes that haven't been exported yet.
     * This helps prevent data loss by alerting users about unsaved changes.
     */
    static markAsModified() {
        // Store the current timestamp as the last modification time
        localStorage.setItem(this.LAST_EXPORT_KEY, JSON.stringify({
            hasUnexportedChanges: true,
            lastModified: Date.now()
        }));
    }

    /**
     * Mark the database as exported (no pending changes)
     * Called after successful export
     */
    static markAsExported() {
        localStorage.setItem(this.LAST_EXPORT_KEY, JSON.stringify({
            hasUnexportedChanges: false,
            lastExported: Date.now()
        }));
    }

    /**
     * Check if there are unexported changes to the database
     *
     * WHY: Used to display warning indicator in the UI when changes
     * haven't been backed up via export.
     *
     * @returns {boolean} True if there are unexported changes
     */
    static hasUnexportedChanges() {
        try {
            const data = localStorage.getItem(this.LAST_EXPORT_KEY);
            if (!data) {
                // No export tracking yet - check if database exists
                const hasDatabase = localStorage.getItem(this.STORAGE_KEY) !== null;
                return hasDatabase; // If database exists, assume it needs export
            }

            const parsed = JSON.parse(data);
            return parsed.hasUnexportedChanges === true;
        } catch (error) {
            console.error('Error checking export status:', error);
            return false;
        }
    }
}
