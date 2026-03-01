/**
 * Modal Helper Utilities
 *
 * Common patterns for modal operations.
 * Simplifies modal handling and ensures consistency.
 *
 * @module utils/modal-helpers
 * @version 1.0.0
 */

import { ModalSystem } from '../../components/modals/ModalSystem.js';

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
