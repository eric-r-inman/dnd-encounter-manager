/**
 * ValidationService - Centralized validation for forms and data
 *
 * Provides comprehensive validation including:
 * - Form input validation and sanitization
 * - Data integrity checks
 * - Business rule validation
 * - Custom validation rules
 * - Error message formatting
 * - Real-time validation support
 *
 * @version 1.0.0
 */

export class ValidationService {
    /**
     * Validate combatant data
     * @param {Object} data - Combatant data to validate
     * @returns {Object} Validation result with isValid and errors
     */
    static validateCombatant(data) {
        const errors = [];

        // Required fields
        if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
            errors.push('Name is required and must be non-empty');
        } else if (data.name.trim().length > 50) {
            errors.push('Name must be 50 characters or less');
        }

        // Type validation
        if (!data.type || !['player', 'enemy', 'npc'].includes(data.type)) {
            errors.push('Type must be player, enemy, or npc');
        }

        // Initiative validation
        if (typeof data.initiative !== 'number') {
            errors.push('Initiative must be a number');
        } else if (data.initiative < -10 || data.initiative > 50) {
            errors.push('Initiative must be between -10 and 50');
        }

        // AC validation
        if (typeof data.ac !== 'number') {
            errors.push('AC must be a number');
        } else if (data.ac < 0 || data.ac > 50) {
            errors.push('AC must be between 0 and 50');
        }

        // HP validation
        if (typeof data.maxHP !== 'number') {
            errors.push('Max HP must be a number');
        } else if (data.maxHP < 1 || data.maxHP > 1000) {
            errors.push('Max HP must be between 1 and 1000');
        }

        if (typeof data.currentHP !== 'number') {
            errors.push('Current HP must be a number');
        } else if (data.currentHP < 0) {
            errors.push('Current HP cannot be negative');
        } else if (data.currentHP > data.maxHP) {
            errors.push('Current HP cannot exceed max HP');
        }

        if (typeof data.tempHP !== 'number') {
            errors.push('Temporary HP must be a number');
        } else if (data.tempHP < 0 || data.tempHP > 500) {
            errors.push('Temporary HP must be between 0 and 500');
        }

        // Notes validation
        if (data.notes && data.notes.length > 200) {
            errors.push('Notes must be 200 characters or less');
        }

