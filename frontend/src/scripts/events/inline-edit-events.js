/**
 * InlineEditEvents - Inline editing functionality
 *
 * Handles inline editing for various combatant properties:
 * - Initiative values
 * - Armor Class values
 * - Other editable fields
 *
 * @version 1.0.0
 */

import { ToastSystem } from '../../components/toast/ToastSystem.js';
import { DataServices } from '../data-services.js';
import { CombatEvents } from './combat-events.js';
import { InitiativeEvents } from './initiative-events.js';
import { ModalSystem } from '../../components/modals/ModalSystem.js';
import { TIMING } from '../constants.js';

export class InlineEditEvents {
    /**
     * Handle initiative click - opens initiative modal
     * @param {HTMLElement} target - The initiative element that was clicked
     */
    static async handleInitiativeEdit(target) {
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');

        if (!combatantId) return;

        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }

        // Show the modal FIRST (loads it if not already loaded)
        await ModalSystem.show('quick-initiative');

        // Now query for the modal (it should exist after show())
        const modal = document.querySelector('[data-modal="quick-initiative"]');
        if (!modal) {
            console.error('Quick initiative modal not found even after show()');
            return;
        }

        const hiddenField = modal.querySelector('#quick-init-combatant-id');
        if (hiddenField) {
            hiddenField.value = combatantId;
        }

        // Update the "Roll Initiative & Sort" button text to include creature name
        const singleBtn = modal.querySelector('#roll-init-single-btn');
        if (singleBtn && combatant.name) {
            singleBtn.textContent = `🎲 Roll Initiative & Sort: ${combatant.name}`;
        }

        // Update selected count displays
        this.updateSelectedCounts(modal);
    }

    /**
     * Update selected count displays in initiative modal
     * @param {HTMLElement} modal - The initiative modal element
     */
    static updateSelectedCounts(modal) {
        const allCombatants = DataServices.combatantManager.getAllCombatants();
        const selectedCombatants = allCombatants.filter(c => c.isSelected);
        const count = selectedCombatants.length;

        const countSpans = modal.querySelectorAll('#init-selected-count, #init-custom-selected-count');
        countSpans.forEach(span => span.textContent = count);

        // Disable selected buttons if no creatures are selected
        const selectedButtons = modal.querySelectorAll('[data-action="roll-init-selected"], [data-action="apply-custom-init-selected"]');
        selectedButtons.forEach(btn => {
            btn.disabled = count === 0;
            if (count === 0) {
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            } else {
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        });
    }

    /**
     * Handle AC inline editing
     * @param {HTMLElement} target - The AC element that was clicked
     */
    static handleACEdit(target) {
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');

        if (!combatantId) return;

        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }

        // Find the AC value element - it might be the target itself or inside the target
        let acValue = target.classList.contains('ac-value') ? target : target.querySelector('.ac-value');
        if (!acValue || acValue.querySelector('input')) return; // Already editing

        this.createInlineInput(acValue, combatant.ac, {
            type: 'ac',
            combatantId: combatantId,
            combatant: combatant,
            min: 1,
            max: 30,
            width: '35px',
            height: '18px'
        });
    }

    /**
     * Create an inline input for editing
     * @param {HTMLElement} valueElement - The element to replace with input
     * @param {number} currentValue - Current value to edit
     * @param {Object} options - Configuration options
     */
    static createInlineInput(valueElement, currentValue, options) {
        const { type, combatantId, combatant, min, max, width, height } = options;

        // Create input element
        const input = document.createElement('input');
        input.type = 'number';
        input.value = currentValue;
        input.min = min.toString();
        input.max = max.toString();
        input.style.width = type === 'initiative' ? '50px' : '45px';
        input.style.height = height;
        input.style.border = 'none';
        input.style.background = 'rgba(255, 255, 255, 0.9)';
        input.style.borderRadius = '3px';
        input.style.textAlign = 'center';
        input.style.fontSize = type === 'initiative' ? '12px' : '11px';
        input.style.fontWeight = 'bold';
        input.style.color = '#000000';

        // Remove number input arrows
        input.style.MozAppearance = 'textfield';
        input.style.WebkitAppearance = 'none';
        input.style.appearance = 'none';

        // Replace the text with input
        const originalText = valueElement.textContent;
        valueElement.innerHTML = '';

        // For initiative, create a container with input and Quick button
        if (type === 'initiative') {
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.alignItems = 'center';
            container.style.gap = '2px';

            container.appendChild(input);

            // Add Quick button for initiative
            const quickButton = document.createElement('button');
            quickButton.textContent = 'Quick';
            quickButton.className = 'btn btn-secondary initiative-quick-btn';
            quickButton.type = 'button';

            // Use mousedown instead of click to fire before blur event
            quickButton.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Remove the blur listener from input to prevent save
                input.removeEventListener('blur', saveValue);

                // Close the inline editor without saving
                valueElement.textContent = originalText;

                // Open Quick Initiative modal
                const initiativeDisplay = valueElement.closest('.editable-initiative');
                if (initiativeDisplay) {
                    InitiativeEvents.openQuickInitiativeModal(initiativeDisplay);
                }
            });

            container.appendChild(quickButton);
            valueElement.appendChild(container);
        } else {
            valueElement.appendChild(input);
        }

        // Focus and select the input
        input.focus();
        input.select();

        // Handle save
        const saveValue = () => {
            const newValue = parseInt(input.value);
            if (isNaN(newValue) || newValue < min || newValue > max) {
                const fieldName = type === 'initiative' ? 'Initiative' : 'AC';
                ToastSystem.show(`${fieldName} must be between ${min} and ${max}`, 'error', TIMING.TOAST_SHORT);
                input.focus();
                return;
            }

            // Update the combatant
            DataServices.combatantManager.updateCombatant(combatantId, type, newValue);

            // Restore the display
            valueElement.textContent = newValue;

            const fieldName = type === 'initiative' ? 'initiative' : 'AC';
            ToastSystem.show(`${combatant.name}'s ${fieldName} updated to ${newValue}`, 'success', TIMING.TOAST_SHORT);

            // Re-render if initiative changed (to update order)
            if (type === 'initiative') {
                DataServices.combatantManager.renderAll();
            }
        };

        // Handle cancel
        const cancelEdit = () => {
            valueElement.textContent = originalText;
        };

        // Event listeners
        input.addEventListener('blur', saveValue);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveValue();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });
    }
}