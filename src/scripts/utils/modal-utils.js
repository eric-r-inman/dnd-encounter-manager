/**
 * Modal Utilities
 *
 * Shared utility functions for modal operations to eliminate code duplication.
 * These functions encapsulate common modal workflows used across the application.
 *
 * @module utils/modal-utils
 * @version 1.0.0
 */

import { ModalSystem } from '../../components/modals/ModalSystem.js';
import { ModalEvents } from '../events/modal-events.js';
import { STORAGE_KEYS, MODAL_NAMES, TIMING } from '../constants.js';

/**
 * Cancel form and return to compendium with last selected creature
 *
 * This utility handles the common workflow when canceling creature or player forms:
 * 1. Close the form modal
 * 2. Reopen the creature database (compendium)
 * 3. Restore the previously selected creature (if any)
 * 4. Clean up session storage
 *
 * @param {string} modalToClose - The modal name to close (e.g., 'creature-form', 'player-form')
 * @param {string} formType - Human-readable form type for logging (e.g., 'creature form', 'player form')
 */
export function returnToCompendiumAfterCancel(modalToClose, formType = 'form') {
    console.log(`🔙 Cancel ${formType} - returning to compendium`);

    // Get the creature ID that was being edited (if any)
    const creatureId = sessionStorage.getItem(STORAGE_KEYS.EDITING_CREATURE_ID);
    console.log('Stored creature ID:', creatureId);

    // Close the form modal
    ModalSystem.hide(modalToClose);

    // Open the compendium after a short delay for smooth transition
    setTimeout(() => {
        const trigger = document.createElement('div');

        // If there was a creature being edited, select it in the compendium
        if (creatureId) {
            trigger.setAttribute('data-selected-creature-id', creatureId);
        }

        // Open the creature database modal
        ModalEvents.handleModalShow(MODAL_NAMES.CREATURE_DATABASE, trigger);

        // Clean up session storage
        sessionStorage.removeItem(STORAGE_KEYS.EDITING_CREATURE_ID);
    }, TIMING.MODAL_TRANSITION_DELAY);
}
