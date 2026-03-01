/**
 * Error Handling Utilities
 *
 * Consistent error handling and logging patterns.
 * Centralizes error reporting and user feedback.
 *
 * @module utils/error-handlers
 * @version 1.0.0
 */

import { ToastSystem } from '../../components/toast/ToastSystem.js';
import { TIMING } from '../constants.js';

/**
 * Handle a general operation error with consistent logging and user feedback
 * @param {string} operation - Name of the operation that failed
 * @param {Error|string} error - Error object or message
 * @param {boolean} showToast - Whether to show a toast notification (default: true)
 */
export function handleOperationError(operation, error, showToast = true) {
    const message = error?.message || error || 'Unknown error';
    console.error(`❌ ${operation} failed:`, error);

    if (showToast) {
        ToastSystem.show(
            `Failed to ${operation}: ${message}`,
            'error',
            TIMING.TOAST_LONG
        );
    }
}

/**
 * Handle a combatant not found error
 * @param {string} combatantId - ID of the missing combatant
 * @param {boolean} showToast - Whether to show a toast notification (default: true)
 */
export function handleCombatantNotFound(combatantId, showToast = true) {
    console.error('Combatant not found:', combatantId);

    if (showToast) {
        ToastSystem.show('Combatant not found', 'error', TIMING.TOAST_SHORT);
    }
}

/**
 * Handle a creature not found error
 * @param {string} creatureId - ID of the missing creature
 * @param {boolean} showToast - Whether to show a toast notification (default: true)
 */
export function handleCreatureNotFound(creatureId, showToast = true) {
    console.error('Creature not found:', creatureId);

    if (showToast) {
        ToastSystem.show('Creature not found', 'error', TIMING.TOAST_SHORT);
    }
}

/**
 * Handle a validation error
 * @param {string} field - Field that failed validation
 * @param {string} message - Validation error message
 * @param {boolean} showToast - Whether to show a toast notification (default: true)
 */
export function handleValidationError(field, message, showToast = true) {
    console.warn(`⚠️  Validation error for ${field}:`, message);

    if (showToast) {
        ToastSystem.show(message, 'warning', TIMING.TOAST_SHORT);
    }
}

/**
 * Safely execute an async operation with error handling
 * @param {Function} operation - Async function to execute
 * @param {string} operationName - Name of operation for error messages
 * @param {Function} onError - Optional custom error handler
 * @returns {Promise<*>} Result of the operation or null on error
 */
export async function safeExecute(operation, operationName, onError = null) {
    try {
        return await operation();
    } catch (error) {
        if (onError) {
            onError(error);
        } else {
            handleOperationError(operationName, error);
        }
        return null;
    }
}

/**
 * Log a warning without showing a toast
 * @param {string} message - Warning message
 * @param {*} details - Optional additional details to log
 */
export function logWarning(message, details = null) {
    console.warn(`⚠️  ${message}`, details || '');
}

/**
 * Log an error without showing a toast
 * @param {string} message - Error message
 * @param {*} error - Error object or details
 */
export function logError(message, error = null) {
    console.error(`❌ ${message}`, error || '');
}

/**
 * Log an info message
 * @param {string} message - Info message
 * @param {*} details - Optional additional details
 */
export function logInfo(message, details = null) {
    console.log(`ℹ️  ${message}`, details || '');
}
