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
                event.preventDefault();
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
            case 'remove-combatant-from-encounter':
                this.handleRemoveCombatant(target);
                break;
            case 'damage':
            case 'heal':
            case 'temp-hp':
                this.handleHPModification(target, action);
                break;
            case 'batch-hp':
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
            case 'cycle-cover-states':
                // TODO: Implement cover cycling
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

    // Placeholder methods - these will be implemented as we extract more modules
    static handleAddCombatant() {
        ToastSystem.show('Add combatant functionality - TODO', 'info');
    }

    static handleAddNewCreature() {
        ToastSystem.show('Add new creature functionality - TODO', 'info');
    }


    static handleEditInitiative(target) {
        ToastSystem.show('Edit initiative functionality - TODO', 'info');
    }

    static handleEditAC(target) {
        ToastSystem.show('Edit AC functionality - TODO', 'info');
    }

    static handleToggleHoldAction(target) {
        ToastSystem.show('Toggle hold action functionality - TODO', 'info');
    }

    static handleRemoveCombatant(target) {
        ToastSystem.show('Remove combatant functionality - TODO', 'info');
    }

    static handleHPModification(target, actionType) {
        HPEvents.handleHPModification(target, actionType);
    }

    static handleBatchHPModification(target) {
        HPEvents.handleBatchHPModification(target);
    }

    static handleClearNote(target) {
        ToastSystem.show('Clear note functionality - TODO', 'info');
    }

    static handleToggleConcentration(target) {
        CombatantEvents.handleToggleConcentration(target);
    }

    static handleToggleStealth(target) {
        CombatantEvents.handleToggleStealth(target);
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