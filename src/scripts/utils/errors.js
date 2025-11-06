/**
 * Error Handling System
 *
 * Provides custom error classes and centralized error handling utilities
 * for consistent error management across the application.
 *
 * @module utils/errors
 * @version 1.0.0
 */

import { ToastSystem } from '../../components/toast/ToastSystem.js';
import { TIMING } from '../constants.js';

/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
    /**
     * @param {string} message - Error message
     * @param {Object} options - Additional error options
     * @param {string} [options.code] - Error code for categorization
     * @param {*} [options.details] - Additional error details
     * @param {Error} [options.cause] - Original error that caused this error
     */
    constructor(message, options = {}) {
        super(message);
        this.name = this.constructor.name;
        this.code = options.code;
        this.details = options.details;
        this.cause = options.cause;
        this.timestamp = new Date().toISOString();

        // Maintains proper stack trace for where error was thrown (V8 only)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    /**
     * Convert error to JSON for logging
     * @returns {Object} JSON representation of error
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            details: this.details,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends AppError {
    /**
     * @param {string} message - Validation error message
     * @param {Object} options - Additional options
     * @param {string} [options.field] - Field that failed validation
     * @param {*} [options.value] - Value that failed validation
     * @param {string} [options.constraint] - Validation constraint that failed
     */
    constructor(message, options = {}) {
        super(message, { ...options, code: 'VALIDATION_ERROR' });
        this.field = options.field;
        this.value = options.value;
        this.constraint = options.constraint;
    }
}

/**
 * Error thrown when data is not found
 */
export class NotFoundError extends AppError {
    /**
     * @param {string} resourceType - Type of resource not found
     * @param {string|number} identifier - Identifier of missing resource
     */
    constructor(resourceType, identifier) {
        super(`${resourceType} not found: ${identifier}`, {
            code: 'NOT_FOUND',
            details: { resourceType, identifier }
        });
    }
}

/**
 * Error thrown when storage operations fail
 */
export class StorageError extends AppError {
    /**
     * @param {string} operation - Storage operation that failed (read/write/delete)
     * @param {string} key - Storage key involved
     * @param {Error} [cause] - Original error
     */
    constructor(operation, key, cause) {
        super(`Storage ${operation} failed for key: ${key}`, {
            code: 'STORAGE_ERROR',
            details: { operation, key },
            cause
        });
    }
}

/**
 * Error thrown when parsing/import fails
 */
export class ParseError extends AppError {
    /**
     * @param {string} format - Format being parsed (JSON, stat block, etc.)
     * @param {Error} [cause] - Original parsing error
     */
    constructor(format, cause) {
        super(`Failed to parse ${format}`, {
            code: 'PARSE_ERROR',
            details: { format },
            cause
        });
    }
}

/**
 * Error thrown when data integrity check fails
 */
export class DataIntegrityError extends AppError {
    /**
     * @param {string} message - Description of integrity violation
     * @param {Object} [details] - Additional details about the violation
     */
    constructor(message, details) {
        super(message, {
            code: 'DATA_INTEGRITY_ERROR',
            details
        });
    }
}

/**
 * Global error handler utility
 */
export class ErrorHandler {
    /**
     * Handle an error with appropriate user feedback and logging
     * @param {Error} error - The error to handle
     * @param {Object} options - Handling options
     * @param {boolean} [options.showToast=true] - Whether to show toast notification
     * @param {string} [options.userMessage] - Custom message to show user
     * @param {boolean} [options.logToConsole=true] - Whether to log to console
     * @param {Function} [options.onError] - Callback to execute after handling
     */
    static handle(error, options = {}) {
        const {
            showToast = true,
            userMessage,
            logToConsole = true,
            onError
        } = options;

        // Log to console for debugging
        if (logToConsole) {
            this.logError(error);
        }

        // Show user-friendly message
        if (showToast) {
            const message = userMessage || this.getUserMessage(error);
            const duration = this.getSeverity(error) === 'critical'
                ? TIMING.TOAST_LONG
                : TIMING.TOAST_SHORT;

            ToastSystem.show(message, 'error', duration);
        }

        // Execute callback if provided
        if (onError && typeof onError === 'function') {
            try {
                onError(error);
            } catch (callbackError) {
                console.error('Error in error handler callback:', callbackError);
            }
        }

        // Return error for further handling if needed
        return error;
    }

    /**
     * Log error to console with proper formatting
     * @param {Error} error - Error to log
     */
    static logError(error) {
        const timestamp = new Date().toISOString();

        if (error instanceof AppError) {
            console.error(`[${timestamp}] ${error.name}:`, {
                message: error.message,
                code: error.code,
                details: error.details,
                stack: error.stack
            });

            if (error.cause) {
                console.error('Caused by:', error.cause);
            }
        } else {
            console.error(`[${timestamp}] Error:`, error);
        }
    }

    /**
     * Get user-friendly error message
     * @param {Error} error - Error to get message for
     * @returns {string} User-friendly message
     */
    static getUserMessage(error) {
        if (error instanceof ValidationError) {
            return error.field
                ? `Invalid ${error.field}: ${error.message}`
                : error.message;
        }

        if (error instanceof NotFoundError) {
            return error.message;
        }

        if (error instanceof StorageError) {
            return 'Failed to save data. Please try again.';
        }

        if (error instanceof ParseError) {
            return `Failed to parse ${error.details?.format || 'data'}. Please check the format and try again.`;
        }

        if (error instanceof DataIntegrityError) {
            return 'Data validation failed. Please check your input.';
        }

        // Default message for unknown errors
        return error.message || 'An unexpected error occurred. Please try again.';
    }

    /**
     * Determine error severity
     * @param {Error} error - Error to assess
     * @returns {string} Severity level: 'critical', 'warning', 'info'
     */
    static getSeverity(error) {
        if (error instanceof DataIntegrityError || error instanceof StorageError) {
            return 'critical';
        }

        if (error instanceof ValidationError) {
            return 'warning';
        }

        if (error instanceof NotFoundError) {
            return 'info';
        }

        return 'warning';
    }

    /**
     * Wrap a function with error handling
     * @param {Function} fn - Function to wrap
     * @param {Object} [options] - Error handling options
     * @returns {Function} Wrapped function
     */
    static wrap(fn, options = {}) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.handle(error, options);
                throw error; // Re-throw so caller can handle if needed
            }
        };
    }

    /**
     * Create a safe version of a function that catches and handles errors
     * @param {Function} fn - Function to make safe
     * @param {*} [fallbackValue] - Value to return if error occurs
     * @param {Object} [options] - Error handling options
     * @returns {Function} Safe function
     */
    static makeSafe(fn, fallbackValue = null, options = {}) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.handle(error, options);
                return fallbackValue;
            }
        };
    }
}

/**
 * Utility to try an operation with fallback
 * @param {Function} operation - Operation to try
 * @param {*} fallback - Fallback value if operation fails
 * @returns {*} Result of operation or fallback
 */
export async function tryOrDefault(operation, fallback) {
    try {
        return await operation();
    } catch (error) {
        ErrorHandler.logError(error);
        return fallback;
    }
}

/**
 * Assert a condition, throw ValidationError if false
 * @param {boolean} condition - Condition to check
 * @param {string} message - Error message if condition is false
 * @param {Object} [details] - Additional error details
 * @throws {ValidationError}
 */
export function assert(condition, message, details) {
    if (!condition) {
        throw new ValidationError(message, details);
    }
}

/**
 * Assert a value is not null or undefined
 * @param {*} value - Value to check
 * @param {string} name - Name of the value for error message
 * @throws {ValidationError}
 */
export function assertNotNull(value, name) {
    if (value === null || value === undefined) {
        throw new ValidationError(`${name} is required`, { field: name, value });
    }
}
