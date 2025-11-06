/**
 * InitiativeEvents - Initiative rolling and management
 *
 * Handles all initiative-related functionality:
 * - Quick Initiative rolling
 * - Initiative modal management
 * - Bulk initiative operations
 *
 * @version 1.0.0
 */

import { ToastSystem } from '../../components/toast/ToastSystem.js';
import { ModalSystem } from '../../components/modals/ModalSystem.js';
import { DataServices } from '../data-services.js';
import { CombatEvents } from './combat-events.js';

export class InitiativeEvents {
    /**
     * Open Quick Initiative modal for a combatant
     * @param {HTMLElement} initiativeDisplay - The initiative display element
     */
    static openQuickInitiativeModal(initiativeDisplay) {
        // Get the combatant card and ID
        const combatantCard = initiativeDisplay.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');

        if (!combatantId) {
            console.error('Could not find combatant ID');
            return;
        }

        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }

        // Get all selected combatants
        const allCombatants = DataServices.combatantManager.getAllCombatants();
        const selectedCombatants = allCombatants.filter(c => c.isSelected);

        // Store the current combatant ID
        const combatantIdInput = document.getElementById('quick-init-combatant-id');
        if (combatantIdInput) {
            combatantIdInput.value = combatantId;
        }

        // Clear the modifier field
        const modifierInput = document.getElementById('quick-init-modifier');
        if (modifierInput) {
            modifierInput.value = '';
        }

        // Show/hide target selection based on number of selected creatures
        const targetSelection = document.getElementById('quick-initiative-target-selection');
        const selectedCountSpan = document.getElementById('selected-count');

        if (selectedCombatants.length > 0) {
            // Show target selection
            if (targetSelection) targetSelection.style.display = 'block';
            if (selectedCountSpan) selectedCountSpan.textContent = selectedCombatants.length;
        } else {
            // Hide target selection
            if (targetSelection) targetSelection.style.display = 'none';
        }

        // Open the modal
        ModalSystem.show('quick-initiative');
    }

    /**
     * Roll initiative for selected creature(s)
     * @param {HTMLElement} target - The roll button element
     */
    static rollQuickInitiative(target) {
        // Get form data
        const combatantId = document.getElementById('quick-init-combatant-id')?.value;
        const modifierInput = document.getElementById('quick-init-modifier');
        const additionalModifier = parseInt(modifierInput?.value) || 0;

        // Determine which creatures to roll for
        const targetRadio = document.querySelector('input[name="initiative-target"]:checked');
        const rollForSelected = targetRadio?.value === 'selected';

        let combatantsToRoll = [];

        if (rollForSelected) {
            // Roll for all selected combatants
            const allCombatants = DataServices.combatantManager.getAllCombatants();
            combatantsToRoll = allCombatants.filter(c => c.isSelected);

            if (combatantsToRoll.length === 0) {
                ToastSystem.show('No creatures selected', 'warning', 2000);
                return;
            }
        } else {
            // Roll for current combatant only
            const combatant = DataServices.combatantManager.getCombatant(combatantId);
            if (!combatant) {
                console.error('Combatant not found:', combatantId);
                return;
            }
            combatantsToRoll = [combatant];
        }

        // Roll initiative for each combatant
        const results = this._rollInitiativeForCombatants(combatantsToRoll, additionalModifier);

        // Re-sort and render
        DataServices.combatantManager.sortCombatants();
        DataServices.combatantManager.renderAll();

        // Show results
        this._displayRollResults(results);

        // Close the modal
        ModalSystem.hide('quick-initiative');

        // Update combat header if needed
        CombatEvents.updateCombatHeader();
    }

    /**
     * Roll initiative for an array of combatants
     * @param {Array} combatants - Array of combatants to roll for
     * @param {number} additionalModifier - Additional modifier to apply
     * @returns {Array} Array of roll results
     * @private
     */
    static _rollInitiativeForCombatants(combatants, additionalModifier = 0) {
        const results = [];

        combatants.forEach(combatant => {
            // Get initiative modifier from creature
            const initiativeModifier = this._getDexModifier(combatant);

            // Roll d20
            const d20Roll = Math.floor(Math.random() * 20) + 1;

            // Calculate total initiative
            const totalInitiative = d20Roll + initiativeModifier + additionalModifier;

            // Update combatant's initiative
            DataServices.combatantManager.updateCombatant(combatant.id, 'initiative', totalInitiative);

            results.push({
                name: combatant.name,
                roll: d20Roll,
                initMod: initiativeModifier,
                addMod: additionalModifier,
                total: totalInitiative
            });
        });

        return results;
    }

    /**
     * Get initiative modifier for a combatant
     * Prefers statBlock.initiative.modifier if available, otherwise uses DEX modifier
     * @param {Object} combatant - The combatant
     * @returns {number} Initiative modifier
     * @private
     */
    static _getDexModifier(combatant) {
        const creature = DataServices.combatantManager.creatureDatabase.find(c => c.id === combatant.creatureId);

        // Use statBlock.initiative.modifier if available (includes DEX + any bonuses)
        if (creature?.statBlock?.initiative?.modifier !== undefined) {
            return creature.statBlock.initiative.modifier;
        }

        // Otherwise fall back to DEX modifier
        if (creature?.statBlock?.abilities?.dex?.modifier !== undefined) {
            return creature.statBlock.abilities.dex.modifier;
        }

        return 0;
    }

    /**
     * Display roll results to user
     * @param {Array} results - Array of roll results
     * @private
     */
    static _displayRollResults(results) {
        if (results.length === 1) {
            const r = results[0];
            const modText = r.addMod !== 0 ? ` + ${r.addMod}` : '';
            ToastSystem.show(
                `${r.name}: ${r.roll} (d20) + ${r.initMod} (INIT)${modText} = ${r.total}`,
                'success',
                3000
            );
        } else {
            const summary = results.map(r => `${r.name}: ${r.total}`).join(', ');
            ToastSystem.show(
                `Rolled initiative for ${results.length} creatures: ${summary}`,
                'success',
                4000
            );
        }
    }
}
