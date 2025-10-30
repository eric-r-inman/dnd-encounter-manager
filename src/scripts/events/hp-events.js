/**
 * HPEvents - Health Point modification and management
 *
 * Handles all HP-related functionality including:
 * - Individual combatant damage, healing, and temporary HP
 * - Batch HP modifications for multiple combatants
 * - HP calculation with temp HP consideration
 * - Health state tracking (bloodied, unconscious, dead)
 * - HP history management
 *
 * @version 1.0.0
 */

import { StateManager } from '../state-manager.js';
import { ToastSystem } from '../../components/toast/ToastSystem.js';
import { ModalSystem } from '../../components/modals/ModalSystem.js';
import { DataServices } from '../data-services.js';

export class HPEvents {
    /**
     * Handle HP modification button click (damage, heal, temp-hp)
     * @param {HTMLElement} target - The clicked element
     * @param {string} actionType - Type of HP modification (damage, heal, temp-hp)
     */
    static handleHPModification(target, actionType) {
        // Find the combatant card
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');

        if (!combatantId) {
            console.error('No combatant ID found for HP modification');
            return;
        }

        // Get the combatant
        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }

        // Set up the modal
        const modal = document.querySelector('[data-modal="hp-modification"]');
        if (!modal) return;

        // Update modal title and labels based on action type
        const actionTypeSpan = modal.querySelector('#hp-action-type');
        const actionLabel = modal.querySelector('#hp-action-label');
        const submitBtn = modal.querySelector('#hp-submit-btn');
        const targetName = modal.querySelector('[data-target-name]');

        // Configure modal based on action type
        let modalTitle, buttonClass, historyTitle, historyData;
        switch (actionType) {
            case 'damage':
                modalTitle = 'Damage';
                buttonClass = 'btn-danger';
                historyTitle = 'Damage History';
                historyData = combatant.damageHistory || [];
                break;
            case 'heal':
                modalTitle = 'Heal';
                buttonClass = 'btn-success';
                historyTitle = 'Healing History';
                historyData = combatant.healHistory || [];
                break;
            case 'temp-hp':
                modalTitle = 'Temporary HP';
                buttonClass = 'btn-info';
                historyTitle = 'Temp HP History';
                historyData = combatant.tempHPHistory || [];
                break;
            default:
                console.error('Unknown action type:', actionType);
                return;
        }

        // Update modal UI elements
        actionTypeSpan.textContent = modalTitle;
        actionLabel.textContent = modalTitle;
        submitBtn.className = `btn ${buttonClass}`;
        targetName.textContent = combatant.name;

        // Update HP display
        modal.querySelector('#current-hp-display').textContent = combatant.currentHP;
        modal.querySelector('#max-hp-display').textContent = combatant.maxHP;

        // Show temp HP if any
        const tempHPDisplay = modal.querySelector('#temp-hp-display');
        const tempHPValue = modal.querySelector('#temp-hp-value');
        if (combatant.tempHP > 0) {
            tempHPDisplay.style.display = 'inline';
            tempHPValue.textContent = combatant.tempHP;
        } else {
            tempHPDisplay.style.display = 'none';
        }

        // Set hidden fields
        modal.querySelector('#hp-action-type-field').value = actionType;
        modal.querySelector('#hp-combatant-id').value = combatantId;

        // Clear the amount field
        modal.querySelector('#hp-amount').value = '';

        // Check for selected combatants and show/hide batch button
        const selectedCombatants = this.getSelectedCombatants();
        const batchBtn = modal.querySelector('#hp-batch-apply-btn');
        const batchCount = modal.querySelector('#batch-count');

        if (selectedCombatants.length > 0) {
            // Show batch apply button
            batchBtn.style.display = 'block';
            batchBtn.className = `btn ${buttonClass}`;
            batchCount.textContent = selectedCombatants.length;

            // Store action type on the button for the handler
            batchBtn.setAttribute('data-batch-action-type', actionType);
        } else {
            // Hide batch apply button
            batchBtn.style.display = 'none';
        }

