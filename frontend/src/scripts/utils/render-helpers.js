/**
 * Rendering Helper Utilities
 *
 * Common patterns for rendering and DOM updates.
 * Consolidates repeated rendering logic.
 *
 * @module utils/render-helpers
 * @version 1.0.0
 */

import { DataServices } from '../data-services.js';
import { CombatEvents } from '../events/combat-events.js';

/**
 * Sort combatants and re-render the encounter
 * Common pattern used after initiative changes
 */
export function sortAndRenderCombatants() {
    DataServices.combatantManager.sortCombatants();
    DataServices.combatantManager.renderAll();
}

/**
 * Update a combatant and optionally re-render
 * @param {string} combatantId - ID of combatant to update
 * @param {string} field - Field to update (can use dot notation like 'status.flying')
 * @param {*} value - New value
 * @param {boolean} rerender - Whether to re-render (default: true)
 */
export function updateAndRender(combatantId, field, value, rerender = true) {
    DataServices.combatantManager.updateCombatant(combatantId, field, value);
    if (rerender) {
        DataServices.combatantManager.renderAll();
    }
}

/**
 * Update multiple combatants with the same field/value and re-render once
 * @param {Array} combatantIds - Array of combatant IDs
 * @param {string} field - Field to update
 * @param {*} value - New value
 */
export function batchUpdateAndRender(combatantIds, field, value) {
    combatantIds.forEach(id => {
        DataServices.combatantManager.updateCombatant(id, field, value);
    });
    DataServices.combatantManager.renderAll();
}

/**
 * Update a combatant and update combat header if they're active
 * @param {string} combatantId - ID of combatant
 * @param {string} field - Field to update
 * @param {*} value - New value
 */
export function updateAndRefreshActive(combatantId, field, value) {
    const combatant = DataServices.combatantManager.getCombatant(combatantId);

    DataServices.combatantManager.updateCombatant(combatantId, field, value);

    // Update combat header if this is the active combatant
    if (combatant?.status?.isActive) {
        CombatEvents.updateCombatHeader();
    }
}

/**
 * Re-render combatants and update combat header
 * Used after operations that may affect both the list and active combatant
 */
export function renderAllAndUpdateHeader() {
    DataServices.combatantManager.renderAll();
    CombatEvents.updateCombatHeader();
}
