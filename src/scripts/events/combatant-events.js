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
import { CombatEvents } from './combat-events.js';
import { StateManager } from '../state-manager.js';
import { FLYING_HEIGHT } from '../constants.js';
import { updateAndRefreshActive } from '../utils/render-helpers.js';

export class CombatantEvents {
    // Debounce timer for flying height input
    static flyingHeightDebounceTimer = null;
    static FLYING_HEIGHT_SAVE_DELAY = 500; // 500ms delay after user stops typing

    /**
     * Handle batch selection toggle for combatants
     * @param {HTMLElement} target - The checkbox that was clicked
     * @param {Event} event - The click event (to check for shift key)
     */
    static handleToggleBatchSelect(target, event) {
        const combatantId = target.value;
        const isChecked = target.checked;

        // Check if Shift key is pressed for select all / deselect all
        if (event && event.shiftKey) {
            try {
                // Get all batch select checkboxes
                const allCheckboxes = document.querySelectorAll('[data-action="toggle-batch-select"]');

                // Select all or deselect all based on the current checkbox state
                allCheckboxes.forEach(checkbox => {
                    const checkboxCombatantId = checkbox.value;
                    const combatant = DataServices.combatantManager.getCombatant(checkboxCombatantId);

                    // Set checkbox state to match the clicked checkbox
                    checkbox.checked = isChecked;

                    // Update combatant data
                    if (combatant) {
                        combatant.isSelected = isChecked;
                    }

                    // Update visual state
                    const combatantCard = checkbox.closest('[data-combatant-id]');
                    if (combatantCard) {
                        combatantCard.classList.toggle('batch-selected', isChecked);
                    }
                });

                // Get current selection count
                const selectedCombatants = this.getSelectedCombatants();
                const count = selectedCombatants.length;

                // Update batch buttons in any open modal
                this.updateBatchButtonsInModal(selectedCombatants);

                // Show appropriate toast
                if (isChecked) {
                    ToastSystem.show(`All ${count} combatants selected`, 'info', 1500);
                } else {
                    ToastSystem.show('All combatants deselected', 'info', 1500);
                }

                return;
            } catch (error) {
                console.error('❌ Error in batch select:', error);
                ToastSystem.show('Failed to select all combatants', 'error', 2000);
                return;
            }
        }

        // Normal single checkbox toggle (no shift key)
        // Get the combatant and update its selection state
        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (combatant) {
            combatant.isSelected = isChecked;
        }

        // Update visual state immediately
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
            CombatEvents.updateCombatHeader();
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
            CombatEvents.updateCombatHeader();
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
            CombatEvents.updateCombatHeader();
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
            CombatEvents.updateCombatHeader();
        }
    }

    /**
     * Handle flying toggle for combatant
     * @param {HTMLElement} target - The flying indicator that was clicked
     */
    static handleToggleFlying(target) {
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');

        if (!combatantId) return;

        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }

        // Toggle flying status
        const newFlyingState = !combatant.status.flying;
        DataServices.combatantManager.updateCombatant(combatantId, 'status.flying', newFlyingState);

        // If turning off flying, reset height to 0
        if (!newFlyingState) {
            DataServices.combatantManager.updateCombatant(combatantId, 'status.flyingHeight', 0);
        }

        const message = newFlyingState ?
            `${combatant.name} is now flying` :
            `${combatant.name} is no longer flying`;

        ToastSystem.show(message, 'info', 2000);

        // Update combat header if this is the active combatant
        if (combatant.status.isActive) {
            CombatEvents.updateCombatHeader();
        }
    }

    /**
     * Handle editing flying height for combatant
     * @param {HTMLElement} target - The height input field
     */
    static handleEditFlyingHeight(target) {
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');

        if (!combatantId) return;

        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }

        // Get the raw value from input
        const rawValue = target.value.trim();

        // If empty, set height to 0 but don't update the field itself
        if (rawValue === '') {
            combatant.status.flyingHeight = 0;

            // Clear any existing timer
            if (this.flyingHeightDebounceTimer) {
                clearTimeout(this.flyingHeightDebounceTimer);
            }

            // Debounce the save operation
            this.flyingHeightDebounceTimer = setTimeout(() => {
                DataServices.combatantManager.saveInstances();

                // Update combat header if this is the active combatant
                if (combatant.status.isActive) {
                    CombatEvents.updateCombatHeader();
                }
            }, this.FLYING_HEIGHT_SAVE_DELAY);
            return;
        }

        // Parse and validate the height value
        let height = parseInt(rawValue);

        // If not a valid number, don't update anything
        if (isNaN(height)) {
            return;
        }

        // Enforce min/max constraints
        if (height < 0) height = 0;
        if (height > 999) height = 999;

        // Only update the input value if it was clamped
        if (height !== parseInt(rawValue)) {
            target.value = height;
        }

        // Update the combatant's data directly (without triggering re-render)
        combatant.status.flyingHeight = height;

        // Clear any existing timer
        if (this.flyingHeightDebounceTimer) {
            clearTimeout(this.flyingHeightDebounceTimer);
        }

        // Debounce the save operation to avoid excessive saves while typing
        this.flyingHeightDebounceTimer = setTimeout(() => {
            DataServices.combatantManager.saveInstances();

            // Update combat header if this is the active combatant
            if (combatant.status.isActive) {
                CombatEvents.updateCombatHeader();
            }
        }, this.FLYING_HEIGHT_SAVE_DELAY);
    }

    /**
     * Handle increment flying height button
     * @param {HTMLElement} target - The increment button
     */
    static handleIncrementFlyingHeight(target) {
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');

        if (!combatantId) return;

        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }

        // Increment by defined step, max defined limit
        let newHeight = (combatant.status.flyingHeight || 0) + FLYING_HEIGHT.INCREMENT;
        if (newHeight > FLYING_HEIGHT.MAX) newHeight = FLYING_HEIGHT.MAX;

        // Update combatant and refresh if active
        updateAndRefreshActive(combatantId, 'status.flyingHeight', newHeight);
    }

    /**
     * Handle decrement flying height button
     * @param {HTMLElement} target - The decrement button
     */
    static handleDecrementFlyingHeight(target) {
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');

        if (!combatantId) return;

        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }

        // Decrement by defined step, min defined limit
        let newHeight = (combatant.status.flyingHeight || 0) - FLYING_HEIGHT.INCREMENT;
        if (newHeight < FLYING_HEIGHT.MIN) newHeight = FLYING_HEIGHT.MIN;

        // Update combatant and refresh if active
        updateAndRefreshActive(combatantId, 'status.flyingHeight', newHeight);
    }

    /**
     * Handle applying falling damage to a flying combatant
     * @param {HTMLElement} target - The falling damage button that was clicked
     */
    static handleApplyFallingDamage(target) {
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');

        if (!combatantId) return;

        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }

        // Get the flying height
        const height = combatant.status.flyingHeight || 0;

        if (height === 0) {
            ToastSystem.show('No height to fall from', 'warning', 2000);
            return;
        }

        // Show confirmation dialog
        const confirmed = confirm('Apply falling damage?');
        if (!confirmed) {
            return;
        }

        // Calculate falling damage: 1d6 per 10 feet, max 20d6
        const diceCount = Math.min(Math.floor(height / 10), 20);

        if (diceCount === 0) {
            ToastSystem.show('Height too low to cause falling damage', 'info', 2000);
            return;
        }

        // Roll the dice
        const rolls = [];
        let totalDamage = 0;
        for (let i = 0; i < diceCount; i++) {
            const roll = Math.floor(Math.random() * 6) + 1;
            rolls.push(roll);
            totalDamage += roll;
        }

        // Apply damage to the combatant
        const previousHP = combatant.currentHP;
        const previousTempHP = combatant.tempHP;

        // Damage temp HP first
        let remainingDamage = totalDamage;
        if (combatant.tempHP > 0) {
            const tempHPDamage = Math.min(combatant.tempHP, remainingDamage);
            combatant.tempHP -= tempHPDamage;
            remainingDamage -= tempHPDamage;
        }

        // Then damage regular HP
        if (remainingDamage > 0) {
            combatant.currentHP = Math.max(0, combatant.currentHP - remainingDamage);
        }

        // Add to damage history with correct round number
        const currentRound = StateManager.state.combat.round || 1;
        combatant.addDamageHistory(totalDamage, currentRound);

        // Update the combatant in the manager
        DataServices.combatantManager.updateCombatant(combatantId, 'currentHP', combatant.currentHP);
        DataServices.combatantManager.updateCombatant(combatantId, 'tempHP', combatant.tempHP);

        // Turn off flying and reset height
        DataServices.combatantManager.updateCombatant(combatantId, 'status.flying', false);
        DataServices.combatantManager.updateCombatant(combatantId, 'status.flyingHeight', 0);

        // Show detailed toast with damage breakdown
        const rollsText = rolls.join(', ');
        ToastSystem.show(
            `${combatant.name} took ${totalDamage} falling damage (${diceCount}d6: ${rollsText}) from ${height}ft`,
            'error',
            5000
        );

        console.log(`💥 Falling damage: ${combatant.name} fell ${height}ft, rolled ${diceCount}d6 (${rollsText}) = ${totalDamage} damage`);

        // Update combat header if this is the active combatant
        if (combatant.status.isActive) {
            CombatEvents.updateCombatHeader();
        }
    }

    /**
     * Handle cover states cycling for combatant
     * @param {HTMLElement} target - The cover indicator that was clicked
     */
    static handleCycleCoverStates(target) {
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');

        if (!combatantId) return;

        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }

        // Define cover states cycle: none -> half -> three-quarters -> full -> none
        const coverStates = ['none', 'half', 'three-quarters', 'full'];
        const currentCover = combatant.status.cover || 'none';
        const currentIndex = coverStates.indexOf(currentCover);
        const nextIndex = (currentIndex + 1) % coverStates.length;
        const newCoverState = coverStates[nextIndex];

        // Update cover status
        DataServices.combatantManager.updateCombatant(combatantId, 'status.cover', newCoverState);

        // Create user-friendly cover messages
        const coverMessages = {
            'none': 'no cover',
            'half': 'half cover',
            'three-quarters': 'three-quarters cover',
            'full': 'full cover'
        };

        ToastSystem.show(`${combatant.name} now has ${coverMessages[newCoverState]}`, 'info', 2000);

        // Update combat header if this is the active combatant
        if (combatant.status.isActive) {
            CombatEvents.updateCombatHeader();
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
            CombatEvents.updateCombatHeader();
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
            case 'auto-roll':
                batchBtn = modal.querySelector('#auto-roll-batch-apply-btn');
                batchCount = modal.querySelector('#auto-roll-batch-count');
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

    /**
     * Handle death saving throw toggle
     * @param {HTMLElement} target - The death save indicator that was clicked
     */
    static handleToggleDeathSave(target) {
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');
        const saveIndex = parseInt(target.getAttribute('data-save-index'));

        if (!combatantId || isNaN(saveIndex)) return;

        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }

        // Toggle the death save
        combatant.deathSaves[saveIndex] = !combatant.deathSaves[saveIndex];

        // Update the card
        DataServices.combatantManager.updateCombatant(combatantId, 'deathSaves', combatant.deathSaves);

        const statusText = combatant.deathSaves[saveIndex] ? 'Failed' : 'Reset';
        ToastSystem.show(`${combatant.name} death save ${saveIndex + 1}: ${statusText}`, 'info', 2000);
    }
}