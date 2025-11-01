/**
 * EncounterEvents - Encounter save/load management
 *
 * Handles encounter persistence including:
 * - File-based encounter saving (File System Access API)
 * - File-based encounter loading with validation
 * - Missing creature detection and alerts
 * - Encounter data validation
 *
 * @version 1.0.0
 */

import { ToastSystem } from '../../components/toast/ToastSystem.js';
import { DataServices } from '../data-services.js';

// Toast duration constants
export const TOAST_DURATION = {
    SHORT: 1500,
    NORMAL: 2000,
    LONG: 3000,
    ERROR: 4000
};

export class EncounterEvents {
    /**
     * Handle save encounter to file system
     */
    static async handleSaveEncounter() {
        // Check if there are any combatants to save
        const allCombatants = DataServices.combatantManager.getAllCombatants();
        if (allCombatants.length === 0) {
            ToastSystem.show('No combatants to save', 'info', TOAST_DURATION.LONG);
            return;
        }

        try {
            // Generate default filename with timestamp
            const defaultFileName = this._generateDefaultFileName();

            // Prepare encounter data structure
            const encounterData = {
                name: '', // Will be filled from filename
                timestamp: new Date().toISOString(),
                version: '1.0',
                combatants: allCombatants.map(combatant => ({
                    creatureId: combatant.creatureId,
                    instanceData: combatant
                }))
            };

            // Save using appropriate method
            if ('showSaveFilePicker' in window) {
                await this._saveWithFileSystemAPI(encounterData, defaultFileName);
            } else {
                await this._saveWithFallback(encounterData, defaultFileName);
            }
        } catch (error) {
            console.error('❌ Error saving encounter:', error);
            ToastSystem.show('Failed to save encounter: ' + error.message, 'error', TOAST_DURATION.ERROR);
        }
    }

    /**
     * Handle load encounter from file system
     */
    static async handleLoadEncounter() {
        // Create file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';

        fileInput.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) {
                ToastSystem.show('No file selected', 'info', TOAST_DURATION.NORMAL);
                return;
            }

            try {
                // Read and parse the file
                const fileContent = await file.text();
                const encounterData = JSON.parse(fileContent);

                // Validate encounter data structure
                const validation = this._validateEncounterData(encounterData);
                if (!validation.valid) {
                    ToastSystem.show(validation.error, 'error', TOAST_DURATION.LONG);
                    return;
                }

                // Confirm replacement if existing combatants
                if (!await this._confirmReplaceExisting()) {
                    ToastSystem.show('Load cancelled', 'info', TOAST_DURATION.NORMAL);
                    return;
                }

                // Validate and load combatants
                const result = this._loadCombatants(encounterData);

                // Show results with missing creature alerts if any
                this._showLoadResults(encounterData.name, result);

            } catch (error) {
                console.error('❌ Error loading encounter:', error);
                if (error instanceof SyntaxError) {
                    ToastSystem.show('Invalid JSON file', 'error', TOAST_DURATION.LONG);
                } else {
                    ToastSystem.show('Failed to load encounter: ' + error.message, 'error', TOAST_DURATION.ERROR);
                }
            }
        };

        // Trigger file picker
        fileInput.click();
    }

    /**
     * Generate default filename with timestamp
     * @private
     */
    static _generateDefaultFileName() {
        // Remove milliseconds and 'Z' suffix: ".123Z" = 5 characters
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        return `encounter-${timestamp}.json`;
    }

    /**
     * Save encounter using File System Access API
     * @private
     */
    static async _saveWithFileSystemAPI(encounterData, defaultFileName) {
        try {
            // Use File System Access API to show save dialog
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: defaultFileName,
                types: [{
                    description: 'JSON Files',
                    accept: { 'application/json': ['.json'] }
                }]
            });

            // Get the filename from the file handle and update encounter name
            const savedFileName = fileHandle.name.replace('.json', '');
            encounterData.name = savedFileName;

            // Convert to JSON (only once, after name is set)
            const jsonString = JSON.stringify(encounterData, null, 2);

            // Write the file
            const writable = await fileHandle.createWritable();
            await writable.write(jsonString);
            await writable.close();

            ToastSystem.show(`Encounter saved successfully!`, 'success', TOAST_DURATION.LONG);
            console.log(`✅ Saved encounter: ${savedFileName}`);
        } catch (err) {
            // User cancelled the save dialog
            if (err.name === 'AbortError') {
                ToastSystem.show('Save cancelled', 'info', TOAST_DURATION.NORMAL);
            } else {
                throw err;
            }
        }
    }

    /**
     * Save encounter using traditional download method (fallback)
     * @private
     */
    static async _saveWithFallback(encounterData, defaultFileName) {
        // Set encounter name from filename
        encounterData.name = defaultFileName.replace('.json', '');

        // Convert to JSON
        const jsonString = JSON.stringify(encounterData, null, 2);

        // Create blob and download
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        ToastSystem.show(`Encounter saved successfully!`, 'success', TOAST_DURATION.LONG);
        console.log(`✅ Saved encounter: ${defaultFileName}`);
    }

    /**
     * Validate encounter data structure
     * @private
     */
    static _validateEncounterData(data) {
        if (!data.name || !data.combatants || !Array.isArray(data.combatants)) {
            return { valid: false, error: 'Invalid encounter file format' };
        }
        return { valid: true };
    }

    /**
     * Confirm replacement of existing combatants
     * @private
     */
    static async _confirmReplaceExisting() {
        const currentCombatants = DataServices.combatantManager.getAllCombatants();
        if (currentCombatants.length > 0) {
            return confirm(`This will replace the current encounter with ${currentCombatants.length} combatants. Continue?`);
        }
        return true;
    }

    /**
     * Load combatants and validate against compendium
     * @private
     */
    static _loadCombatants(encounterData) {
        // Get all available creatures from compendium
        const allCreatures = DataServices.combatantManager?.creatureDatabase || [];
        const creatureIds = new Set(allCreatures.map(c => c.id));

        // Validate which combatants can be loaded
        const validCombatants = [];
        const missingCreatures = [];

        encounterData.combatants.forEach(combatantData => {
            const creatureId = combatantData.creatureId;
            if (creatureIds.has(creatureId)) {
                validCombatants.push(combatantData);
            } else {
                // Find creature name from saved data if available
                const creatureName = combatantData.instanceData?.name || creatureId;
                missingCreatures.push(creatureName);
            }
        });

        // Clear current encounter
        DataServices.combatantManager.clearAll();

        // Load valid combatants
        validCombatants.forEach(combatantData => {
            DataServices.combatantManager.addCombatant(combatantData.creatureId, combatantData.instanceData);
        });

        return {
            loadedCount: validCombatants.length,
            missingCreatures
        };
    }

    /**
     * Show load results with missing creature alerts
     * @private
     */
    static _showLoadResults(encounterName, result) {
        const { loadedCount, missingCreatures } = result;
        const missingCount = missingCreatures.length;

        if (missingCount > 0) {
            // Alert about missing creatures
            const missingList = missingCreatures.join('\n- ');
            alert(`⚠️ Encounter loaded with ${loadedCount} combatant(s).\n\nThe following ${missingCount} creature(s) could not be loaded because they are not in the Compendium:\n\n- ${missingList}`);

            console.warn('❌ Missing creatures:', missingCreatures);
        }

        ToastSystem.show(`Loaded encounter: ${encounterName} (${loadedCount} combatants)`, 'success', TOAST_DURATION.LONG);
        console.log(`✅ Loaded encounter: ${encounterName} with ${loadedCount} combatants`);
    }
}
