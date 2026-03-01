/**
 * Toast Helper Utilities
 *
 * Reusable toast notification helpers for common patterns.
 * Reduces duplication and ensures consistent messaging.
 *
 * @module utils/toast-helpers
 * @version 1.0.0
 */

import { ToastSystem } from '../../components/toast/ToastSystem.js';
import { TIMING } from '../constants.js';

/**
 * Show a success toast for a batch operation
 * @param {string} action - Action performed (e.g., "Applied", "Updated")
 * @param {string} item - Item name (e.g., "condition", "effect")
 * @param {number} count - Number of combatants affected
 */
export function showBatchSuccess(action, item, count) {
    ToastSystem.show(
        `${action} ${item} to ${count} combatant${count !== 1 ? 's' : ''}`,
        'success',
        TIMING.TOAST_LONG
    );
}

/**
 * Show a success toast for a single combatant update
 * @param {string} combatantName - Name of the combatant
 * @param {string} fieldName - Field that was updated
 * @param {*} newValue - New value
 */
export function showCombatantUpdate(combatantName, fieldName, newValue) {
    ToastSystem.show(
        `${combatantName}'s ${fieldName} updated to ${newValue}`,
        'success',
        TIMING.TOAST_SHORT
    );
}

/**
 * Show a success toast for adding/removing a combatant
 * @param {string} combatantName - Name of the combatant
 * @param {boolean} added - True if added, false if removed
 */
export function showCombatantChange(combatantName, added = true) {
    const action = added ? 'Added' : 'Removed';
    const preposition = added ? 'to' : 'from';
    ToastSystem.show(
        `${action} ${combatantName} ${preposition} encounter`,
        'success',
        TIMING.TOAST_LONG
    );
}

/**
 * Show a success toast for deleting an item
 * @param {string} itemName - Name of the deleted item
 * @param {string} itemType - Type of item (optional, defaults to generic message)
 */
export function showDeletion(itemName, itemType = '') {
    const message = itemType ? `Deleted ${itemType}: ${itemName}` : `Deleted: ${itemName}`;
    ToastSystem.show(message, 'success', TIMING.TOAST_SHORT);
}

/**
 * Show a success toast for duplicating an item
 * @param {string} itemName - Name of the duplicated item
 */
export function showDuplication(itemName) {
    ToastSystem.show(`Duplicated: ${itemName}`, 'success', TIMING.TOAST_SHORT);
}

/**
 * Show an error toast for a failed operation
 * @param {string} operation - The operation that failed
 * @param {Error|string} error - Error object or message
 */
export function showOperationError(operation, error) {
    const message = error?.message || error || 'Unknown error';
    ToastSystem.show(
        `Failed to ${operation}: ${message}`,
        'error',
        TIMING.TOAST_LONG
    );
}

/**
 * Show a success toast for sorting/reordering
 * @param {string} what - What was sorted (e.g., "Encounter", "Combatants")
 */
export function showSorted(what = 'Encounter') {
    ToastSystem.show(`${what} sorted by initiative`, 'success', TIMING.TOAST_SHORT);
}

/**
 * Show a success toast for initiative roll with details
 * @param {string} name - Combatant name
 * @param {number} roll - D20 roll result
 * @param {number} modifier - Initiative modifier
 * @param {number} total - Total initiative
 */
export function showInitiativeRoll(name, roll, modifier, total) {
    ToastSystem.show(
        `${name}: ${roll} (d20) + ${modifier} (INIT) = ${total}`,
        'success',
        TIMING.TOAST_LONG
    );
}

/**
 * Show a success toast for batch initiative rolls
 * @param {Array} results - Array of roll results with name and total
 */
export function showBatchInitiativeRolls(results) {
    const summary = results.map(r => `${r.name}: ${r.total}`).join(', ');
    ToastSystem.show(
        `Rolled initiative for ${results.length} creatures: ${summary}`,
        'success',
        TIMING.TOAST_EXTRA_LONG
    );
}

/**
 * Show a success toast for clearing/resetting
 * @param {string} what - What was cleared (e.g., "note", "effects")
 * @param {string} forWhom - For whom it was cleared (optional)
 */
export function showCleared(what, forWhom = '') {
    const message = forWhom ? `${what} cleared for ${forWhom}` : `${what} cleared`;
    ToastSystem.show(message, 'success', TIMING.TOAST_SHORT);
}

/**
 * Show a success toast for setting the active combatant
 * @param {string} combatantName - Name of the now-active combatant
 */
export function showActiveChanged(combatantName) {
    ToastSystem.show(
        `${combatantName} is now the active combatant`,
        'success',
        TIMING.TOAST_SHORT
    );
}
