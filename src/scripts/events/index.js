/**
 * Event Coordinator - Central hub for all event handling modules
 *
 * This module coordinates between the various event handling modules
 * and provides a unified interface for event management. It replaces
 * the monolithic EventHandlers class with a modular approach.
 *
 * @version 1.0.0
 */

import { TooltipEvents } from './tooltip-events.js';
import { HPEvents } from './hp-events.js';
import { CombatantEvents } from './combatant-events.js';
import { ModalEvents } from './modal-events.js';
import { CombatEvents } from './combat-events.js';
import { KeyboardEvents } from './keyboard-events.js';
import { InlineEditEvents } from './inline-edit-events.js';
import { StateManager } from '../state-manager.js';
import { ToastSystem } from '../../components/toast/ToastSystem.js';
import { ModalSystem } from '../../components/modals/ModalSystem.js';
import { DataServices } from '../data-services.js';

export class EventCoordinator {
    /**
     * Initialize all event handling modules
     */
    static init() {
        console.log('⚡ Event Coordinator initializing...');

        // Initialize core event delegation
        this.setupEventDelegation();

        // Initialize specialized event modules
        TooltipEvents.init();
        ModalEvents.init();
        CombatEvents.init();
        KeyboardEvents.init();

        // Initialize other systems that have setup methods
        this.setupCombatControls();
        this.setupModalHandlers();

        console.log('⚡ Event Coordinator initialized');
    }

    /**
     * Set up event delegation for the entire application
     * This is the main event dispatcher that routes events to appropriate handlers
     */
    static setupEventDelegation() {
        // Main click event delegation
        document.addEventListener('click', (event) => {
            const target = event.target;

            // Handle stat block buttons
            if (target.classList.contains('stat-block-add-btn')) {
                event.preventDefault();
                this.handleAddCombatant();
                return;
            }

            if (target.classList.contains('stat-block-window-btn')) {
                event.preventDefault();
                this.handleAddNewCreature();
                return;
            }

            // Handle clickable combatant names in combat header
            if (target.classList.contains('current-turn-name') && target.classList.contains('clickable-name')) {
                event.preventDefault();
                // TODO: Focus on the combatant in the initiative order
                return;
            }

            // Handle editable actions (damage, heal, temp HP)
            const actionElement = target.closest('[data-action-type]');
            if (actionElement && actionElement.classList.contains('editable-action')) {
                event.preventDefault();
                const actionType = actionElement.getAttribute('data-action-type');
                this.handleHPModification(actionElement, actionType);
                return;
            }

            // Handle data-action elements
            const action = target.getAttribute('data-action') || target.closest('[data-action]')?.getAttribute('data-action');
            if (action) {
                // Don't prevent default for checkbox inputs (they need to change state naturally)
                if (target.tagName !== 'INPUT' || target.type !== 'checkbox') {
                    event.preventDefault();
                }
                this.handleAction(action, target, event);
                return;
            }

            // Handle combatant name editing (double-click)
            if (target.classList.contains('combatant-name')) {
                // TODO: Implement inline name editing
                return;
            }
        });

        // Form submission delegation
        document.addEventListener('submit', (event) => {
            const form = event.target;
            if (form.tagName === 'FORM') {
                event.preventDefault();
                this.handleFormSubmission(form);
            }
        });
    }

    /**
     * Route actions to appropriate handlers
     * @param {string} action - The action to handle
     * @param {HTMLElement} target - The target element
     * @param {Event} event - The original event
     */
    static handleAction(action, target, event) {
        switch (action) {
            case 'next-turn':
                CombatEvents.handleNextTurn();
                break;
            case 'reset-combat':
                CombatEvents.handleResetCombat();
                break;
            case 'clear-encounter':
                CombatEvents.handleClearEncounter();
                break;
            case 'start-combat':
                CombatEvents.startCombat();
                break;
            case 'edit-combatant-initiative':
                this.handleEditInitiative(target);
                break;
            case 'edit-combatant-ac':
                this.handleEditAC(target);
                break;
            case 'move-combatant-up-initiative':
                CombatEvents.handleInitiativeReorder(target, 'up');
                break;
            case 'move-combatant-down-initiative':
                CombatEvents.handleInitiativeReorder(target, 'down');
                break;
            case 'toggle-hold-action':
                this.handleToggleHoldAction(target);
                break;
            case 'set-active-combatant':
                this.handleSetActiveCombatant(target);
                break;
            case 'remove-combatant-from-encounter':
                this.handleRemoveCombatant(target);
                break;
            case 'damage':
            case 'heal':
            case 'temp-hp':
                this.handleHPModification(target, action);
                break;
            case 'batch-hp':
            case 'batch-hp-modification':
                this.handleBatchHPModification(target);
                break;
            case 'clear-note':
                this.handleClearNote(target);
                break;
            case 'toggle-concentration-status':
                this.handleToggleConcentration(target);
                break;
            case 'toggle-stealth-status':
                this.handleToggleStealth(target);
                break;
            case 'toggle-death-save':
                this.handleToggleDeathSave(target);
                break;
            case 'cycle-cover-states':
                this.handleCycleCoverStates(target);
                break;
            case 'toggle-surprise-status':
                this.handleToggleSurprise(target);
                break;
            case 'toggle-batch-select':
                this.handleToggleBatchSelect(target);
                break;
            case 'clear-condition':
                this.handleClearCondition(target);
                break;
            case 'clear-effect':
                this.handleClearEffect(target);
                break;
            case 'toggle-infinity':
                KeyboardEvents.handleInfinityToggle(target);
                break;
            case 'add-combatant':
                this.handleAddCombatant();
                break;
            case 'save-encounter':
                this.handleSaveEncounter();
                break;
            case 'load-encounter':
                this.handleLoadEncounter();
                break;
            case 'quick-view-creature':
                this.handleQuickViewCreature();
                break;
            case 'open-creature-database':
                this.handleOpenCreatureDatabase();
                break;
            case 'import-stat-block':
                this.handleImportStatBlock();
                break;
            default:
                console.warn('Unhandled action:', action);
        }
    }

