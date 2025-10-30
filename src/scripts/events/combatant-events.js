/**
 * CombatantEvents - Individual combatant management and interaction
 *
 * Handles combatant-specific functionality including:
 * - Batch selection toggle for multi-combatant operations
 * - Condition and effect removal (clear buttons)
 * - Combatant status toggles (concentration, stealth, surprise)
 * - Integration with tooltip system for cleanup
 *
 * @version 1.0.0
 */

import { ToastSystem } from '../../components/toast/ToastSystem.js';
import { ModalSystem } from '../../components/modals/ModalSystem.js';
import { DataServices } from '../data-services.js';
import { TooltipEvents } from './tooltip-events.js';

export class CombatantEvents {
    /**
     * Handle batch selection toggle for combatants
     * @param {HTMLElement} target - The checkbox that was clicked
     */
    static handleToggleBatchSelect(target) {
        const combatantId = target.value;
        const isChecked = target.checked;

        // Get the combatant and update its selection state
        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (combatant) {
            combatant.isSelected = isChecked;
        }

        // Update visual state
        const combatantCard = target.closest('[data-combatant-id]');
        combatantCard.classList.toggle('batch-selected', isChecked);

        // Get current selection count
        const selectedCombatants = this.getSelectedCombatants();
        const count = selectedCombatants.length;

        // Update batch buttons in any open modal
        this.updateBatchButtonsInModal(selectedCombatants);

        // Show selection count toast (only if there are selections)
        if (count > 0) {
            ToastSystem.show(`${count} combatant${count !== 1 ? 's' : ''} selected`, 'info', 1500);
        }
    }

    /**
     * Handle condition removal from combatant
     * @param {HTMLElement} target - The clear button that was clicked
     */
    static handleClearCondition(target) {
        const badge = target.closest('.combatant-condition-badge');
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');

        if (!combatantId || !badge) return;

        // Hide condition tooltip before removing the badge
        TooltipEvents.hideConditionTooltip();

        const conditionName = badge.textContent.trim().split('\n')[0];
        const combatant = DataServices.combatantManager.getCombatant(combatantId);

        if (!combatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }

        // Remove condition from array
        combatant.conditions = combatant.conditions.filter(c => c.name !== conditionName);

        // Update the combatant
        DataServices.combatantManager.updateCombatant(combatantId, 'conditions', combatant.conditions);

        ToastSystem.show(`${conditionName} removed from ${combatant.name}`, 'success', 2000);

        // Update combat header if this is the active combatant
        if (combatant.status.isActive) {
            // TODO: This will be moved to combat events module
            console.log('Update combat header - TODO');
        }
    }

    /**
     * Handle effect removal from combatant
     * @param {HTMLElement} target - The clear button that was clicked
     */
    static handleClearEffect(target) {
        const badge = target.closest('.combatant-effect-badge');
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');

        if (!combatantId || !badge) return;

        // Hide condition tooltip before removing the badge
        TooltipEvents.hideConditionTooltip();

        const effectName = badge.textContent.trim().split('\n')[0];
        const combatant = DataServices.combatantManager.getCombatant(combatantId);

        if (!combatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }

        // Remove effect from array
        combatant.effects = combatant.effects.filter(e => e.name !== effectName);

        // Update the combatant
        DataServices.combatantManager.updateCombatant(combatantId, 'effects', combatant.effects);

        ToastSystem.show(`${effectName} removed from ${combatant.name}`, 'success', 2000);

        // Update combat header if this is the active combatant
        if (combatant.status.isActive) {
            // TODO: This will be moved to combat events module
            console.log('Update combat header - TODO');
        }
    }

    /**
     * Handle concentration toggle for combatant
     * @param {HTMLElement} target - The concentration indicator that was clicked
     */
    static handleToggleConcentration(target) {
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');

        if (!combatantId) return;

        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }

        // Toggle concentration status
        const newConcentrationState = !combatant.status.concentration;
        DataServices.combatantManager.updateCombatant(combatantId, 'status.concentration', newConcentrationState);

