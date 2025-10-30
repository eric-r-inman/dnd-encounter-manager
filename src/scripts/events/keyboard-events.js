/**
 * KeyboardEvents - Keyboard shortcuts and utility event handling
 *
 * Handles keyboard shortcuts and utility functions including:
 * - Global keyboard shortcuts (next turn, reset, escape)
 * - Input field shortcuts and validation
 * - Modal keyboard navigation
 * - Utility functions for input handling
 *
 * @version 1.0.0
 */

import { ModalSystem } from '../../components/modals/ModalSystem.js';
import { ToastSystem } from '../../components/toast/ToastSystem.js';
import { CombatEvents } from './combat-events.js';

export class KeyboardEvents {
    /**
     * Initialize keyboard event handlers
     */
    static init() {
        this.setupKeyboardShortcuts();
        console.log('⌨️ Keyboard events initialized');
    }

    /**
     * Set up global keyboard shortcuts
     */
    static setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Don't trigger shortcuts when typing in inputs
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }

            switch (event.key.toLowerCase()) {
                case 'n':
                    event.preventDefault();
                    CombatEvents.handleNextTurn();
                    break;
                case 'r':
                    event.preventDefault();
                    CombatEvents.handleResetCombat();
                    break;
                case 'a':
                    event.preventDefault();
                    this.handleAddCombatant();
                    break;
                case 'escape':
                    // Check if creature database modal is open
                    const activeModal = ModalSystem.getActiveModal();
                    if (activeModal === 'creature-database') {
                        this.handleCreatureDatabaseClose();
                    }
                    ModalSystem.hideAll();
                    break;
            }
        });
    }

    /**
     * Handle add combatant keyboard shortcut
     */
    static handleAddCombatant() {
        // TODO: Implement add combatant functionality
        ToastSystem.show('Add combatant functionality - TODO', 'info');
    }

    /**
     * Handle creature database close
     */
    static handleCreatureDatabaseClose() {
        // TODO: Implement creature database close functionality
        console.log('Creature database close - TODO');
    }

    /**
     * Set up input field keydown handlers for numeric validation
     * @param {HTMLInputElement} input - The input element
     * @param {Object} options - Validation options
     */
    static setupNumericInput(input, options = {}) {
        const {
            allowNegative = false,
            allowDecimal = false,
            maxLength = null,
            onEnter = null
        } = options;

        input.addEventListener('keydown', (event) => {
            // Allow special keys
            if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                if (event.key === 'Enter' && onEnter) {
                    event.preventDefault();
                    onEnter();
                }
                return;
            }

            // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
            if (event.ctrlKey && ['a', 'c', 'v', 'x'].includes(event.key.toLowerCase())) {
                return;
            }

            // Check for numeric characters
            if (!/[0-9]/.test(event.key)) {
                // Allow negative sign at the beginning
                if (event.key === '-' && allowNegative && input.value.length === 0) {
                    return;
                }
                // Allow decimal point
                if (event.key === '.' && allowDecimal && !input.value.includes('.')) {
                    return;
                }
                event.preventDefault();
                return;
            }

            // Check max length
            if (maxLength && input.value.length >= maxLength) {
                event.preventDefault();
                return;
            }
        });
    }

    /**
     * Set up text input with character limit
     * @param {HTMLInputElement} input - The input element
     * @param {number} maxLength - Maximum character length
     * @param {HTMLElement} counter - Character counter element (optional)
     */
    static setupTextInput(input, maxLength, counter = null) {
        input.addEventListener('input', () => {
            if (input.value.length > maxLength) {
                input.value = input.value.substring(0, maxLength);
            }
            if (counter) {
                counter.textContent = input.value.length;
            }
        });

        input.addEventListener('keydown', (event) => {
            // Allow special keys even when at max length
            if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                return;
            }

            // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
            if (event.ctrlKey && ['a', 'c', 'v', 'x'].includes(event.key.toLowerCase())) {
                return;
            }

            // Prevent input if at max length
            if (input.value.length >= maxLength) {
                event.preventDefault();
            }
        });
    }

    /**
     * Handle infinity toggle for duration inputs
     * @param {HTMLElement} target - The toggle button
     */
    static handleInfinityToggle(target) {
        const input = target.previousElementSibling;
        if (!input || input.tagName !== 'INPUT') return;

        const isInfinite = target.classList.contains('active');

        if (isInfinite) {
            // Switch to finite
            target.classList.remove('active');
            target.textContent = '∞';
            input.disabled = false;
            input.value = '1';
            input.focus();
        } else {
            // Switch to infinite
            target.classList.add('active');
            target.textContent = '∞';
            input.disabled = true;
            input.value = 'infinite';
        }
    }

    /**
     * Validate form inputs before submission
     * @param {HTMLFormElement} form - The form to validate
     * @returns {boolean} True if valid, false otherwise
     */
    static validateForm(form) {
        const requiredInputs = form.querySelectorAll('[required]');
        let isValid = true;

        requiredInputs.forEach(input => {
            if (!input.value.trim()) {
                input.classList.add('error');
                isValid = false;
            } else {
                input.classList.remove('error');
            }
        });

        // Validate numeric inputs
        const numericInputs = form.querySelectorAll('input[type="number"]');
        numericInputs.forEach(input => {
            const value = parseFloat(input.value);
            const min = parseFloat(input.min);
            const max = parseFloat(input.max);

            if (input.value && (isNaN(value) || (min !== undefined && value < min) || (max !== undefined && value > max))) {
                input.classList.add('error');
                isValid = false;
            } else {
                input.classList.remove('error');
            }
        });

        return isValid;
    }

    /**
     * Focus first input in a modal
     * @param {HTMLElement} modal - The modal element
     */
    static focusFirstInput(modal) {
        const firstInput = modal.querySelector('input, textarea, select');
        if (firstInput) {
            // Small delay to ensure modal is fully visible
            setTimeout(() => {
                firstInput.focus();
            }, 100);
        }
    }

    /**
     * Set up modal keyboard navigation
     * @param {HTMLElement} modal - The modal element
     */
    static setupModalKeyboardNavigation(modal) {
        modal.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                ModalSystem.hideAll();
                return;
            }

            // Tab navigation within modal
            if (event.key === 'Tab') {
                const focusableElements = modal.querySelectorAll(
                    'input, textarea, select, button, [tabindex]:not([tabindex="-1"])'
                );
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (event.shiftKey) {
                    // Shift+Tab
                    if (document.activeElement === firstElement) {
                        event.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    // Tab
                    if (document.activeElement === lastElement) {
                        event.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        });
    }
}