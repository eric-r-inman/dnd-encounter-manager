/**
 * AutoRollEvents - Automatic dice rolling for combatants
 *
 * Handles automatic dice rolls that trigger at the start or end of a combatant's turn.
 * Includes dice parsing, roll execution, and result display with animations.
 *
 * @version 1.0.0
 */

import { DataServices } from '../data-services.js';
import { ToastSystem } from '../../components/toast/ToastSystem.js';
import { ModalSystem } from '../../components/modals/ModalSystem.js';

export class AutoRollEvents {
    /**
     * Handle opening the auto-roll modal
     * @param {HTMLElement} target - The clicked element
     */
    static async handleOpenAutoRollModal(target) {
        const combatantId = target.getAttribute('data-combatant-id');
        if (!combatantId) {
            console.error('No combatant ID found for auto-roll modal');
            return;
        }

        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }

        // Show the modal FIRST (loads it if not already loaded)
        await ModalSystem.show('auto-roll');

        // Now query for the modal (it should exist after show())
        const modal = document.querySelector('[data-modal="auto-roll"]');
        if (!modal) {
            console.error('Auto-roll modal not found even after show()');
            return;
        }

        // Update modal title
        const targetName = modal.querySelector('[data-target-name]');
        if (targetName) {
            targetName.textContent = combatant.name;
        }

        // Set hidden field
        const hiddenField = modal.querySelector('#auto-roll-combatant-id');
        if (hiddenField) {
            hiddenField.value = combatantId;
        }

        // If there's an existing auto-roll, populate the form
        if (combatant.autoRoll) {
            const formulaInput = modal.querySelector('#auto-roll-formula');
            if (formulaInput) {
                formulaInput.value = combatant.autoRoll.formula;
            }

            const triggerRadio = modal.querySelector(`input[name="trigger"][value="${combatant.autoRoll.trigger}"]`);
            if (triggerRadio) {
                triggerRadio.checked = true;
            }
        } else {
            // Clear form for new auto-roll
            const formulaInput = modal.querySelector('#auto-roll-formula');
            if (formulaInput) {
                formulaInput.value = '';
            }

            const startRadio = modal.querySelector('input[name="trigger"][value="start"]');
            if (startRadio) {
                startRadio.checked = true;
            }
        }

        // Update batch buttons visibility based on selected combatants
        this.updateBatchButtons(modal);
    }

    /**
     * Update batch buttons in the auto-roll modal
     * @param {HTMLElement} modal - The modal element
     */
    static updateBatchButtons(modal) {
        // Import ModalEvents to use shared updateBatchButtons logic
        import('./modal-events.js').then(module => {
            module.ModalEvents.updateBatchButtons('auto-roll', modal);
        });
    }

    /**
     * Handle auto-roll form submission
     * @param {HTMLFormElement} form - The form being submitted
     */
    static handleAutoRollForm(form) {
        const formData = new FormData(form);
        const combatantId = formData.get('combatantId');
        const formula = formData.get('formula');
        const trigger = formData.get('trigger');

        // Validate formula
        if (!this.validateDiceFormula(formula)) {
            ToastSystem.show('Invalid dice formula. Use format like 1d20+5', 'error', 3000);
            return;
        }

        // Get the combatant
        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }

        // Set the auto-roll configuration
        combatant.autoRoll = {
            formula: formula,
            trigger: trigger,
            lastResult: null
        };

        // Update the combatant card to show the auto-roll
        combatant.update();

        // Close modal and show success
        ModalSystem.hideAll();
        ToastSystem.show(`Auto-roll set for ${combatant.name}: ${formula} at ${trigger} of turn`, 'success', 3000);
    }

    /**
     * Clear auto-roll for a combatant
     * @param {HTMLElement} target - The clear button
     */
    static handleClearAutoRoll(target) {
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');

        if (!combatantId) {
            console.error('No combatant ID found');
            return;
        }

        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }

        // Clear the auto-roll
        combatant.autoRoll = null;
        combatant.update();

        ToastSystem.show(`Auto-roll cleared for ${combatant.name}`, 'info', 2000);
    }

    /**
     * Trigger auto-rolls for a combatant at the specified timing
     * @param {Object} combatant - The combatant object
     * @param {string} timing - 'start' or 'end'
     */
    static triggerAutoRoll(combatant, timing) {
        if (!combatant.autoRoll || combatant.autoRoll.trigger !== timing) {
            return;
        }

        // Roll the dice
        const result = this.rollDice(combatant.autoRoll.formula);
        if (!result) {
            console.error('Failed to roll dice:', combatant.autoRoll.formula);
            return;
        }

        // Store the result
        combatant.autoRoll.lastResult = result.total;

        // Show toast notification
        const timingText = timing === 'start' ? 'Start of turn' : 'End of turn';
        ToastSystem.show(
            `🎲 ${combatant.name} - ${timingText}: ${combatant.autoRoll.formula} = ${result.total} (${result.rolls.join(', ')})`,
            'info',
            4000
        );

        // Update the display with animation
        this.animateRollResult(combatant);
    }

    /**
     * Animate the roll result on the combatant card
     * @param {Object} combatant - The combatant object
     */
    static animateRollResult(combatant) {
        // Find the auto-roll display element
        const displayElement = document.querySelector(`#auto-roll-${combatant.id}`);
        if (!displayElement) {
            // If element doesn't exist, update the card to create it
            combatant.update();
            return;
        }

        // Find or create the result element
        let resultElement = displayElement.querySelector('.auto-roll-result');
        if (!resultElement) {
            resultElement = document.createElement('span');
            resultElement.className = 'auto-roll-result';
            displayElement.insertBefore(resultElement, displayElement.querySelector('.auto-roll-clear'));
        }

        // Set the result and trigger animation
        resultElement.textContent = `= ${combatant.autoRoll.lastResult}`;
        resultElement.classList.remove('animated-result');
        // Force reflow
        void resultElement.offsetWidth;
        resultElement.classList.add('animated-result');
    }

    /**
     * Validate a dice formula
     * @param {string} formula - The dice formula to validate
     * @returns {boolean} True if valid
     */
    static validateDiceFormula(formula) {
        const pattern = /^\d+d\d+([+-]\d+)?$/;
        return pattern.test(formula.trim());
    }

    /**
     * Roll dice based on a formula
     * @param {string} formula - The dice formula (e.g., "2d6+3")
     * @returns {Object|null} Result object with total and individual rolls
     */
    static rollDice(formula) {
        const match = formula.match(/^(\d+)d(\d+)([+-]\d+)?$/);
        if (!match) {
            return null;
        }

        const count = parseInt(match[1]);
        const sides = parseInt(match[2]);
        const modifier = match[3] ? parseInt(match[3]) : 0;

        // Validate reasonable values
        if (count < 1 || count > 100 || sides < 1 || sides > 1000) {
            return null;
        }

        // Roll the dice
        const rolls = [];
        let sum = 0;
        for (let i = 0; i < count; i++) {
            const roll = Math.floor(Math.random() * sides) + 1;
            rolls.push(roll);
            sum += roll;
        }

        const total = sum + modifier;

        return {
            formula: formula,
            count: count,
            sides: sides,
            modifier: modifier,
            rolls: rolls,
            sum: sum,
            total: total
        };
    }
}