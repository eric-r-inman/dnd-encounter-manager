/**
 * Validation Utilities
 *
 * Provides comprehensive validation functions for forms, data integrity,
 * and business logic constraints.
 *
 * @module utils/validation
 * @version 1.0.0
 */

import { ValidationError } from './errors.js';
import { DEFAULTS, DND_CLASSES, ABILITY_SCORES } from '../constants.js';

/**
 * Validation result object
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {string[]} errors - Array of error messages
 * @property {Object} details - Detailed validation information
 */

/**
 * Validator class for chaining validation rules
 */
export class Validator {
    constructor(value, fieldName = 'Field') {
        this.value = value;
        this.fieldName = fieldName;
        this.errors = [];
    }

    /**
     * Check if value is required (not null, undefined, or empty string)
     * @param {string} [message] - Custom error message
     * @returns {Validator} This validator for chaining
     */
    required(message) {
        if (this.value === null || this.value === undefined || this.value === '') {
            this.errors.push(message || `${this.fieldName} is required`);
        }
        return this;
    }

    /**
     * Check if string length is within range
     * @param {number} min - Minimum length
     * @param {number} max - Maximum length
     * @param {string} [message] - Custom error message
     * @returns {Validator} This validator for chaining
     */
    length(min, max, message) {
        if (typeof this.value === 'string') {
            const len = this.value.length;
            if (len < min || len > max) {
                this.errors.push(
                    message || `${this.fieldName} must be between ${min} and ${max} characters`
                );
            }
        }
        return this;
    }

    /**
     * Check if number is within range
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @param {string} [message] - Custom error message
     * @returns {Validator} This validator for chaining
     */
    range(min, max, message) {
        const num = Number(this.value);
        if (!isNaN(num) && (num < min || num > max)) {
            this.errors.push(
                message || `${this.fieldName} must be between ${min} and ${max}`
            );
        }
        return this;
    }

    /**
     * Check if value is a valid number
     * @param {string} [message] - Custom error message
     * @returns {Validator} This validator for chaining
     */
    isNumber(message) {
        if (this.value !== null && this.value !== undefined && isNaN(Number(this.value))) {
            this.errors.push(message || `${this.fieldName} must be a number`);
        }
        return this;
    }

    /**
     * Check if value is a positive number
     * @param {string} [message] - Custom error message
     * @returns {Validator} This validator for chaining
     */
    positive(message) {
        const num = Number(this.value);
        if (!isNaN(num) && num < 0) {
            this.errors.push(message || `${this.fieldName} must be positive`);
        }
        return this;
    }

    /**
     * Check if value matches regex pattern
     * @param {RegExp} pattern - Pattern to match
     * @param {string} [message] - Custom error message
     * @returns {Validator} This validator for chaining
     */
    matches(pattern, message) {
        if (typeof this.value === 'string' && !pattern.test(this.value)) {
            this.errors.push(message || `${this.fieldName} format is invalid`);
        }
        return this;
    }

    /**
     * Check if value is one of allowed values
     * @param {Array} allowedValues - Array of allowed values
     * @param {string} [message] - Custom error message
     * @returns {Validator} This validator for chaining
     */
    oneOf(allowedValues, message) {
        if (!allowedValues.includes(this.value)) {
            this.errors.push(
                message || `${this.fieldName} must be one of: ${allowedValues.join(', ')}`
            );
        }
        return this;
    }

    /**
     * Custom validation function
     * @param {Function} fn - Validation function that returns boolean
     * @param {string} message - Error message if validation fails
     * @returns {Validator} This validator for chaining
     */
    custom(fn, message) {
        try {
            if (!fn(this.value)) {
                this.errors.push(message || `${this.fieldName} validation failed`);
            }
        } catch (error) {
            this.errors.push(`${this.fieldName} validation error: ${error.message}`);
        }
        return this;
    }

    /**
     * Get validation result
     * @returns {ValidationResult} Validation result
     */
    result() {
        return {
            valid: this.errors.length === 0,
            errors: this.errors,
            details: {
                field: this.fieldName,
                value: this.value
            }
        };
    }

    /**
     * Throw ValidationError if validation failed
     * @throws {ValidationError}
     */
    throw() {
        if (this.errors.length > 0) {
            throw new ValidationError(this.errors.join('; '), {
                field: this.fieldName,
                value: this.value,
                errors: this.errors
            });
        }
    }
}

/**
 * Create a new validator for a value
 * @param {*} value - Value to validate
 * @param {string} [fieldName] - Name of field for error messages
 * @returns {Validator} New validator instance
 */
export function validate(value, fieldName) {
    return new Validator(value, fieldName);
}

/**
 * D&D 5e specific validators
 */
