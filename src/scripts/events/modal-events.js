/**
 * ModalEvents - Modal dialog and form submission handling
 *
 * Handles all modal-related functionality including:
 * - Modal show/hide event handling
 * - Form submission routing and validation
 * - Condition and effect form processing
 * - Combatant addition and note management
 * - Batch operation integration with modals
 *
 * @version 1.0.0
 */

import { StateManager } from '../state-manager.js';
import { ToastSystem } from '../../components/toast/ToastSystem.js';
import { ModalSystem } from '../../components/modals/ModalSystem.js';
import { DataServices } from '../data-services.js';

export class ModalEvents {
    /**
     * Initialize modal event handlers
     */
    static init() {
        this.setupModalHandlers();
    }

    /**
     * Set up modal show/hide event handlers
     */
    static setupModalHandlers() {
        // Handle modal show events
        document.addEventListener('click', (event) => {
            const modalShow = event.target.getAttribute('data-modal-show');
            if (modalShow) {
                event.preventDefault();
                this.handleModalShow(modalShow, event.target);
            }
        });

        // Handle modal close on overlay click
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal-overlay')) {
                event.preventDefault();
                ModalSystem.hideAll();
            }
        });
    }

    /**
     * Handle modal show with target setup
     * @param {string} modalType - Type of modal to show
     * @param {HTMLElement} trigger - Element that triggered the modal
     */
    static handleModalShow(modalType, trigger) {
        const modal = document.querySelector(`[data-modal="${modalType}"]`);
        if (!modal) return;

        // Get target combatant ID if specified
        const targetId = trigger.getAttribute('data-modal-target');
        if (targetId) {
            modal.setAttribute('data-current-target', targetId);

            // Update the target name in the modal
            const targetCombatant = DataServices.combatantManager.getCombatant(targetId);
            if (targetCombatant) {
                const targetNameElement = modal.querySelector('[data-target-name]');
                if (targetNameElement) {
                    targetNameElement.textContent = targetCombatant.name;
                }

                // Handle specific modal types
                this.handleSpecificModalSetup(modalType, modal, targetCombatant, trigger);
            }
        }

        // Update batch buttons for applicable modals
        this.updateBatchButtons(modalType, modal);

        // Show the modal
        ModalSystem.show(modalType);
    }

    /**
     * Handle specific modal setup based on type
     * @param {string} modalType - Type of modal
     * @param {HTMLElement} modal - Modal element
     * @param {Object} targetCombatant - Target combatant object
     * @param {HTMLElement} trigger - Trigger element
     */
    static handleSpecificModalSetup(modalType, modal, targetCombatant, trigger) {
        switch (modalType) {
            case 'combatant-note':
                this.setupNoteModal(modal, targetCombatant, trigger);
                break;
            case 'effect':
                this.setupEffectModal(modal);
                break;
            case 'condition':
                this.setupConditionModal(modal);
                break;
        }
    }

    /**
     * Set up note modal with existing content
     * @param {HTMLElement} modal - Modal element
     * @param {Object} targetCombatant - Target combatant object
     * @param {HTMLElement} trigger - Trigger element
     */
    static setupNoteModal(modal, targetCombatant, trigger) {
        const noteInput = modal.querySelector('#combatant-note-text');
        const noteType = trigger.getAttribute('data-note-type') || 'general';

        // Store the note type on the modal for the form handler
        modal.setAttribute('data-current-note-type', noteType);

        // Update modal title based on note type
        const modalTitle = modal.querySelector('.modal-header h2');
        if (modalTitle) {
            if (noteType === 'name') {
                modalTitle.innerHTML = `Edit Name Note for <span data-target-name>${targetCombatant.name}</span>`;
            } else {
                modalTitle.innerHTML = `Add Note for <span data-target-name>${targetCombatant.name}</span>`;
            }
        }

        if (noteInput) {
            // Populate with the appropriate note
            if (noteType === 'name') {
                noteInput.value = targetCombatant.nameNote || '';
                noteInput.placeholder = "e.g., 'Leader', 'Archer #2'";
            } else {
                noteInput.value = targetCombatant.notes || '';
                noteInput.placeholder = "Enter a short note...";
            }

            // Update character counter
            const counter = document.getElementById('note-char-count');
            if (counter) {
                counter.textContent = noteInput.value.length;
            }
        }
    }

    /**
     * Set up effect modal
     * @param {HTMLElement} modal - Modal element
     */
    static setupEffectModal(modal) {
        // Populate the recent effects dropdown
        this.populateRecentEffectsDropdown();

        // Clear the custom effect input
        const customEffectInput = modal.querySelector('#custom-effect');
        if (customEffectInput) {
            customEffectInput.value = '';
        }
    }

    /**
     * Set up condition modal
     * @param {HTMLElement} modal - Modal element
     */
    static setupConditionModal(modal) {
        // Clear any previous selections
        const conditionInputs = modal.querySelectorAll('input[name="condition"]');
        conditionInputs.forEach(input => {
            input.checked = false;
        });
    }

    /**
     * Update batch operation buttons in modal
     * @param {string} modalType - Type of modal
     * @param {HTMLElement} modal - Modal element
     */
    static updateBatchButtons(modalType, modal) {
        // Get selected combatants (avoid circular dependency by accessing through coordinator)
        const selectedCombatants = window.EventCoordinator?.getSelectedCombatants() || [];

        let batchBtn = null;
        let batchCount = null;

        switch (modalType) {
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

        if (batchBtn && batchCount) {
            if (selectedCombatants.length > 0) {
                batchBtn.style.display = 'block';
                batchCount.textContent = selectedCombatants.length;
            } else {
                batchBtn.style.display = 'none';
            }
        }
    }

    /**
     * Route form submissions to appropriate handlers
     * @param {string} formType - Type of form being submitted
     * @param {HTMLFormElement} form - Form element
     */
    static handleFormSubmission(formType, form) {
        console.log(`📝 Form submission: ${formType}`);

        switch (formType) {
            case 'add-combatant':
                this.handleAddCombatantForm(form);
                break;
            case 'condition-application':
                this.handleConditionForm(form);
                break;
            case 'effect-application':
                this.handleEffectForm(form);
                break;
            case 'combatant-note':
                this.handleNoteForm(form);
                break;
            case 'creature':
                this.handleCreatureForm(form);
                break;
            default:
                console.log(`⚠️ Unhandled form type: ${formType}`);
        }
    }

    /**
     * Handle condition form submission
     * @param {HTMLFormElement} form - Condition form
     */
    static handleConditionForm(form) {
        const formData = new FormData(form);

        // Get form values
        const condition = formData.get('condition');
        const turns = formData.get('turns');
        const note = formData.get('note')?.trim() || '';

        // Get target from modal
        const modal = form.closest('.modal-overlay');
        const targetId = modal?.getAttribute('data-current-target');

        // Validation
        if (!condition) {
            ToastSystem.show('Please select a condition', 'error', 2000);
            return;
        }

        if (!targetId) {
            ToastSystem.show('No target selected', 'error', 2000);
            return;
        }

        // Get the combatant
        const combatant = DataServices.combatantManager.getCombatant(targetId);
        if (!combatant) {
            console.error('Combatant not found:', targetId);
            return;
        }

        // Create condition object
        const conditionObj = {
            name: condition,
            duration: turns === 'infinite' ? 'infinite' : parseInt(turns) || 1,
            note: note
        };

        // Check if condition already exists
        const existingIndex = combatant.conditions.findIndex(c => c.name === condition);
        if (existingIndex !== -1) {
            // Update existing condition
            combatant.conditions[existingIndex] = conditionObj;
            ToastSystem.show(`Updated ${condition} on ${combatant.name}`, 'success', 2000);
        } else {
            // Add new condition
            combatant.conditions.push(conditionObj);
            ToastSystem.show(`Applied ${condition} to ${combatant.name}`, 'success', 2000);
        }

        // Update the combatant
        DataServices.combatantManager.updateCombatant(targetId, 'conditions', combatant.conditions);

        // Close modal
        ModalSystem.hideAll();

        // Update combat header if this is the active combatant
        if (combatant.status.isActive) {
            // TODO: This will be moved to combat events module
            console.log('Update combat header - TODO');
        }
    }

    /**
     * Handle effect form submission
     * @param {HTMLFormElement} form - Effect form
     */
    static handleEffectForm(form) {
        const formData = new FormData(form);

        // Get form values - check both custom input and dropdown
        let effectName = formData.get('custom-effect')?.trim();
        if (!effectName) {
            effectName = formData.get('effect-dropdown');
        }

        const turns = formData.get('turns');
        const note = formData.get('note')?.trim() || '';

        // Get target from modal
        const modal = form.closest('.modal-overlay');
        const targetId = modal?.getAttribute('data-current-target');

        // Validation
        if (!effectName) {
            ToastSystem.show('Please enter or select an effect', 'error', 2000);
            return;
        }

        if (!targetId) {
            ToastSystem.show('No target selected', 'error', 2000);
            return;
        }

        // Get the combatant
        const combatant = DataServices.combatantManager.getCombatant(targetId);
        if (!combatant) {
            console.error('Combatant not found:', targetId);
            return;
        }

        // Create effect object
        const effectObj = {
            name: effectName,
            duration: turns === 'infinite' ? 'infinite' : parseInt(turns) || 1,
            note: note
        };

        // Check if effect already exists
        const existingIndex = combatant.effects.findIndex(e => e.name === effectName);
        if (existingIndex !== -1) {
            // Update existing effect
            combatant.effects[existingIndex] = effectObj;
            ToastSystem.show(`Updated ${effectName} on ${combatant.name}`, 'success', 2000);
        } else {
            // Add new effect
            combatant.effects.push(effectObj);
            ToastSystem.show(`Applied ${effectName} to ${combatant.name}`, 'success', 2000);

            // Add to recent effects for future use
            this.addToRecentEffects(effectName);
        }

        // Update the combatant
        DataServices.combatantManager.updateCombatant(targetId, 'effects', combatant.effects);

        // Close modal
        ModalSystem.hideAll();

        // Update combat header if this is the active combatant
        if (combatant.status.isActive) {
            // TODO: This will be moved to combat events module
            console.log('Update combat header - TODO');
        }
    }

    /**
     * Handle note form submission
     * @param {HTMLFormElement} form - Note form
     */
    static handleNoteForm(form) {
        const formData = new FormData(form);
        const noteText = formData.get('noteText')?.trim() || '';

        // Get target and note type from modal
        const modal = form.closest('.modal-overlay');
        const targetId = modal?.getAttribute('data-current-target');
        const noteType = modal?.getAttribute('data-current-note-type') || 'general';

        if (!targetId) {
            ToastSystem.show('No target selected', 'error', 2000);
            return;
        }

        // Get the combatant
        const combatant = DataServices.combatantManager.getCombatant(targetId);
        if (!combatant) {
            console.error('Combatant not found:', targetId);
            return;
        }

        // Update the appropriate note field
        if (noteType === 'name') {
            DataServices.combatantManager.updateCombatant(targetId, 'nameNote', noteText);
            ToastSystem.show(`Name note updated for ${combatant.name}`, 'success', 2000);
        } else {
            DataServices.combatantManager.updateCombatant(targetId, 'notes', noteText);
            ToastSystem.show(`Note updated for ${combatant.name}`, 'success', 2000);
        }

        // Close modal
        ModalSystem.hideAll();
    }

    /**
     * Handle add combatant form submission
     * @param {HTMLFormElement} form - Add combatant form
     */
    static handleAddCombatantForm(form) {
        const formData = new FormData(form);

        // Get form values
        const creatureId = formData.get('creatureId');
        const initiative = parseInt(formData.get('initiative'));
        const currentHP = formData.get('currentHP') ? parseInt(formData.get('currentHP')) : null;
        const nameNote = formData.get('nameNote')?.trim() || '';
        const startingSurprised = formData.get('startingSurprised') === 'true';
        const startingHiding = formData.get('startingHiding') === 'true';

        // Validation
        if (!creatureId) {
            ToastSystem.show('Please select a creature', 'error', 3000);
            return;
        }

        if (isNaN(initiative)) {
            ToastSystem.show('Please enter a valid initiative', 'error', 3000);
            return;
        }

        // TODO: Implement actual combatant creation
        // This would typically involve:
        // 1. Get creature data from database
        // 2. Create new combatant instance
        // 3. Add to encounter
        // 4. Update UI

        ToastSystem.show('Add combatant functionality - TODO', 'info', 3000);
        ModalSystem.hideAll();
    }

    /**
     * Handle creature form submission (for adding new creatures to database)
     * @param {HTMLFormElement} form - Creature form
     */
    static handleCreatureForm(form) {
        const formData = new FormData(form);

        // TODO: Implement creature creation
        // This would involve building a stat block data structure
        // and adding it to the creature database

        ToastSystem.show('Create creature functionality - TODO', 'info', 3000);
        ModalSystem.hideAll();
    }

    /**
     * Populate recent effects dropdown
     */
    static populateRecentEffectsDropdown() {
        const dropdown = document.getElementById('effect-dropdown');
        if (!dropdown) return;

        // Get recent effects from localStorage
        const recentEffects = this.getRecentEffects();

        // Clear existing options (except the first placeholder)
        while (dropdown.children.length > 1) {
            dropdown.removeChild(dropdown.lastChild);
        }

        // Add recent effects
        recentEffects.forEach(effect => {
            const option = document.createElement('option');
            option.value = effect;
            option.textContent = effect;
            dropdown.appendChild(option);
        });
    }

    /**
     * Get recent effects from localStorage
     * @returns {Array} Array of recent effect names
     */
    static getRecentEffects() {
        try {
            const stored = localStorage.getItem('recentEffects');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.warn('Failed to load recent effects:', error);
            return [];
        }
    }

    /**
     * Add effect to recent effects list
     * @param {string} effectName - Name of the effect to add
     */
    static addToRecentEffects(effectName) {
        if (!effectName) return;

        const recentEffects = this.getRecentEffects();

        // Remove if already exists (to move to front)
        const existingIndex = recentEffects.indexOf(effectName);
        if (existingIndex !== -1) {
            recentEffects.splice(existingIndex, 1);
        }

        // Add to front
        recentEffects.unshift(effectName);

        // Limit to 10 recent effects
        const limitedEffects = recentEffects.slice(0, 10);

        // Save back to localStorage
        try {
            localStorage.setItem('recentEffects', JSON.stringify(limitedEffects));
        } catch (error) {
            console.warn('Failed to save recent effects:', error);
        }
    }
}