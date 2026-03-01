/**
 * Validation Utilities
 *
 * Shared validation logic used throughout the application.
 * Provides consistent validation with standardized error messages.
 *
 * @module utils/validators
 * @version 1.0.0
 */

import { ToastSystem } from '../../components/toast/ToastSystem.js';
import { INITIATIVE_CONSTRAINTS, TIMING } from '../constants.js';

/**
 * Validate that a combatant exists
 * @param {Object} combatant - The combatant to validate
 * @param {string} combatantId - ID for error messages
 * @returns {boolean} True if valid
 */
export function validateCombatantExists(combatant, combatantId) {
    if (!combatant) {
        console.error('Combatant not found:', combatantId);
        ToastSystem.show('Combatant not found', 'error', TIMING.TOAST_SHORT);
        return false;
    }
    return true;
}

/**
 * Validate that combatants are selected
 * @param {Array} combatants - Array of combatants to check
 * @param {string} message - Optional custom message
 * @returns {boolean} True if at least one combatant is selected
 */
export function validateCombatantsSelected(combatants, message = 'No combatants selected') {
    if (combatants.length === 0) {
        ToastSystem.show(message, 'warning', TIMING.TOAST_SHORT);
        return false;
    }
    return true;
}

/**
 * Validate initiative value
 * @param {*} value - Value to validate
 * @returns {number|null} Parsed value or null if invalid
 */
export function validateInitiative(value) {
    if (value === null || value === undefined || value === '') {
        ToastSystem.show('Please enter an initiative value', 'warning', TIMING.TOAST_SHORT);
        return null;
    }

    const parsed = parseInt(value);
    if (isNaN(parsed) || parsed < INITIATIVE_CONSTRAINTS.MIN || parsed > INITIATIVE_CONSTRAINTS.MAX) {
        ToastSystem.show(
            `Initiative must be between ${INITIATIVE_CONSTRAINTS.MIN} and ${INITIATIVE_CONSTRAINTS.MAX}`,
            'error',
            TIMING.TOAST_SHORT
        );
        return null;
    }

    return parsed;
}

/**
 * Validate numeric input within a range
 * @param {*} value - Value to validate
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @param {string} fieldName - Name of field for error messages
 * @returns {number|null} Parsed value or null if invalid
 */
export function validateNumericRange(value, min, max, fieldName) {
    if (value === null || value === undefined || value === '') {
        ToastSystem.show(`Please enter a ${fieldName}`, 'warning', TIMING.TOAST_SHORT);
        return null;
    }

    const parsed = parseInt(value);
    if (isNaN(parsed) || parsed < min || parsed > max) {
        ToastSystem.show(
            `${fieldName} must be between ${min} and ${max}`,
            'error',
            TIMING.TOAST_SHORT
        );
        return null;
    }

    return parsed;
}

/**
 * Validate that a required form field has a value
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of field for error messages
 * @returns {boolean} True if valid
 */
export function validateRequired(value, fieldName) {
    if (!value || value.trim() === '') {
        ToastSystem.show(`Please enter a ${fieldName}`, 'error', TIMING.TOAST_SHORT);
        return false;
    }
    return true;
}

/**
 * Validate dice formula format
 * @param {string} formula - Dice formula to validate
 * @returns {boolean} True if valid format
 */
export function validateDiceFormula(formula) {
    if (!formula || formula.trim() === '') {
        ToastSystem.show('Please enter a dice formula', 'error', TIMING.TOAST_SHORT);
        return false;
    }

    // Basic dice formula pattern: XdY or XdY+Z or XdY-Z
    const dicePattern = /^\d+d\d+([+-]\d+)?$/i;
    if (!dicePattern.test(formula.trim())) {
        ToastSystem.show('Invalid dice formula. Use format like 1d20+5', 'error', TIMING.TOAST_LONG);
        return false;
    }

    return true;
}

/**
 * Validate creature selection from a modal/form
 * @param {string} creatureId - Creature ID to validate
 * @param {string} message - Optional custom message
 * @returns {boolean} True if valid
 */
export function validateCreatureSelected(creatureId, message = 'Please select a creature first') {
    if (!creatureId) {
        ToastSystem.show(message, 'warning', TIMING.TOAST_SHORT);
        return false;
    }
    return true;
}
