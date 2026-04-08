/**
 * Import/Export Handlers - Creature import and export operations
 *
 * ⚠️ CRITICAL: ALL creatures MUST be saved to JSON file ONLY
 * ⚠️ NEVER use localStorage or sessionStorage for creature data
 * ⚠️ Creatures are stored in: src/data/creatures/creature-database.json
 *
 * Handles:
 * - Importing creatures from JSON files
 * - Importing creatures from stat block text
 * - Exporting creatures to JSON
 * - Parsing stat blocks
 *
 * Extracted from EventCoordinator for better code organization
 *
 * @version 2.0.0
 */

import { DataServices } from '../data-services.js';
import { ToastSystem } from '../../components/toast/ToastSystem.js';
import { ModalSystem } from '../../components/modals/ModalSystem.js';
import { CreatureModalEvents } from './creature-modal-events.js';
import { ImportExportEvents } from './import-export-events.js';
import { ModalEvents } from './modal-events.js';
import { CreatureService } from '../services/creature-service.js';
import { MODAL_NAMES } from '../constants.js';

export class ImportExportHandlers {
    /**
     * Open the stat block parser modal
     * ⚠️ Note: Removed sessionStorage usage per project requirements
     */
    static handleImportStatBlock() {
        // Create a temporary trigger element to properly initialize modal
        const trigger = document.createElement('div');
        ModalEvents.handleModalShow(MODAL_NAMES.STAT_BLOCK_PARSER, trigger);
    }

    /**
     * Handle exporting a creature as JSON
     * Delegates to ImportExportEvents for consistency
     * @param {HTMLElement} target - The export button
     */
    static handleExportCreature(target) {
        ImportExportEvents.handleExportCreature(target);
    }

    /**
     * Handle importing a creature from JSON file
     * ⚠️ CRITICAL: Uses CreatureService (JSON file), NOT localStorage
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
                    if (!creatureData.name || !creatureData.type || creatureData.ac === undefined || creatureData.maxHP === undefined) {
                        ToastSystem.show('Invalid creature file: missing required fields (name, type, AC, HP)', 'error', 4000);
                        return;
                    }

                    // Get existing creatures from JSON database
                    const existingCreatures = await CreatureService.loadCreatures();

                    // Check for name collision and auto-rename if needed
                    let finalName = creatureData.name;
                    let finalId = creatureData.id || CreatureService.generateCreatureId(finalName);
                    let counter = 1;

                    while (existingCreatures.some(c => c.id === finalId)) {
                        counter++;
                        finalName = `${creatureData.name} (${counter})`;
                        finalId = CreatureService.generateCreatureId(finalName);
                    }

                    // Update creature data with final name and ID
                    creatureData.name = finalName;
                    creatureData.id = finalId;
                    creatureData.source = creatureData.source || 'Imported';

                    // Add to creature database using CreatureService
                    const success = await CreatureService.addCreature(creatureData);

                    if (!success) {
                        ToastSystem.show('Failed to add creature to database', 'error', 3000);
                        return;
                    }

                    // Reload database
                    if (DataServices.combatantManager) {
                        await DataServices.combatantManager.loadCreatureDatabase();
                    }

                    // Refresh the compendium modal if open
                    const modal = document.querySelector('[data-modal="creature-database"]');
                    if (modal) {
                        CreatureModalEvents.setupCreatureDatabaseModal(modal);

                        // Auto-select the imported creature
                        setTimeout(() => {
                            const creatureItem = modal.querySelector(`.creature-list-item[data-creature-id="${finalId}"]`);
                            if (creatureItem) {
                                creatureItem.click();
                                creatureItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            }
                        }, 100);
                    }

                    const wasRenamed = counter > 1;
                    const message = wasRenamed
                        ? `Imported as "${finalName}" (renamed to avoid collision)`
                        : `Imported ${finalName}`;

                    ToastSystem.show(message, 'success', 3000);
                    console.log(`✅ Imported creature: ${finalName}`);
                    console.log('💾 Use Export Database to save changes to JSON file');

                } catch (parseError) {
                    console.error('❌ Error parsing creature file:', parseError);
                    ToastSystem.show('Failed to import: Invalid JSON file', 'error', 3000);
                }
            };

            // Trigger file picker
            input.click();

        } catch (error) {
            console.error('❌ Error importing creature:', error);
            ToastSystem.show('Failed to import creature: ' + error.message, 'error', 3000);
        }
    }

    /**
     * Handle importing a parsed creature into the compendium
     * ⚠️ CRITICAL: Uses CreatureService (JSON file), NOT localStorage
     * @param {HTMLElement} target - The import button with parsed data
     */
    static async handleImportParsedCreature(target) {
        try {
            const parsedDataStr = target.dataset.parsedCreature;
            if (!parsedDataStr) {
                throw new Error('No parsed creature data found');
            }

            const creature = JSON.parse(parsedDataStr);

            // Check if creature with this ID already exists
            const existing = await CreatureService.getCreature(creature.id);
            if (existing) {
                const confirm = window.confirm(`A creature named "${creature.name}" already exists. Overwrite it?`);
                if (confirm) {
                    await CreatureService.updateCreature(creature.id, creature);
                } else {
                    ToastSystem.show('Import cancelled', 'info', 2000);
                    return;
                }
            } else {
                // Add new creature
                const success = await CreatureService.addCreature(creature);
                if (!success) {
                    ToastSystem.show('Failed to add creature to database', 'error', 3000);
                    return;
                }
            }

            // Reload the consolidated database
            if (DataServices.combatantManager) {
                await DataServices.combatantManager.loadCreatureDatabase();
            }

            ToastSystem.show(`✅ "${creature.name}" imported to compendium!`, 'success', 3000);
            console.log('💾 Use Export Database to save changes to JSON file');

            // Store the creature ID for auto-selection
            const creatureId = creature.id;

            // Close parser modal
            ModalSystem.hide('stat-block-parser');

            // Clear form
            const textArea = document.getElementById('stat-block-text');
            if (textArea) textArea.value = '';

            const previewDiv = document.getElementById('stat-block-preview');
            if (previewDiv) {
                previewDiv.innerHTML = `<div class="empty-state empty-state-centered"><p>Paste a stat block and click "Parse Stat Block" to see a preview</p></div>`;
            }

            // Hide import button
            const importButton = document.getElementById('import-parsed-creature');
            if (importButton) {
                importButton.style.display = 'none';
                delete importButton.dataset.parsedCreature;
            }

            // Wait for parser modal close animation, then open compendium
            setTimeout(() => {
                // Open the compendium modal
                ModalSystem.show('creature-database');

                // Get the compendium modal and refresh its list
                const compendiumModal = document.querySelector('[data-modal="creature-database"]');
                if (compendiumModal) {
                    // Refresh the creature list to include the newly imported creature
                    CreatureModalEvents.setupCreatureDatabaseModal(compendiumModal);

                    // Wait for list to populate, then select the imported creature
                    setTimeout(() => {
                        const creatureItem = compendiumModal.querySelector(`.creature-list-item[data-creature-id="${creatureId}"]`);
                        if (creatureItem) {
                            creatureItem.click();
                            creatureItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            console.log(`✅ Auto-selected imported creature: ${creature.name}`);
                        }
                    }, 100);
                }
            }, 300);

        } catch (error) {
            console.error('❌ Error importing parsed creature:', error);
            ToastSystem.show('Failed to import creature: ' + error.message, 'error', 3000);
        }
    }
}
