/**
 * ErrorHandler - Centralized error handling utility
 *
 * Provides consistent error handling across the application with:
 * - User-friendly error messages
 * - Error logging
 * - Error recovery strategies
 * - Optional error reporting to external services
 *
 * @version 1.0.0
 */

import { Logger } from './logger.js';
import { ToastSystem } from '../../components/toast/ToastSystem.js';

/**
 * Custom error types for better error categorization
 */
export class CombatantError extends Error {
    constructor(message, combatantId, operation) {
        super(message);
        this.name = 'CombatantError';
        this.combatantId = combatantId;
        this.operation = operation;
    }
}

export class StorageError extends Error {
    constructor(message, operation) {
        super(message);
        this.name = 'StorageError';
        this.operation = operation;
    }
}

export class ValidationError extends Error {
    constructor(message, field, value) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
        this.value = value;
    }
}

export class NetworkError extends Error {
    constructor(message, url) {
        super(message);
        this.name = 'NetworkError';
        this.url = url;
    }
}

/**
 * Main error handler class
 */
export class ErrorHandler {
    /**
     * Error handling strategies
     */
    static strategies = {
        NOTIFY_USER: 'notify_user',
        SILENT: 'silent',
        RETRY: 'retry',
        RELOAD: 'reload'
    };

    /**
     * Handle an error with appropriate strategy
     * @param {Error} error - The error to handle
     * @param {string} context - Context where error occurred
     * @param {string} strategy - Error handling strategy
     * @returns {void}
     */
    static handle(error, context = 'Unknown', strategy = this.strategies.NOTIFY_USER) {
        // Log the error
        Logger.error(`Error in ${context}:`, error);

        // Apply handling strategy
        switch (strategy) {
            case this.strategies.NOTIFY_USER:
                this.notifyUser(error, context);
                break;

            case this.strategies.SILENT:
                // Just log, no user notification
                break;

            case this.strategies.RETRY:
                this.suggestRetry(error, context);
                break;

            case this.strategies.RELOAD:
                this.suggestReload(error, context);
                break;

            default:
                this.notifyUser(error, context);
        }

        // Optional: Send to error tracking service (e.g., Sentry)
        // this.reportToService(error, context);
    }

    /**
     * Notify user of error with appropriate message
     * @param {Error} error - The error
     * @param {string} context - Context
     * @private
     */
    static notifyUser(error, context) {
        let message = 'An error occurred. Please try again.';

        // Customize message based on error type
        if (error instanceof CombatantError) {
            message = `Failed to ${error.operation} combatant: ${error.message}`;
        } else if (error instanceof StorageError) {
            message = `Storage error during ${error.operation}: ${error.message}`;
        } else if (error instanceof ValidationError) {
            message = `Validation error: ${error.message}`;
        } else if (error instanceof NetworkError) {
            message = `Network error: Unable to load data`;
        } else if (error.message) {
            message = error.message;
        }

        ToastSystem.show(message, 'error', 5000);
    }

    /**
     * Suggest retry to user
     * @param {Error} error - The error
     * @param {string} context - Context
     * @private
     */
    static suggestRetry(error, context) {
        const message = `Operation failed in ${context}. Please try again.`;
        ToastSystem.show(message, 'warning', 5000);
    }

    /**
     * Suggest page reload to user
     * @param {Error} error - The error
     * @param {string} context - Context
     * @private
     */
    static suggestReload(error, context) {
        const message = `Critical error in ${context}. Consider reloading the page.`;
        ToastSystem.show(message, 'error', 7000);
    }

    /**
     * Handle async operation with error handling
     * @param {Function} operation - Async operation to execute
     * @param {string} context - Context for error messages
     * @param {string} strategy - Error handling strategy
     * @returns {Promise<any>} Result of operation or null on error
     */
    static async handleAsync(operation, context, strategy = this.strategies.NOTIFY_USER) {
        try {
            return await operation();
        } catch (error) {
            this.handle(error, context, strategy);
            return null;
        }
    }

    /**
     * Handle sync operation with error handling
     * @param {Function} operation - Sync operation to execute
     * @param {string} context - Context for error messages
     * @param {string} strategy - Error handling strategy
     * @returns {any} Result of operation or null on error
     */
    static handleSync(operation, context, strategy = this.strategies.NOTIFY_USER) {
        try {
            return operation();
        } catch (error) {
            this.handle(error, context, strategy);
            return null;
        }
    }

    /**
     * Wrap a function with error handling
     * @param {Function} fn - Function to wrap
     * @param {string} context - Context for error messages
     * @param {string} strategy - Error handling strategy
     * @returns {Function} Wrapped function
     */
    static wrap(fn, context, strategy = this.strategies.NOTIFY_USER) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.handle(error, context, strategy);
                throw error; // Re-throw for caller to handle if needed
            }
        };
    }

    /**
     * Report error to external service (placeholder)
     * @param {Error} error - The error
     * @param {string} context - Context
     * @private
     */
    static reportToService(error, context) {
        // Placeholder for integration with error tracking services
        // Example: Sentry.captureException(error, { tags: { context } });

        if (import.meta.env.DEV) {
            Logger.debug('Would report to error service:', { error, context });
        }
    }

    /**
     * Assert condition and throw error if false
     * @param {boolean} condition - Condition to check
     * @param {string} message - Error message if false
     * @param {Error} ErrorType - Type of error to throw
     * @throws {Error} If condition is false
     */
    static assert(condition, message, ErrorType = Error) {
        if (!condition) {
            throw new ErrorType(message);
        }
    }

    /**
     * Create a safe version of a function that won't crash the app
     * @param {Function} fn - Function to make safe
     * @param {string} context - Context for error messages
     * @param {any} fallbackValue - Value to return on error
     * @returns {Function} Safe version of function
     */
    static makeSafe(fn, context, fallbackValue = null) {
        return (...args) => {
            try {
                return fn(...args);
            } catch (error) {
                this.handle(error, context, this.strategies.SILENT);
                return fallbackValue;
            }
        };
    }
}

// Export error types and handler as default
export default ErrorHandler;