    /**
     * Handle form submissions
     * @param {HTMLFormElement} form - The form being submitted
     */
    static handleFormSubmission(form) {
        const formType = form.getAttribute('data-form-type');

        // Route HP modifications to HPEvents, everything else to ModalEvents
        if (formType === 'hp-modification') {
            HPEvents.handleHPModificationForm(form);
        } else {
            ModalEvents.handleFormSubmission(formType, form);
        }
    }

    // Action handler methods
    static handleAddCombatant() {
        // Create a temporary trigger element to properly initialize modal
        const trigger = document.createElement('div');
        ModalEvents.handleModalShow('add-combatant', trigger);
    }

    static async handleSaveEncounter() {
        // Check if there are any combatants to save
        const allCombatants = DataServices.combatantManager.getAllCombatants();
        if (allCombatants.length === 0) {
            ToastSystem.show('No combatants to save', 'info', 3000);
            return;
        }

        // Prompt user for encounter name
        const encounterName = prompt('Enter a name for this encounter:');
        if (!encounterName || encounterName.trim() === '') {
            ToastSystem.show('Save cancelled', 'info', 2000);
            return;
        }

        try {
            const encounterId = await DataServices.saveCurrentEncounter(encounterName.trim());
            ToastSystem.show(`Encounter "${encounterName}" saved successfully!`, 'success', 3000);
            console.log(`✅ Saved encounter: ${encounterName} (ID: ${encounterId})`);
        } catch (error) {
            console.error('❌ Error saving encounter:', error);
            ToastSystem.show('Failed to save encounter: ' + error.message, 'error', 4000);
        }
    }