        // Populate history
        const historyTitleElement = modal.querySelector('#hp-history-title');
        const historyListElement = modal.querySelector('#hp-history-list');

        historyTitleElement.textContent = historyTitle;
        historyListElement.innerHTML = '';

        if (historyData.length === 0) {
            historyListElement.innerHTML = '<div class="hp-history-empty">No history yet</div>';
        } else {
            historyData.forEach(entry => {
                const entryElement = document.createElement('div');
                entryElement.className = 'hp-history-entry';
                entryElement.innerHTML = `
                    <span class="hp-history-amount ${actionType}">${entry.amount} ${modalTitle}</span>
                    <span class="hp-history-round">Round ${entry.round}</span>
                `;
                historyListElement.appendChild(entryElement);
            });
        }

        // Show the modal
        ModalSystem.show('hp-modification');
    }

    /**
     * Handle HP modification form submission
     * @param {HTMLFormElement} form - The form being submitted
     */
    static handleHPModificationForm(form) {
        const formData = new FormData(form);
        const amount = parseInt(formData.get('amount'));
        const actionType = formData.get('actionType');
        const combatantId = formData.get('combatantId');

        // Validation
        if (isNaN(amount) || amount < 0) {
            ToastSystem.show('Please enter a valid amount', 'error', 2000);
            return;
        }

        // Get the combatant
        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }

        // Apply HP modification and show result
        const result = this.applySingleHPModification(combatant, actionType, amount);

        // Close modal and show success message
        ModalSystem.hideAll();
        ToastSystem.show(result.message, 'success', 3000);

        // Show health state warnings
        this.showHealthStateWarnings(combatant, result.originalHP);

        // Update combat header if this is the active combatant
        if (combatant.status.isActive) {
            // Note: This will need to be updated when we extract combat events
            console.log('Update combat header - TODO');
        }
    }

    /**
     * Handle batch HP modification for multiple combatants
     * @param {HTMLElement} target - The batch button that was clicked
     */
    static handleBatchHPModification(target) {
        // Get modal data
        const modal = target.closest('.modal-overlay');
        if (!modal) return;

        const amountInput = modal.querySelector('#hp-amount');
        const amount = parseInt(amountInput.value);
        const actionType = target.getAttribute('data-batch-action-type');

        // Validation
        if (isNaN(amount) || amount < 0) {
            ToastSystem.show('Please enter a valid amount', 'error', 2000);
            return;
        }

        // Get selected combatants
        const selectedCombatants = this.getSelectedCombatants();
        if (selectedCombatants.length === 0) {
            ToastSystem.show('No combatants selected', 'warning', 2000);
            return;
        }

        // For damage, check if any combatants would go to 0 HP or below
        if (actionType === 'damage' && amount > 0) {
            const combatantsGoingDown = this.getCombatantsGoingDown(selectedCombatants, amount);

            if (combatantsGoingDown.length > 0) {
                const namesList = combatantsGoingDown.join(', ');
                const message = `This damage will reduce the following to 0 HP or below: ${namesList}. Continue?`;

                if (!confirm(message)) {
                    return;
                }
            }
        }

        // Apply the modification to all selected combatants
        const results = this.applyBatchHPModification(selectedCombatants, actionType, amount);

        // Show results
        ModalSystem.hideAll();
        ToastSystem.show(`${actionType} applied to ${results.successCount} combatants`, 'success', 3000);

        // Show warnings for health state changes
        results.warnings.forEach(warning => {
            ToastSystem.show(warning.message, warning.type, 3000);
        });
    }

    /**
     * Apply HP modification to a single combatant
     * @param {Object} combatant - The combatant object
     * @param {string} actionType - Type of modification (damage, heal, temp-hp)
     * @param {number} amount - Amount to apply
     * @returns {Object} Result object with message and original HP
     */
    static applySingleHPModification(combatant, actionType, amount) {
        // Store original values
        const originalHP = combatant.currentHP;
        const originalTempHP = combatant.tempHP;

        // Calculate new values based on action type
        let newHP = originalHP;
        let newTempHP = originalTempHP;
        let message = '';

        switch (actionType) {
            case 'damage':
                const damageResult = this.applyDamage(combatant, amount);
                newHP = damageResult.newHP;
                newTempHP = damageResult.newTempHP;
                message = `${combatant.name} took ${damageResult.actualDamage} damage`;
                break;

            case 'heal':
                const healingResult = this.applyHealing(combatant, amount);
                newHP = healingResult.newHP;
                message = `${combatant.name} healed ${healingResult.actualHealing} HP`;
                break;

            case 'temp-hp':
                const tempHPResult = this.applyTempHP(combatant, amount);
                newTempHP = tempHPResult.newTempHP;
                message = `${combatant.name} gained ${amount} temporary HP`;
                break;

            default:
                throw new Error(`Unknown action type: ${actionType}`);
        }

        // Update the combatant using the manager
        if (newHP !== originalHP) {
            DataServices.combatantManager.updateCombatant(combatant.id, 'currentHP', newHP);
        }
        if (newTempHP !== originalTempHP) {
            DataServices.combatantManager.updateCombatant(combatant.id, 'tempHP', newTempHP);
        }

        // Add to history
        this.addToHistory(combatant, actionType, amount, originalHP, newHP, originalTempHP, newTempHP);

        // Save the updated combatant data
        DataServices.combatantManager.saveInstances();

        return { message, originalHP, newHP, newTempHP };
    }

    /**
     * Apply damage to a combatant (temp HP first, then current HP)
     * @param {Object} combatant - The combatant object
     * @param {number} amount - Damage amount
     * @returns {Object} Result with new HP values and actual damage
     */
    static applyDamage(combatant, amount) {
        let remainingDamage = amount;
        let actualDamage = 0;
        let newHP = combatant.currentHP;
        let newTempHP = combatant.tempHP;

        // First, damage removes temporary HP
        if (newTempHP > 0) {
            if (remainingDamage >= newTempHP) {
                remainingDamage -= newTempHP;
                actualDamage += newTempHP;
                newTempHP = 0;
            } else {
                newTempHP -= remainingDamage;
                actualDamage += remainingDamage;
                remainingDamage = 0;
            }
        }

        // Then damage reduces current HP
        if (remainingDamage > 0) {
            const hpBefore = newHP;
            newHP = Math.max(0, newHP - remainingDamage);
            actualDamage += (hpBefore - newHP);
        }

        return { newHP, newTempHP, actualDamage };
    }

    /**
     * Apply healing to a combatant
     * @param {Object} combatant - The combatant object
     * @param {number} amount - Healing amount
     * @returns {Object} Result with new HP and actual healing
     */
    static applyHealing(combatant, amount) {
        const hpBefore = combatant.currentHP;
        const newHP = Math.min(combatant.maxHP, hpBefore + amount);
        const actualHealing = newHP - hpBefore;

        return { newHP, actualHealing };
    }

    /**
     * Apply temporary HP to a combatant
     * @param {Object} combatant - The combatant object
     * @param {number} amount - Temp HP amount
     * @returns {Object} Result with new temp HP
     */
    static applyTempHP(combatant, amount) {
        // Temp HP doesn't stack - take the higher value
        const newTempHP = Math.max(combatant.tempHP, amount);
        return { newTempHP };
    }

    /**
     * Apply HP modification to multiple combatants
     * @param {Array} combatants - Array of combatant objects
     * @param {string} actionType - Type of modification
     * @param {number} amount - Amount to apply
     * @returns {Object} Results with success count and warnings
     */
    static applyBatchHPModification(combatants, actionType, amount) {
        let successCount = 0;
        const warnings = [];

        combatants.forEach(combatant => {
            try {
                const originalHP = combatant.currentHP;
                const result = this.applySingleHPModification(combatant, actionType, amount);

                // Check for health state warnings
                const healthWarnings = this.getHealthStateWarnings(combatant, originalHP);
                warnings.push(...healthWarnings);

                successCount++;
            } catch (error) {
                console.error(`Failed to apply ${actionType} to ${combatant.name}:`, error);
                warnings.push({
                    message: `Failed to apply ${actionType} to ${combatant.name}`,
                    type: 'error'
                });
            }
        });

        return { successCount, warnings };
    }

    /**
     * Get combatants that would be reduced to 0 HP or below
     * @param {Array} combatants - Array of combatant objects
     * @param {number} damageAmount - Amount of damage
     * @returns {Array} Names of combatants going down
     */
    static getCombatantsGoingDown(combatants, damageAmount) {
        const combatantsGoingDown = [];

        combatants.forEach(combatant => {
            let remainingDamage = damageAmount;
            let effectiveHP = combatant.currentHP;

            // Consider temp HP
            if (combatant.tempHP > 0) {
                if (remainingDamage >= combatant.tempHP) {
                    remainingDamage -= combatant.tempHP;
                } else {
                    remainingDamage = 0;
                }
            }

            // Check if they would go to 0 or below
            if (remainingDamage >= effectiveHP) {
                combatantsGoingDown.push(combatant.name);
            }
        });

        return combatantsGoingDown;
    }

    /**
     * Add HP modification to combatant's history
     * @param {Object} combatant - The combatant object
     * @param {string} actionType - Type of modification
     * @param {number} amount - Amount applied
     * @param {number} originalHP - HP before modification
     * @param {number} newHP - HP after modification
     * @param {number} originalTempHP - Temp HP before modification
     * @param {number} newTempHP - Temp HP after modification
     */
    static addToHistory(combatant, actionType, amount, originalHP, newHP, originalTempHP, newTempHP) {
        const currentRound = StateManager.state.combat.round || 1;

        switch (actionType) {
            case 'damage':
                const actualDamage = originalHP + originalTempHP - newHP - newTempHP;
                if (actualDamage > 0) {
                    combatant.addDamageHistory(actualDamage, currentRound);
                }
                break;

            case 'heal':
                const actualHealing = newHP - originalHP;
                if (actualHealing > 0) {
                    combatant.addHealHistory(actualHealing, currentRound);
                }
                break;

            case 'temp-hp':
                if (newTempHP > originalTempHP) {
                    combatant.addTempHPHistory(amount, currentRound);
                }
                break;
        }
    }

    /**
     * Show health state warnings for a combatant
     * @param {Object} combatant - The combatant object
     * @param {number} originalHP - HP before modification
     */
    static showHealthStateWarnings(combatant, originalHP) {
        const warnings = this.getHealthStateWarnings(combatant, originalHP);
        warnings.forEach(warning => {
            ToastSystem.show(warning.message, warning.type, 3000);
        });
    }

    /**
     * Get health state warnings for a combatant
     * @param {Object} combatant - The combatant object
     * @param {number} originalHP - HP before modification
     * @returns {Array} Array of warning objects
     */
    static getHealthStateWarnings(combatant, originalHP) {
        const warnings = [];
        const newHealthState = combatant.getHealthState();

        if (newHealthState === 'unconscious' && originalHP > 0) {
            warnings.push({
                message: `${combatant.name} is unconscious!`,
                type: 'warning'
            });

            // Turn off concentration if unconscious
            if (combatant.status.concentration) {
                DataServices.combatantManager.updateCombatant(combatant.id, 'status.concentration', false);
                warnings.push({
                    message: `${combatant.name} lost concentration`,
                    type: 'warning'
                });
            }
        } else if (newHealthState === 'dead' && originalHP > 0) {
            warnings.push({
                message: `${combatant.name} has died!`,
                type: 'danger'
            });

            // Turn off concentration if dead
            if (combatant.status.concentration) {
                DataServices.combatantManager.updateCombatant(combatant.id, 'status.concentration', false);
            }
        } else if (newHealthState === 'bloodied' && originalHP > Math.floor(combatant.maxHP / 2)) {
            warnings.push({
                message: `${combatant.name} is bloodied!`,
                type: 'warning'
            });
        }

        return warnings;
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