/**
 * Logger - Centralized logging utility
 *
 * Provides consistent logging across the application with environment-aware
 * log levels. In production, only warnings and errors are logged to avoid
 * cluttering the console. In development, all log levels are available.
 *
 * @version 1.0.0
 */

export class Logger {
    /**
     * Log levels
     */
    static levels = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
    };

    /**
     * Current log level (set based on environment)
     */
    static currentLevel = import.meta.env.DEV ? this.levels.DEBUG : this.levels.WARN;

    /**
     * Format log message with timestamp and emoji
     * @param {string} level - Log level
     * @param {string} message - Message to log
     * @param {Array} args - Additional arguments
     * @returns {Array} Formatted message parts
     * @private
     */
    static formatMessage(level, message, args) {
        const timestamp = new Date().toLocaleTimeString();
        const emojis = {
            DEBUG: '🐛',
            INFO: 'ℹ️',
            WARN: '⚠️',
            ERROR: '❌'
        };

        return [`[${timestamp}] ${emojis[level]} ${level}:`, message, ...args];
    }

    /**
     * Debug logging (development only)
     * @param {string} message - Message to log
     * @param {...any} args - Additional arguments
     */
    static debug(message, ...args) {
        if (this.currentLevel <= this.levels.DEBUG) {
            console.log(...this.formatMessage('DEBUG', message, args));
        }
    }

    /**
     * Info logging
     * @param {string} message - Message to log
     * @param {...any} args - Additional arguments
     */
    static info(message, ...args) {
        if (this.currentLevel <= this.levels.INFO) {
            console.info(...this.formatMessage('INFO', message, args));
        }
    }

    /**
     * Warning logging
     * @param {string} message - Message to log
     * @param {...any} args - Additional arguments
     */
    static warn(message, ...args) {
        if (this.currentLevel <= this.levels.WARN) {
            console.warn(...this.formatMessage('WARN', message, args));
        }
    }

    /**
     * Error logging
     * @param {string} message - Message to log
     * @param {...any} args - Additional arguments
     */
    static error(message, ...args) {
        if (this.currentLevel <= this.levels.ERROR) {
            console.error(...this.formatMessage('ERROR', message, args));
        }
    }

    /**
     * Group logging (for related log entries)
     * @param {string} label - Group label
     * @param {Function} callback - Function to execute within group
     */
    static group(label, callback) {
        if (import.meta.env.DEV) {
            console.group(label);
            try {
                callback();
            } finally {
                console.groupEnd();
            }
        }
    }

    /**
     * Collapsed group logging
     * @param {string} label - Group label
     * @param {Function} callback - Function to execute within group
     */
    static groupCollapsed(label, callback) {
        if (import.meta.env.DEV) {
            console.groupCollapsed(label);
            try {
                callback();
            } finally {
                console.groupEnd();
            }
        }
    }

    /**
     * Table logging (for arrays and objects)
     * @param {Array|Object} data - Data to display as table
     * @param {Array} columns - Optional columns to display
     */
    static table(data, columns) {
        if (import.meta.env.DEV) {
            console.table(data, columns);
        }
    }

    /**
     * Performance timing
     * @param {string} label - Timer label
     */
    static time(label) {
        if (import.meta.env.DEV) {
            console.time(label);
        }
    }

    /**
     * End performance timing
     * @param {string} label - Timer label
     */
    static timeEnd(label) {
        if (import.meta.env.DEV) {
            console.timeEnd(label);
        }
    }

    /**
     * Assert condition
     * @param {boolean} condition - Condition to assert
     * @param {string} message - Message if assertion fails
     */
    static assert(condition, message) {
        if (import.meta.env.DEV) {
            console.assert(condition, message);
        }
    }

    /**
     * Set custom log level
     * @param {number} level - New log level (use Logger.levels)
     */
    static setLevel(level) {
        this.currentLevel = level;
    }
}

// Export as default for convenience
export default Logger;
