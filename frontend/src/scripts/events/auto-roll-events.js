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
import { ModalEvents } from './modal-events.js';

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

            // Set roll type if exists (default to 'normal' for backward compatibility)
            const rollType = combatant.autoRoll.rollType || 'normal';
            const rollTypeRadio = modal.querySelector(`input[name="rollType"][value="${rollType}"]`);
            if (rollTypeRadio) {
                rollTypeRadio.checked = true;
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

            // Reset to normal roll type
            const normalRadio = modal.querySelector('input[name="rollType"][value="normal"]');
            if (normalRadio) {
                normalRadio.checked = true;
            }
        }

        // Set up formula input listener to enable/disable advantage/disadvantage
        this.setupFormulaListener(modal);

        // Update batch buttons visibility based on selected combatants
        this.updateBatchButtons(modal);
    }

    /**
     * Update batch buttons in the auto-roll modal
     * @param {HTMLElement} modal - The modal element
     */
    static updateBatchButtons(modal) {
        // Use shared updateBatchButtons logic
        ModalEvents.updateBatchButtons('auto-roll', modal);
    }

    /**
     * Set up formula input listener to enable/disable advantage/disadvantage
     * @param {HTMLElement} modal - The modal element
     */
    static setupFormulaListener(modal) {
        const formulaInput = modal.querySelector('#auto-roll-formula');
        const advantageRadio = modal.querySelector('#auto-roll-advantage');
        const disadvantageRadio = modal.querySelector('#auto-roll-disadvantage');
        const normalRadio = modal.querySelector('#auto-roll-normal');

        if (!formulaInput || !advantageRadio || !disadvantageRadio || !normalRadio) {
            return;
        }

        const updateAdvantageState = () => {
            const formula = formulaInput.value.trim();
            // Check if formula is 1d20 (with optional modifier)
            const is1d20 = /^1d20([+-]\d+)?$/i.test(formula);

            advantageRadio.disabled = !is1d20;
            disadvantageRadio.disabled = !is1d20;

            // If not 1d20 and advantage/disadvantage is selected, switch to normal
            if (!is1d20 && (advantageRadio.checked || disadvantageRadio.checked)) {
                normalRadio.checked = true;
            }

            // Update visual styling for disabled state
            advantageRadio.parentElement.style.opacity = is1d20 ? '1' : '0.5';
            disadvantageRadio.parentElement.style.opacity = is1d20 ? '1' : '0.5';
        };

        // Update on input
        formulaInput.addEventListener('input', updateAdvantageState);

        // Initial update
        updateAdvantageState();
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
        const rollType = formData.get('rollType') || 'normal';

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
            rollType: rollType,
            lastResult: null
        };

        // Update the combatant card to show the auto-roll
        combatant.update();

        // Close modal and show success
        const rollTypeText = rollType === 'advantage' ? ' (Advantage)' : rollType === 'disadvantage' ? ' (Disadvantage)' : '';
        ModalSystem.hideAll();
        ToastSystem.show(`Auto-roll set for ${combatant.name}: ${formula}${rollTypeText} at ${trigger} of turn`, 'success', 3000);
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

        const rollType = combatant.autoRoll.rollType || 'normal';
        let result;
        let displayText;
        let rollPrefix = '';

        if (rollType === 'advantage' || rollType === 'disadvantage') {
            // Roll twice for advantage/disadvantage
            const result1 = this.rollDice(combatant.autoRoll.formula);
            const result2 = this.rollDice(combatant.autoRoll.formula);

            if (!result1 || !result2) {
                console.error('Failed to roll dice:', combatant.autoRoll.formula);
                return;
            }

            // Select the appropriate result
            if (rollType === 'advantage') {
                result = result1.total >= result2.total ? result1 : result2;
                rollPrefix = 'A: ';
                displayText = `(rolls: ${result1.total}, ${result2.total})`;
            } else {
                result = result1.total <= result2.total ? result1 : result2;
                rollPrefix = 'D: ';
                displayText = `(rolls: ${result1.total}, ${result2.total})`;
            }
        } else {
            // Normal roll
            result = this.rollDice(combatant.autoRoll.formula);
            if (!result) {
                console.error('Failed to roll dice:', combatant.autoRoll.formula);
                return;
            }
            displayText = `(${result.rolls.join(', ')})`;
        }

        // Store the result with prefix
        combatant.autoRoll.lastResult = result.total;
        combatant.autoRoll.lastResultPrefix = rollPrefix;

        // Show toast notification
        const timingText = timing === 'start' ? 'Start of turn' : 'End of turn';
        ToastSystem.show(
            `🎲 ${combatant.name} - ${timingText}: ${rollPrefix}${combatant.autoRoll.formula} = ${result.total} ${displayText}`,
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

        // Set the result with prefix (if any) and trigger animation
        const prefix = combatant.autoRoll.lastResultPrefix || '';
        if (prefix) {
            // Create styled prefix for advantage/disadvantage
            resultElement.innerHTML = `= <span style="color: #f4d03f; font-weight: bold;">${prefix}</span>${combatant.autoRoll.lastResult}`;
        } else {
            resultElement.textContent = `= ${combatant.autoRoll.lastResult}`;
        }

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