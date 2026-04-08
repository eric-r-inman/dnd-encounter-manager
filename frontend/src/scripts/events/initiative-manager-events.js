/**
 * InitiativeManagerEvents - Initiative Modal and Auto-Rolling
 *
 * Handles all initiative management functionality:
 * - Quick sorting by current initiative
 * - Auto-rolling initiative with stat block bonuses
 * - Custom initiative assignment
 * - Automatic sorting after initiative changes
 *
 * @version 1.0.0
 */

import { ModalSystem } from '../../components/modals/ModalSystem.js';
import { DataServices } from '../data-services.js';
import { CombatEvents } from './combat-events.js';
import { getInitiativeModifier } from '../utils/initiative-utils.js';
import { validateCombatantExists, validateCombatantsSelected, validateInitiative } from '../utils/validators.js';
import { showSorted, showInitiativeRoll, showBatchInitiativeRolls, showCombatantUpdate } from '../utils/toast-helpers.js';
import { sortAndRenderCombatants } from '../utils/render-helpers.js';
import { TIMING } from '../constants.js';

export class InitiativeManagerEvents {
    /**
     * Quick sort all combatants by their current initiative values
     */
    static handleQuickSortEncounter() {
        const allCombatants = DataServices.combatantManager.getAllCombatants();

        if (allCombatants.length === 0) {
            ToastSystem.show('No combatants to sort', 'warning', TIMING.TOAST_SHORT);
            return;
        }

        // Sort by initiative (descending) and update manualOrder
        sortAndRenderCombatants();

        showSorted();

        // Close the modal
        ModalSystem.hideAll();
    }

    /**
     * Roll initiative for a single combatant and sort
     * @param {string} combatantId - ID of combatant to roll for
     */
    static handleRollInitiativeSingle(combatantId) {
        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!validateCombatantExists(combatant, combatantId)) return;

        const result = this._rollInitiativeForCombatant(combatant);

        // Sort the encounter
        sortAndRenderCombatants();

        showInitiativeRoll(result.name, result.roll, result.initBonus, result.total);

        // Close the modal
        ModalSystem.hideAll();
    }

    /**
     * Roll initiative for all combatants and sort
     */
    static handleRollInitiativeAll() {
        const allCombatants = DataServices.combatantManager.getAllCombatants();

        if (allCombatants.length === 0) {
            ToastSystem.show('No combatants to roll for', 'warning', TIMING.TOAST_SHORT);
            return;
        }

        const results = [];

        allCombatants.forEach(combatant => {
            const result = this._rollInitiativeForCombatant(combatant);
            results.push(result);
        });

        // Sort the encounter
        sortAndRenderCombatants();

        // Show results
        showBatchInitiativeRolls(results);

        // Close the modal
        ModalSystem.hideAll();
    }

    /**
     * Roll initiative for selected combatants and sort
     */
    static handleRollInitiativeSelected() {
        const allCombatants = DataServices.combatantManager.getAllCombatants();
        const selectedCombatants = allCombatants.filter(c => c.isSelected);

        if (!validateCombatantsSelected(selectedCombatants)) return;

        const results = [];

        selectedCombatants.forEach(combatant => {
            const result = this._rollInitiativeForCombatant(combatant);
            results.push(result);
        });

        // Sort the encounter
        sortAndRenderCombatants();

        // Show results
        showBatchInitiativeRolls(results);

        // Close the modal
        ModalSystem.hideAll();
    }

    /**
     * Apply custom initiative to single combatant and sort
     * @param {string} combatantId - ID of combatant
     * @param {number} customValue - Custom initiative value
     */
    static handleApplyCustomInitiativeSingle(combatantId, customValue) {
        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!validateCombatantExists(combatant, combatantId)) return;

        const value = validateInitiative(customValue);
        if (value === null) return;

        // Update combatant initiative
        DataServices.combatantManager.updateCombatant(combatantId, 'initiative', value);

        // Sort the encounter
        sortAndRenderCombatants();

        showCombatantUpdate(combatant.name, 'initiative', value);

        // Close the modal
        ModalSystem.hideAll();
    }

    /**
     * Apply custom initiative to selected combatants and sort
     * @param {number} customValue - Custom initiative value
     */
    static handleApplyCustomInitiativeSelected(customValue) {
        const allCombatants = DataServices.combatantManager.getAllCombatants();
        const selectedCombatants = allCombatants.filter(c => c.isSelected);

        if (!validateCombatantsSelected(selectedCombatants)) return;

        const value = validateInitiative(customValue);
        if (value === null) return;

        // Update all selected combatants
        selectedCombatants.forEach(combatant => {
            DataServices.combatantManager.updateCombatant(combatant.id, 'initiative', value);
        });

        // Sort the encounter
        sortAndRenderCombatants();

        ToastSystem.show(
            `Initiative set to ${value} for ${selectedCombatants.length} selected creatures`,
            'success',
            TIMING.TOAST_LONG
        );

        // Close the modal
        ModalSystem.hideAll();
    }

    // ========================================================================
    // Private Helper Methods
    // ========================================================================

    /**
     * Roll initiative for a single combatant
     * @param {Object} combatant - The combatant to roll for
     * @returns {Object} Roll result with name, roll, initBonus, and total
     * @private
     */
    static _rollInitiativeForCombatant(combatant) {
        const initBonus = getInitiativeModifier(combatant, DataServices.combatantManager.creatureDatabase);
        const roll = Math.floor(Math.random() * 20) + 1;
        const total = roll + initBonus;

        DataServices.combatantManager.updateCombatant(combatant.id, 'initiative', total);

        return { name: combatant.name, total, roll, initBonus };
    }
}
