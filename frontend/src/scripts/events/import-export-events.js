/**
 * ImportExportEvents - Creature import/export management
 *
 * Handles creature data import and export including:
 * - Exporting creatures to JSON files
 * - Importing creatures from JSON with validation
 * - Auto-renaming on name collisions
 * - Custom creature management
 *
 * @version 1.0.0
 */

import { ToastSystem } from '../../components/toast/ToastSystem.js';
import { DataServices } from '../data-services.js';
import { TOAST_DURATION } from './encounter-events.js';

export class ImportExportEvents {
    /**
     * Handle exporting a creature to JSON file
     * @param {HTMLElement} target - The export button that was clicked
     */
    static handleExportCreature(target) {
        const modal = target.closest('[data-modal="creature-database"]');
        if (!modal) return;

        const creatureId = modal.getAttribute('data-selected-creature-id');
        if (!creatureId) {
            ToastSystem.show('Please select a creature first', 'warning', TOAST_DURATION.NORMAL);
            return;
        }

        // Get creature from database
        const allCreatures = DataServices.combatantManager?.creatureDatabase || [];
        const creature = allCreatures.find(c => c.id === creatureId);

        if (!creature) {
            ToastSystem.show('Creature not found', 'error', TOAST_DURATION.NORMAL);
            return;
        }

        try {
            // Convert creature to JSON
            const jsonString = JSON.stringify(creature, null, 2);

            // Create blob and download
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            // Create download link with sanitized filename
            const a = document.createElement('a');
            a.href = url;
            a.download = `${creature.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`;

            // Trigger download
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Clean up
            URL.revokeObjectURL(url);

            ToastSystem.show(`Exported ${creature.name}`, 'success', TOAST_DURATION.NORMAL);
            console.log(`✅ Exported creature: ${creature.name}`);
        } catch (error) {
            console.error('❌ Error exporting creature:', error);
            ToastSystem.show('Failed to export creature: ' + error.message, 'error', TOAST_DURATION.LONG);
        }
    }

    /**
     * Handle importing a creature from JSON file
     */
    static async handleImportCreature() {
        try {
            // Create file input
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json';

            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                try {
                    // Read file
                    const text = await file.text();
                    const creatureData = JSON.parse(text);

                    // Validate required fields
                    const validation = this._validateCreatureData(creatureData);
                    if (!validation.valid) {
                        ToastSystem.show(validation.error, 'error', TOAST_DURATION.ERROR);
                        return;
                    }

                    // Handle name collision and save
                    await this._importCreatureToDatabase(creatureData);

                    ToastSystem.show(`✅ "${creatureData.name}" imported successfully!`, 'success', TOAST_DURATION.LONG);
                    console.log(`✅ Imported creature: ${creatureData.name}`);

                } catch (error) {
                    console.error('❌ Error importing creature:', error);
                    if (error instanceof SyntaxError) {
                        ToastSystem.show('Invalid JSON file', 'error', TOAST_DURATION.LONG);
                    } else {
                        ToastSystem.show('Failed to import creature: ' + error.message, 'error', TOAST_DURATION.ERROR);
                    }
                }
            };

            // Trigger file picker
            input.click();

        } catch (error) {
            console.error('❌ Error in import process:', error);
            ToastSystem.show('Failed to import creature', 'error', TOAST_DURATION.ERROR);
        }
    }

    /**
     * Validate creature data has required fields
     * @private
     */
    static _validateCreatureData(creatureData) {
        if (!creatureData.name || !creatureData.type || creatureData.ac === undefined || creatureData.maxHP === undefined) {
            return {
                valid: false,
                error: 'Invalid creature file: missing required fields (name, type, AC, HP)'
            };
        }
        return { valid: true };
    }

    /**
     * Import creature to database with auto-rename on collision
     * @private
     */
    static async _importCreatureToDatabase(creatureData) {
        // Get existing creatures
        const customCreatures = JSON.parse(localStorage.getItem('dnd-custom-creatures') || '[]');

        // Check for name collision and auto-rename if needed
        let finalName = creatureData.name;
        let finalId = creatureData.id || finalName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        let counter = 1;

        while (customCreatures.some(c => c.id === finalId)) {
            counter++;
            finalName = `${creatureData.name} (${counter})`;
            finalId = finalName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        }

        // Update creature data with final name and ID
        creatureData.name = finalName;
        creatureData.id = finalId;
        creatureData.isCustom = true;
        creatureData.source = creatureData.source || 'Imported';

        // Add to custom creatures
        customCreatures.push(creatureData);
        localStorage.setItem('dnd-custom-creatures', JSON.stringify(customCreatures));

        // Reload database
        if (DataServices.combatantManager) {
            await DataServices.combatantManager.loadCreatureDatabase();
        }
    }
}