    static async handleLoadEncounter() {
        try {
            // Get all saved encounters
            const encounters = await DataServices.loadSavedEncounters();
            const encounterList = Object.entries(encounters);

            if (encounterList.length === 0) {
                ToastSystem.show('No saved encounters found', 'info', 3000);
                return;
            }

            // Create a simple selection interface
            let options = 'Select an encounter to load:\n\n';
            encounterList.forEach(([id, encounter], index) => {
                const timestamp = new Date(encounter.timestamp).toLocaleString();
                options += `${index + 1}. ${encounter.name || 'Unnamed'} (${timestamp})\n`;
            });

            const selection = prompt(options + '\nEnter the number of the encounter to load (or cancel):');

            if (!selection) {
                ToastSystem.show('Load cancelled', 'info', 2000);
                return;
            }

            const selectedIndex = parseInt(selection) - 1;
            if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= encounterList.length) {
                ToastSystem.show('Invalid selection', 'error', 3000);
                return;
            }

            const [encounterId, encounterData] = encounterList[selectedIndex];

            // Confirm if there are existing combatants
            const currentCombatants = DataServices.combatantManager.getAllCombatants();
            if (currentCombatants.length > 0) {
                const confirmReplace = confirm(`This will replace the current encounter with ${currentCombatants.length} combatants. Continue?`);
                if (!confirmReplace) {
                    ToastSystem.show('Load cancelled', 'info', 2000);
                    return;
                }
            }

            // Clear current encounter
            DataServices.combatantManager.clearAll();

            // Load the encounter data
            // Note: The encounter data should contain combatant instances that can be recreated
            if (encounterData.combatants && encounterData.combatants.length > 0) {
                encounterData.combatants.forEach(combatantData => {
                    // Recreate combatants from saved data
                    DataServices.combatantManager.addCombatant(combatantData.creatureId, combatantData.instanceData);
                });
            }

            ToastSystem.show(`Loaded encounter: ${encounterData.name || 'Unnamed'}`, 'success', 3000);
            console.log(`✅ Loaded encounter: ${encounterData.name} with ${encounterData.combatants?.length || 0} combatants`);

        } catch (error) {
            console.error('❌ Error loading encounter:', error);
            ToastSystem.show('Failed to load encounter: ' + error.message, 'error', 4000);
        }
    }

    static handleQuickViewCreature() {
        // Open the creature database modal for quick viewing
        const trigger = document.createElement('div');
        ModalEvents.handleModalShow('creature-database', trigger);
    }

    static handleOpenCreatureDatabase() {
        // Create a temporary trigger element to properly initialize modal
        const trigger = document.createElement('div');
        ModalEvents.handleModalShow('creature-database', trigger);
    }

    static handleImportStatBlock() {
        ModalSystem.show('stat-block-parser');
    }

    static handleAddNewCreature() {
        ModalSystem.show('creature-form');
    }


    static handleEditInitiative(target) {
        InlineEditEvents.handleInitiativeEdit(target);
    }

    static handleEditAC(target) {
        InlineEditEvents.handleACEdit(target);
    }

    static handleToggleHoldAction(target) {
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');

        if (!combatantId) return;

        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }

        // Toggle hold action status
        const newHoldActionState = !combatant.status.holdAction;
        DataServices.combatantManager.updateCombatant(combatantId, 'status.holdAction', newHoldActionState);

        const message = newHoldActionState ?
            `${combatant.name} is now holding an action` :
            `${combatant.name} is no longer holding an action`;

        ToastSystem.show(message, 'info', 2000);

        // Update combat header if this is the active combatant
        if (combatant.status.isActive) {
            CombatEvents.updateCombatHeader();
        }
    }

    static handleSetActiveCombatant(target) {
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');

        if (!combatantId) return;

        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }

        // Remove active status from all other combatants
        const allCombatants = DataServices.combatantManager.getAllCombatants();
        allCombatants.forEach(c => {
            if (c.status.isActive) {
                DataServices.combatantManager.updateCombatant(c.id, 'status.isActive', false);
            }
        });

        // Set this combatant as active
        DataServices.combatantManager.updateCombatant(combatantId, 'status.isActive', true);

        ToastSystem.show(`${combatant.name} is now the active combatant`, 'success', 2000);

        // Update combat header to reflect the new active combatant
        CombatEvents.updateCombatHeader();
    }

    static handleRemoveCombatant(target) {
        // Find the combatant card and get the ID
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');

        if (!combatantId) {
            console.error('Could not find combatant ID');
            return;
        }

        // Get the combatant to show name in confirmation
        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }

        // Ask for confirmation before removing
        const confirmMessage = `Remove ${combatant.name} from the encounter?`;
        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            // Remove the combatant using CombatantManager
            DataServices.combatantManager.removeCombatant(combatantId);

            ToastSystem.show(`Removed ${combatant.name} from encounter`, 'success', 3000);
            console.log(`✅ Removed combatant: ${combatant.name} (${combatantId})`);
        } catch (error) {
            console.error('❌ Error removing combatant:', error);
            ToastSystem.show('Failed to remove combatant: ' + error.message, 'error', 4000);
        }
    }

    static handleHPModification(target, actionType) {
        HPEvents.handleHPModification(target, actionType);
    }

    static handleBatchHPModification(target) {
        HPEvents.handleBatchHPModification(target);
    }

    static handleClearNote(target) {
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');

        if (!combatantId) return;

        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }

        // Clear the note
        DataServices.combatantManager.updateCombatant(combatantId, 'notes', '');

        ToastSystem.show(`Note cleared for ${combatant.name}`, 'success', 2000);

        // Re-render to update the display
        DataServices.combatantManager.renderAll();
    }

    static handleToggleConcentration(target) {
        CombatantEvents.handleToggleConcentration(target);
    }

    static handleToggleStealth(target) {
        CombatantEvents.handleToggleStealth(target);
    }
    static handleToggleDeathSave(target) {
        CombatantEvents.handleToggleDeathSave(target);
    }

    static handleCycleCoverStates(target) {
        CombatantEvents.handleCycleCoverStates(target);
    }

    static handleToggleSurprise(target) {
        CombatantEvents.handleToggleSurprise(target);
    }

    static handleToggleBatchSelect(target) {
        CombatantEvents.handleToggleBatchSelect(target);
    }

    static handleClearCondition(target) {
        CombatantEvents.handleClearCondition(target);
    }

    static handleClearEffect(target) {
        CombatantEvents.handleClearEffect(target);
    }

    // Note: Form handling now routed through handleFormSubmission

    /**
     * Set up combat control handlers
     */
    static setupCombatControls() {
        // Combat controls setup will be moved here from EventHandlers
        console.log('Combat controls setup - TODO');
    }

    /**
     * Set up modal handlers
     */
    static setupModalHandlers() {
        // Modal handlers are now managed by ModalEvents module
        console.log('Modal handlers managed by ModalEvents module');
    }

    /**
     * Get all currently selected combatants
     * @returns {Array} Array of selected combatant objects
     */
    static getSelectedCombatants() {
        return CombatantEvents.getSelectedCombatants();
    }
}