export const DnDValidators = {
    /**
     * Validate ability score (1-30 range for D&D 5e)
     * @param {number} score - Ability score to validate
     * @param {string} abilityName - Name of ability
     * @returns {ValidationResult}
     */
    abilityScore(score, abilityName) {
        return validate(score, abilityName)
            .required()
            .isNumber()
            .range(1, 30)
            .result();
    },

    /**
     * Validate character level (1-20)
     * @param {number} level - Character level
     * @returns {ValidationResult}
     */
    level(level) {
        return validate(level, 'Level')
            .required()
            .isNumber()
            .range(DEFAULTS.MIN_LEVEL, DEFAULTS.MAX_LEVEL)
            .result();
    },

    /**
     * Validate character class
     * @param {string} className - Character class name
     * @returns {ValidationResult}
     */
    characterClass(className) {
        return validate(className, 'Class')
            .required()
            .oneOf(DND_CLASSES)
            .result();
    },

    /**
     * Validate HP value
     * @param {number} hp - HP value
     * @param {number} maxHP - Maximum HP
     * @returns {ValidationResult}
     */
    hitPoints(hp, maxHP) {
        const validator = validate(hp, 'HP')
            .required()
            .isNumber()
            .positive();

        if (maxHP !== undefined) {
            validator.custom(
                (val) => val <= maxHP,
                'HP cannot exceed maximum HP'
            );
        }

        return validator.result();
    },

    /**
     * Validate armor class (typically 1-30)
     * @param {number} ac - Armor class
     * @returns {ValidationResult}
     */
    armorClass(ac) {
        return validate(ac, 'AC')
            .required()
            .isNumber()
            .range(1, 30)
            .result();
    },

    /**
     * Validate initiative bonus (-10 to +10 is reasonable)
     * @param {number} initiative - Initiative bonus
     * @returns {ValidationResult}
     */
    initiative(initiative) {
        return validate(initiative, 'Initiative')
            .required()
            .isNumber()
            .range(-10, 30)
            .result();
    },

    /**
     * Validate creature name
     * @param {string} name - Creature name
     * @returns {ValidationResult}
     */
    creatureName(name) {
        return validate(name, 'Name')
            .required()
            .length(1, 100)
            .result();
    }
};

/**
 * Validate an entire form data object
 * @param {Object} formData - Form data to validate
 * @param {Object} schema - Validation schema
 * @returns {ValidationResult} Combined validation result
 *
 * @example
 * const schema = {
 *   name: (val) => validate(val, 'Name').required().length(1, 50),
 *   level: (val) => validate(val, 'Level').required().isNumber().range(1, 20)
 * };
 * const result = validateForm(formData, schema);
 */
export function validateForm(formData, schema) {
    const errors = [];
    const fieldResults = {};

    for (const [field, validatorFn] of Object.entries(schema)) {
        const value = formData[field];
        const result = validatorFn(value).result();

        fieldResults[field] = result;

        if (!result.valid) {
            errors.push(...result.errors);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        details: fieldResults
    };
}

/**
 * Sanitize input to prevent XSS and injection attacks
 */
export const Sanitizer = {
    /**
     * Escape HTML special characters
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    escapeHtml(str) {
        if (typeof str !== 'string') return str;

        const htmlEscapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        };

        return str.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char]);
    },

    /**
     * Strip HTML tags from string
     * @param {string} str - String to strip
     * @returns {string} String without HTML tags
     */
    stripHtml(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/<[^>]*>/g, '');
    },

    /**
     * Sanitize for use in storage keys
     * @param {string} str - String to sanitize
     * @returns {string} Sanitized string
     */
    forStorageKey(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/[^a-zA-Z0-9-_]/g, '_');
    },

    /**
     * Sanitize number input
     * @param {*} value - Value to sanitize
     * @param {number} [fallback=0] - Fallback if invalid
     * @returns {number} Sanitized number
     */
    toNumber(value, fallback = 0) {
        const num = Number(value);
        return isNaN(num) ? fallback : num;
    },

    /**
     * Sanitize boolean input
     * @param {*} value - Value to sanitize
     * @returns {boolean} Boolean value
     */
    toBoolean(value) {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
            return value.toLowerCase() === 'true' || value === '1';
        }
        return Boolean(value);
    },

    /**
     * Trim and normalize whitespace
     * @param {string} str - String to normalize
     * @returns {string} Normalized string
     */
    normalizeWhitespace(str) {
        if (typeof str !== 'string') return str;
        return str.trim().replace(/\s+/g, ' ');
    }
};

/**
 * Check if object has all required properties
 * @param {Object} obj - Object to check
 * @param {string[]} requiredProps - Array of required property names
 * @throws {ValidationError} If any required property is missing
 */
export function requireProperties(obj, requiredProps) {
    const missing = requiredProps.filter(prop => !(prop in obj));

    if (missing.length > 0) {
        throw new ValidationError(
            `Missing required properties: ${missing.join(', ')}`,
            { details: { missing } }
        );
    }
}

/**
 * Validate that ID is valid (not empty, proper format)
 * @param {string} id - ID to validate
 * @param {string} [resourceType] - Type of resource for error message
 * @throws {ValidationError}
 */
export function validateId(id, resourceType = 'Resource') {
    validate(id, `${resourceType} ID`)
        .required()
        .custom(
            (val) => typeof val === 'string' && val.length > 0,
            `${resourceType} ID must be a non-empty string`
        )
        .throw();
}
