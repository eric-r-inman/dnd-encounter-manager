/**
 * Modal Helper Utilities
 *
 * Common patterns for modal operations.
 * Simplifies modal handling and ensures consistency.
 * Consolidated from modal-helpers.js and modal-utils.js
 *
 * @module utils/modal-helpers
 * @version 1.0.1
 */

import { ModalSystem } from '../../components/modals/ModalSystem.js';
import { ModalEvents } from '../events/modal-events.js';
import { STORAGE_KEYS, MODAL_NAMES, TIMING } from '../constants.js';

/**
 * Get the selected creature ID from a creature database modal
 * @param {HTMLElement} modal - The modal element
 * @returns {string|null} The selected creature ID or null
 */
export function getSelectedCreatureId(modal) {
    return modal?.getAttribute('data-selected-creature-id') || null;
}

/**
 * Close all modals
 * Convenience wrapper for ModalSystem.hideAll()
 */
export function closeAllModals() {
    ModalSystem.hideAll();
}

/**
 * Close a specific modal
 * @param {string} modalName - Name of the modal to close
 */
export function closeModal(modalName) {
    ModalSystem.hide(modalName);
}

/**
 * Open a modal
 * @param {string} modalName - Name of the modal to open
 */
export function openModal(modalName) {
    ModalSystem.show(modalName);
}

/**
 * Get form data from a modal
 * @param {HTMLElement} modal - The modal element
 * @returns {FormData|null} FormData object or null if no form found
 */
export function getModalFormData(modal) {
    const form = modal?.querySelector('form');
    return form ? new FormData(form) : null;
}

/**
 * Common pattern: Get modal, get form data, return both
 * @param {HTMLElement} target - Element within the modal
 * @param {string} modalSelector - Selector for the modal (e.g., '[data-modal="creature-form"]')
 * @returns {{modal: HTMLElement|null, formData: FormData|null}}
 */
export function getModalAndFormData(target, modalSelector) {
    const modal = target.closest(modalSelector);
    const formData = getModalFormData(modal);
    return { modal, formData };
}

/**
 * Reset a modal's form
 * @param {string} modalName - Name of the modal
 */
export function resetModalForm(modalName) {
    const modal = document.querySelector(`[data-modal="${modalName}"]`);
    const form = modal?.querySelector('form');
    if (form) {
        form.reset();
    }
}

/**
 * Set a data attribute on a modal
 * @param {string} modalName - Name of the modal
 * @param {string} attribute - Attribute name (without 'data-' prefix)
 * @param {string} value - Attribute value
 */
export function setModalData(modalName, attribute, value) {
    const modal = document.querySelector(`[data-modal="${modalName}"]`);
    if (modal) {
        modal.setAttribute(`data-${attribute}`, value);
    }
}

/**
 * Get a data attribute from a modal
 * @param {string} modalName - Name of the modal
 * @param {string} attribute - Attribute name (without 'data-' prefix)
 * @returns {string|null} Attribute value or null
 */
export function getModalData(modalName, attribute) {
    const modal = document.querySelector(`[data-modal="${modalName}"]`);
    return modal?.getAttribute(`data-${attribute}`) || null;
}

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