        if (data.nameNote && data.nameNote.length > 50) {
            errors.push('Name note must be 50 characters or less');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate condition data
     * @param {Object} condition - Condition to validate
     * @returns {Object} Validation result
     */
    static validateCondition(condition) {
        const errors = [];

        if (!condition.name || typeof condition.name !== 'string' || !condition.name.trim()) {
            errors.push('Condition name is required');
        } else if (condition.name.trim().length > 30) {
            errors.push('Condition name must be 30 characters or less');
        }

        if (condition.duration !== 'infinite') {
            if (typeof condition.duration !== 'number') {
                errors.push('Duration must be a number or "infinite"');
            } else if (condition.duration < 1 || condition.duration > 100) {
                errors.push('Duration must be between 1 and 100 turns');
            }
        }

        if (condition.note && condition.note.length > 100) {
            errors.push('Condition note must be 100 characters or less');
        }

        if (condition.decrementOn && !['turnStart', 'turnEnd'].includes(condition.decrementOn)) {
            errors.push('Decrement timing must be turnStart or turnEnd');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate effect data
     * @param {Object} effect - Effect to validate
     * @returns {Object} Validation result
     */
    static validateEffect(effect) {
        const errors = [];

        if (!effect.name || typeof effect.name !== 'string' || !effect.name.trim()) {
            errors.push('Effect name is required');
        } else if (effect.name.trim().length > 30) {
            errors.push('Effect name must be 30 characters or less');
        }

        if (effect.duration !== 'infinite') {
            if (typeof effect.duration !== 'number') {
                errors.push('Duration must be a number or "infinite"');
            } else if (effect.duration < 1 || effect.duration > 100) {
                errors.push('Duration must be between 1 and 100 turns');
            }
        }

        if (effect.note && effect.note.length > 100) {
            errors.push('Effect note must be 100 characters or less');
        }

        if (effect.decrementOn && !['turnStart', 'turnEnd'].includes(effect.decrementOn)) {
            errors.push('Decrement timing must be turnStart or turnEnd');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate HP modification data
     * @param {Object} data - HP modification data
     * @returns {Object} Validation result
     */
    static validateHPModification(data) {
        const errors = [];

        if (!data.amount || typeof data.amount !== 'number') {
            errors.push('Amount must be a number');
        } else if (data.amount <= 0) {
            errors.push('Amount must be positive');
        } else if (data.amount > 500) {
            errors.push('Amount cannot exceed 500');
        }

        if (data.type && !['damage', 'healing', 'temp-hp'].includes(data.type)) {
            errors.push('Type must be damage, healing, or temp-hp');
        }

        if (data.damageType && typeof data.damageType !== 'string') {
            errors.push('Damage type must be a string');
        }

        if (data.note && data.note.length > 50) {
            errors.push('Note must be 50 characters or less');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate form input in real-time
     * @param {HTMLInputElement} input - Input element to validate
     * @param {Object} rules - Validation rules
     * @returns {Object} Validation result
     */
    static validateInput(input, rules = {}) {
        const errors = [];
        const value = input.value.trim();

        // Required validation
        if (rules.required && !value) {
            errors.push(`${this.getFieldLabel(input)} is required`);
        }

        // Type-specific validations
        if (value) {
            switch (input.type) {
                case 'number':
                    const num = parseFloat(value);
                    if (isNaN(num)) {
                        errors.push(`${this.getFieldLabel(input)} must be a number`);
                    } else {
                        if (rules.min !== undefined && num < rules.min) {
                            errors.push(`${this.getFieldLabel(input)} must be at least ${rules.min}`);
                        }
                        if (rules.max !== undefined && num > rules.max) {
                            errors.push(`${this.getFieldLabel(input)} cannot exceed ${rules.max}`);
                        }
                    }
                    break;

                case 'text':
                case 'textarea':
                    if (rules.minLength && value.length < rules.minLength) {
                        errors.push(`${this.getFieldLabel(input)} must be at least ${rules.minLength} characters`);
                    }
                    if (rules.maxLength && value.length > rules.maxLength) {
                        errors.push(`${this.getFieldLabel(input)} must be ${rules.maxLength} characters or less`);
                    }
                    if (rules.pattern && !rules.pattern.test(value)) {
                        errors.push(`${this.getFieldLabel(input)} format is invalid`);
                    }
                    break;

                case 'email':
                    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailPattern.test(value)) {
                        errors.push('Please enter a valid email address');
                    }
                    break;
            }
        }

        // Custom validation function
        if (rules.custom && typeof rules.custom === 'function') {
            const customResult = rules.custom(value, input);
            if (customResult && customResult.length > 0) {
                errors.push(...customResult);
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate entire form
     * @param {HTMLFormElement} form - Form to validate
     * @param {Object} rules - Validation rules for each field
     * @returns {Object} Validation result
     */
    static validateForm(form, rules = {}) {
        const errors = {};
        let isValid = true;

        // Get all form inputs
        const inputs = form.querySelectorAll('input, textarea, select');

        inputs.forEach(input => {
            const fieldRules = rules[input.name] || {};
            const result = this.validateInput(input, fieldRules);

            if (!result.isValid) {
                errors[input.name] = result.errors;
                isValid = false;
            }
        });

        return {
            isValid,
            errors,
            fieldCount: inputs.length,
            errorCount: Object.keys(errors).length
        };
    }

    /**
     * Sanitize input data
     * @param {*} value - Value to sanitize
     * @param {string} type - Type of sanitization
     * @returns {*} Sanitized value
     */
    static sanitize(value, type = 'string') {
        if (value === null || value === undefined) {
            return type === 'string' ? '' : null;
        }

        switch (type) {
            case 'string':
                return String(value).trim();

            case 'number':
                const num = parseFloat(value);
                return isNaN(num) ? 0 : num;

            case 'integer':
                const int = parseInt(value);
                return isNaN(int) ? 0 : int;

            case 'boolean':
                return Boolean(value);

            case 'html':
                // Basic HTML sanitization (remove script tags, etc.)
                return String(value)
                    .replace(/<script[^>]*>.*?<\/script>/gi, '')
                    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
                    .trim();

            case 'alphanumeric':
                return String(value).replace(/[^a-zA-Z0-9]/g, '');

            case 'filename':
                return String(value).replace(/[^a-zA-Z0-9._-]/g, '');

            default:
                return value;
        }
    }

    /**
     * Get field label for error messages
     * @param {HTMLElement} input - Input element
     * @returns {string} Field label
     * @private
     */
    static getFieldLabel(input) {
        const label = input.labels && input.labels[0];
        if (label) {
            return label.textContent.trim().replace(':', '');
        }

        const placeholder = input.placeholder;
        if (placeholder) {
            return placeholder;
        }

        const name = input.name;
        if (name) {
            // Convert camelCase to readable format
            return name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        }

        return 'Field';
    }

    /**
     * Format validation errors for display
     * @param {Array|Object} errors - Errors to format
     * @returns {string} Formatted error message
     */
    static formatErrors(errors) {
        if (Array.isArray(errors)) {
            return errors.join('; ');
        }

        if (typeof errors === 'object') {
            const messages = [];
            for (const [field, fieldErrors] of Object.entries(errors)) {
                if (Array.isArray(fieldErrors)) {
                    messages.push(`${field}: ${fieldErrors.join(', ')}`);
                } else {
                    messages.push(`${field}: ${fieldErrors}`);
                }
            }
            return messages.join('; ');
        }

        return String(errors);
    }

    /**
     * Show validation errors on form
     * @param {HTMLFormElement} form - Form element
     * @param {Object} errors - Validation errors
     */
    static showFormErrors(form, errors) {
        // Clear existing errors
        this.clearFormErrors(form);

        // Show new errors
        for (const [fieldName, fieldErrors] of Object.entries(errors)) {
            const input = form.querySelector(`[name="${fieldName}"]`);
            if (input) {
                input.classList.add('error');

                // Create error message element
                const errorElement = document.createElement('div');
                errorElement.className = 'field-error';
                errorElement.textContent = Array.isArray(fieldErrors) ? fieldErrors.join(', ') : fieldErrors;

                // Insert after input
                input.parentNode.insertBefore(errorElement, input.nextSibling);
            }
        }
    }

    /**
     * Clear validation errors from form
     * @param {HTMLFormElement} form - Form element
     */
    static clearFormErrors(form) {
        // Remove error classes
        form.querySelectorAll('.error').forEach(element => {
            element.classList.remove('error');
        });

        // Remove error message elements
        form.querySelectorAll('.field-error').forEach(element => {
            element.remove();
        });
    }

    /**
     * Common validation patterns
     */
    static patterns = {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        url: /^https?:\/\/.+/,
        alphanumeric: /^[a-zA-Z0-9]+$/,
        numeric: /^\d+$/,
        alpha: /^[a-zA-Z]+$/,
        noSpecialChars: /^[a-zA-Z0-9\s]+$/
    };

    /**
     * Common validation rules presets
     */
    static rules = {
        combatantName: {
            required: true,
            minLength: 1,
            maxLength: 50,
            pattern: ValidationService.patterns.noSpecialChars
        },
        initiative: {
            required: true,
            min: -10,
            max: 50
        },
        hp: {
            required: true,
            min: 0,
            max: 1000
        },
        ac: {
            required: true,
            min: 0,
            max: 50
        },
        conditionName: {
            required: true,
            minLength: 1,
            maxLength: 30
        },
        duration: {
            min: 1,
            max: 100
        },
        note: {
            maxLength: 100
        }
    };
}