        const message = newConcentrationState ?
            `${combatant.name} is now concentrating` :
            `${combatant.name} is no longer concentrating`;

        ToastSystem.show(message, 'info', 2000);

        // Update combat header if this is the active combatant
        if (combatant.status.isActive) {
            // TODO: This will be moved to combat events module
            console.log('Update combat header - TODO');
        }
    }

    /**
     * Handle stealth/hiding toggle for combatant
     * @param {HTMLElement} target - The stealth indicator that was clicked
     */
    static handleToggleStealth(target) {
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');

        if (!combatantId) return;

        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }

        // Toggle hiding status
        const newHidingState = !combatant.status.hiding;
        DataServices.combatantManager.updateCombatant(combatantId, 'status.hiding', newHidingState);

        const message = newHidingState ?
            `${combatant.name} is now hiding` :
            `${combatant.name} is no longer hiding`;

        ToastSystem.show(message, 'info', 2000);

        // Update combat header if this is the active combatant
        if (combatant.status.isActive) {
            // TODO: This will be moved to combat events module
            console.log('Update combat header - TODO');
        }
    }

    /**
     * Handle surprise status toggle for combatant
     * @param {HTMLElement} target - The surprise indicator that was clicked
     */
    static handleToggleSurprise(target) {
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');

        if (!combatantId) return;

        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }

        // Toggle surprised status
        const newSurprisedState = !combatant.status.surprised;
        DataServices.combatantManager.updateCombatant(combatantId, 'status.surprised', newSurprisedState);

        const message = newSurprisedState ?
            `${combatant.name} is surprised` :
            `${combatant.name} is no longer surprised`;

        ToastSystem.show(message, 'info', 2000);

        // Update combat header if this is the active combatant
        if (combatant.status.isActive) {
            // TODO: This will be moved to combat events module
            console.log('Update combat header - TODO');
        }
    }

    /**
     * Update batch buttons in the currently active modal
     * @param {Array} selectedCombatants - Array of selected combatant objects
     */
    static updateBatchButtonsInModal(selectedCombatants) {
        const activeModal = ModalSystem.getActiveModal();
        if (!activeModal) return;

        const modal = document.querySelector(`[data-modal="${activeModal}"]`);
        if (!modal) return;

        let batchBtn = null;
        let batchCount = null;

        // Find the appropriate batch button based on modal type
        switch (activeModal) {
            case 'hp-modification':
                batchBtn = modal.querySelector('#hp-batch-apply-btn');
                batchCount = modal.querySelector('#batch-count');
                break;
            case 'condition':
                batchBtn = modal.querySelector('#condition-batch-apply-btn');
                batchCount = modal.querySelector('#condition-batch-count');
                break;
            case 'effect':
                batchBtn = modal.querySelector('#effect-batch-apply-btn');
                batchCount = modal.querySelector('#effect-batch-count');
                break;
            case 'combatant-note':
                batchBtn = modal.querySelector('#note-batch-apply-btn');
                batchCount = modal.querySelector('#note-batch-count');
                break;
        }

        // Update batch button visibility and count
        if (batchBtn && batchCount) {
            if (selectedCombatants.length > 0) {
                // Show batch apply button
                batchBtn.style.display = 'block';
                batchCount.textContent = selectedCombatants.length;
            } else {
                // Hide batch apply button
                batchBtn.style.display = 'none';
            }
        }
    }

    /**
     * Get all currently selected combatants
     * @returns {Array} Array of selected combatant objects
     */
    static getSelectedCombatants() {
        const selectedIds = [];

        // Find all checked checkboxes
        const checkboxes = document.querySelectorAll('input[name="batch-select"]:checked');
        checkboxes.forEach(checkbox => {
            selectedIds.push(checkbox.value);
        });

        // Get the actual combatant objects
        const selectedCombatants = [];
        selectedIds.forEach(id => {
            const combatant = DataServices.combatantManager.getCombatant(id);
            if (combatant) {
                selectedCombatants.push(combatant);
            }
        });

        return selectedCombatants;
    }
}