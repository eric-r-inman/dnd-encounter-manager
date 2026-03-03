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
import { CreatureModalEvents } from './creature-modal-events.js';
import { CombatEvents } from './combat-events.js';
import { KeyboardEvents } from './keyboard-events.js';
import { InlineEditEvents } from './inline-edit-events.js';
import { InitiativeEvents } from './initiative-events.js';
import { InitiativeManagerEvents } from './initiative-manager-events.js';
import { EncounterEvents } from './encounter-events.js';
import { ImportExportEvents } from './import-export-events.js';
import { CreatureHandlers } from './creature-handlers.js';
import { ImportExportHandlers } from './import-export-handlers.js';
import { RecentItems } from './recent-items.js';
import { DiceRollerEvents } from './dice-roller-events.js';
import { AutoRollEvents } from './auto-roll-events.js';
import { DiceRoller } from '../../components/dice-roller/DiceRoller.js';
import { DiceLinkConverter } from '../utils/dice-link-converter.js';
import { StateManager } from '../state-manager.js';
import { ToastSystem } from '../../components/toast/ToastSystem.js';
import { ModalSystem } from '../../components/modals/ModalSystem.js';
import { DataServices } from '../data-services.js';
import { buildStatBlockHTML } from '../renderers/stat-block-renderer.js';
import { escapeHtml } from '../renderers/html-utils.js';
import { STORAGE_KEYS, MODAL_NAMES, TIMING } from '../constants.js';
import { returnToCompendiumAfterCancel } from '../utils/modal-helpers.js';
import { StatBlockParser } from '../parsers/stat-block-parser.js';
import { CreatureService } from '../services/creature-service.js';
import { validateCreatureSelected, validateCombatantsSelected, validateRequired, validateDiceFormula } from '../utils/validators.js';

export class EventCoordinator {
    // Debounce timer for placeholder editing
    static placeholderEditDebounceTimer = null;
    static PLACEHOLDER_SAVE_DELAY = 500; // 500ms delay after user stops typing

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
        DiceRollerEvents.init();

        // Initialize other systems that have setup methods
        this.setupCombatControls();
        this.setupModalHandlers();

        console.log('⚡ Event Coordinator initialized');
    }

    /**
     * Set up event delegation for the entire application
     * This is the main event dispatcher that routes events to appropriate handlers
     *
     * WHY EVENT DELEGATION: Instead of adding individual event listeners to every
     * button/element (which is slow and memory-intensive), we use event delegation -
     * a single listener on the document that captures all clicks. We then check
     * what was clicked and route to the appropriate handler.
     *
     * WHY THIS PATTERN: Benefits include:
     * 1. Better performance (one listener vs. hundreds)
     * 2. Dynamic content support (works with elements added after page load)
     * 3. Easier maintenance (all routing logic in one place)
     * 4. Memory efficiency (fewer event listeners = less memory)
     */
    static setupEventDelegation() {
        // WHY: Single click listener for entire app (event delegation pattern)
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
                CreatureHandlers.handleAddNewCreature();
                return;
            }

            // Handle clickable combatant names in combat header
            if (target.classList.contains('current-turn-name') && target.classList.contains('clickable-name')) {
                event.preventDefault();
                const combatantId = target.getAttribute('data-combatant-id');
                if (combatantId) {
                    // Find the combatant card
                    const combatantCard = document.querySelector(`.combatant-card[data-combatant-id="${combatantId}"]`);
                    if (combatantCard) {
                        // Scroll to the card
                        combatantCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

                        // Add highlight animation
                        combatantCard.classList.add('highlight-flash');
                        setTimeout(() => combatantCard.classList.remove('highlight-flash'), 1000);
                    }
                }
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

            // WHY: Handle data-action elements (main routing mechanism)
            // This is the core of our action-based routing system. Any HTML element with
            // a `data-action="something"` attribute will be routed through handleAction().
            // We also check parent elements with `.closest()` to support nested structures
            // (e.g., clicking an icon inside a button)
            const action = target.getAttribute('data-action') || target.closest('[data-action]')?.getAttribute('data-action');
            if (action) {
                // WHY: Don't prevent default for checkboxes - they need to update their
                // visual state naturally. preventDefault() would break the checkbox UI.
                if (target.tagName !== 'INPUT' || target.type !== 'checkbox') {
                    event.preventDefault();
                }
                this.handleAction(action, target, event);
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

        // Input event delegation for search fields
        document.addEventListener('input', (event) => {
            const target = event.target;
            const action = target.getAttribute('data-action');
            if (action === 'search-creatures') {
                CreatureHandlers.handleSearchCreatures(target, event);
            } else if (action === 'edit-placeholder-line') {
                this.handleEditPlaceholderLine(target);
            } else if (action === 'edit-flying-height') {
                this.handleEditFlyingHeight(target);
            }
        });

        // Change event delegation for filters and selects
        document.addEventListener('change', (event) => {
            const target = event.target;
            const action = target.getAttribute('data-action');
            if (action === 'filter-creature-type') {
                CreatureHandlers.handleFilterCreatureType(target);
            } else if (action === 'change-sort-filter') {
                CreatureHandlers.handleSortFilterChange(target);
            }

            // Handle type filter checkbox changes
            if (target.name === 'type-filter') {
                const modal = target.closest('[data-modal="creature-database"]');
                if (modal) {
                    const sortSelect = modal.querySelector('#creature-sort-filter');
                    if (sortSelect) {
                        // Re-apply current sort with the new type filter selection
                        CreatureHandlers.applySortAndFilter(modal, sortSelect.value);
                    }
                }
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
            case 'open-dice-roller':
                DiceRollerEvents.handleOpenDiceRoller();
                break;
            case 'roll-dice-from-stat-block':
                this.handleRollDiceFromStatBlock(target);
                break;
            case 'toggle-xp-filter':
                this.handleToggleXPFilter(target);
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
            case 'duplicate-combatant':
                this.handleDuplicateCombatant(target);
                break;
            case 'duplicate-fresh':
            case 'duplicate-preserve':
            case 'duplicate-ooze-split':
                this.handleDuplicateOption(target, action);
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
            case 'batch-condition':
                this.handleBatchCondition(target);
                break;
            case 'batch-effect':
                this.handleBatchEffect(target);
                break;
            case 'batch-note':
                this.handleBatchNote(target);
                break;
            case 'batch-auto-roll':
                this.handleBatchAutoRoll(target);
                break;
            case 'clear-note':
                this.handleClearNote(target);
                break;
            case 'open-auto-roll-modal':
                AutoRollEvents.handleOpenAutoRollModal(target);
                break;
            case 'clear-auto-roll':
                AutoRollEvents.handleClearAutoRoll(target);
                break;
            case 'toggle-concentration-status':
                this.handleToggleConcentration(target);
                break;
            case 'toggle-stealth-status':
                this.handleToggleStealth(target);
                break;
            case 'toggle-flying-status':
                this.handleToggleFlying(target);
                break;
            case 'edit-flying-height':
                this.handleEditFlyingHeight(target);
                break;
            case 'increment-flying-height':
                this.handleIncrementFlyingHeight(target);
                break;
            case 'decrement-flying-height':
                this.handleDecrementFlyingHeight(target);
                break;
            case 'apply-falling-damage':
                this.handleApplyFallingDamage(target);
                break;
            case 'roll-ability-check':
                this.handleRollAbilityCheck(target);
                break;
            case 'roll-saving-throw':
                this.handleRollSavingThrow(target);
                break;
            case 'roll-skill-check':
                this.handleRollSkillCheck(target);
                break;
            case 'roll-creature-initiative':
                this.handleRollCreatureInitiative(target);
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
                this.handleToggleBatchSelect(target, event);
                break;
            case 'clear-condition':
                this.handleClearCondition(target);
                break;
            case 'clear-effect':
                this.handleClearEffect(target);
                break;
            case 'clear-timer':
                this.handleClearTimer(target);
                break;
            case 'toggle-infinity':
                KeyboardEvents.handleInfinityToggle(target);
                break;
            case 'add-combatant':
                this.handleAddCombatant();
                break;
            case 'add-placeholder':
                this.handleAddPlaceholder();
                break;
            case 'edit-placeholder-line':
                this.handleEditPlaceholderLine(target);
                break;
            case 'confirm-creature-type':
                this.handleConfirmCreatureType(target);
                break;
            case 'save-encounter':
                this.handleSaveEncounter();
                break;
            case 'load-encounter':
                this.handleLoadEncounter();
                break;
            case 'quick-view-creature':
                CreatureHandlers.handleQuickViewCreature();
                break;
            case 'open-creature-database':
                CreatureHandlers.handleOpenCreatureDatabase();
                break;
            case 'import-stat-block':
                ImportExportHandlers.handleImportStatBlock();
                break;
            case 'add-new-creature':
                CreatureHandlers.handleAddNewCreature();
                break;
            case 'add-creature-to-encounter':
                CreatureHandlers.handleAddCreatureToEncounter(target);
                break;
            case 'search-creatures':
                CreatureHandlers.handleSearchCreatures(target, event);
                break;
            case 'filter-creature-type':
                CreatureHandlers.handleFilterCreatureType(target);
                break;
            case 'edit-creature':
                CreatureHandlers.handleEditCreature(target);
                break;
            case 'delete-creature':
                this.handleDeleteCreature(target);
                break;
            case 'duplicate-creature':
                this.handleDuplicateCreature(target);
                break;
            case 'export-creature':
                CreatureHandlers.handleExportCreature(target);
                break;
            case 'cancel-creature-form':
                this.handleCancelCreatureForm();
                break;
            case 'cancel-player-form':
                this.handleCancelPlayerForm();
                break;
            case 'cancel-creature-type-selection':
                this.handleCancelCreatureTypeSelection();
                break;
            case 'cancel-stat-block-parser':
                this.handleCancelStatBlockParser();
                break;
            case 'import-creature':
                ImportExportHandlers.handleImportCreature();
                break;
            case 'import-creature-database':
                this.handleImportCreatureDatabase();
                break;
            case 'export-creature-database':
                this.handleExportCreatureDatabase();
                break;
            case 'reset-creature-database':
                this.handleResetCreatureDatabase();
                break;
            case 'parse-stat-block':
                this.handleParseStatBlock(target);
                break;
            case 'import-parsed-creature':
                ImportExportHandlers.handleImportParsedCreature(target);
                break;
            case 'view-creature-stat-block':
                CreatureHandlers.handleViewCreatureStatBlock(target);
                break;
            case 'add-custom-section':
                CreatureModalEvents.addCustomSectionRowWithData();
                break;
            case 'open-creature-window':
                const creatureId = target.getAttribute('data-creature-id');
                if (creatureId) {
                    CreatureModalEvents.openCreatureInNewWindow(creatureId);
                }
                break;
            case 'edit-condition':
                this.handleEditCondition(target);
                break;
            case 'edit-effect':
                this.handleEditEffect(target);
                break;
            case 'edit-timer':
                this.handleEditTimer(target);
                break;
            case 'apply-cr-filter':
                CreatureHandlers.handleApplyCRFilter(target);
                break;
            case 'clear-cr-filter':
                CreatureHandlers.handleClearCRFilter(target);
                break;
            case 'clear-type-filter':
                CreatureHandlers.handleClearTypeFilter(target);
                break;
            case 'roll-quick-initiative':
                InitiativeEvents.rollQuickInitiative(target);
                break;
            case 'quick-sort-encounter':
                InitiativeManagerEvents.handleQuickSortEncounter();
                break;
            case 'roll-init-single':
                this.handleRollInitSingle();
                break;
            case 'roll-init-all':
                InitiativeManagerEvents.handleRollInitiativeAll();
                break;
            case 'roll-init-selected':
                InitiativeManagerEvents.handleRollInitiativeSelected();
                break;
            case 'apply-custom-init-single':
                this.handleApplyCustomInitSingle();
                break;
            case 'apply-custom-init-selected':
                this.handleApplyCustomInitSelected();
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

    /**
     * Handle adding a placeholder card
     */
    static handleAddPlaceholder() {
        if (DataServices.combatantManager) {
            DataServices.combatantManager.addPlaceholder();
            ToastSystem.show('Added placeholder', 'success', TIMING.TOAST_SHORT);
        }
    }

    /**
     * Handle creature type selection confirmation
     * Opens the appropriate form based on selected type
     * @param {HTMLElement} target - The continue button
     */
    static handleConfirmCreatureType(target) {
        const form = document.getElementById('creature-type-selection-form');
        if (!form) return;

        const selectedType = form.querySelector('input[name="creature-type"]:checked')?.value;
        if (!selectedType) {
            ToastSystem.show('Please select a creature type', 'warning', TIMING.TOAST_SHORT);
            return;
        }

        // Close the type selection modal
        ModalSystem.hide('creature-type-selection');

        // Store the selected type for the form
        sessionStorage.setItem('pending-creature-type', selectedType);

        // Open the appropriate form
        if (selectedType === 'player') {
            // TODO: Open player form modal (to be created)
            ModalSystem.show('player-form');
        } else {
            // Open standard creature form for enemy/npc
            ModalSystem.show('creature-form');
        }
    }

    /**
     * Handle editing a placeholder text line
     * WHY: Debounced to avoid saving on every keystroke - only saves after user stops typing
     * @param {HTMLElement} target - The input element
     */
    static handleEditPlaceholderLine(target) {
        const newValue = target.value;

        // Find the combatant card element
        const cardElement = target.closest('.combatant-card');
        if (!cardElement) return;

        const combatantId = cardElement.getAttribute('data-combatant-id');
        if (!combatantId) return;

        // Get the combatant from the manager
        const combatant = DataServices.combatantManager.combatants.get(combatantId);
        if (!combatant || !combatant.isPlaceholder) return;

        // Update the notes field immediately (for UI responsiveness)
        combatant.notes = newValue;

        // WHY: Debounce the save operation to avoid excessive saves on every keystroke
        // Clear any existing timer
        if (this.placeholderEditDebounceTimer) {
            clearTimeout(this.placeholderEditDebounceTimer);
        }

        // Set new timer - only save after user stops typing for PLACEHOLDER_SAVE_DELAY ms
        this.placeholderEditDebounceTimer = setTimeout(() => {
            DataServices.combatantManager.saveInstances();
        }, this.PLACEHOLDER_SAVE_DELAY);
    }

    static async handleSaveEncounter() {
        await EncounterEvents.handleSaveEncounter();
    }

    static async handleLoadEncounter() {
        await EncounterEvents.handleLoadEncounter();
    }

    /**
     * Handle deleting a creature from the database
     * @param {HTMLElement} target - The delete button
     */
    static async handleDeleteCreature(target) {
        const modal = target.closest('[data-modal="creature-database"]');
        if (!modal) return;

        const creatureId = modal.getAttribute('data-selected-creature-id');
        if (!validateCreatureSelected(creatureId)) return;

        // Get creature from CreatureService
        const creature = await CreatureService.getCreature(creatureId);

        if (!creature) {
            ToastSystem.show('Creature not found', 'error', TIMING.TOAST_SHORT);
            return;
        }

        // Confirm deletion
        const confirmDelete = confirm(`Are you sure you want to delete "${creature.name}"?`);
        if (!confirmDelete) {
            return;
        }

        try {
            // Delete creature using CreatureService
            const success = await CreatureService.deleteCreature(creatureId);

            if (!success) {
                ToastSystem.show('Failed to delete creature', 'error', TIMING.TOAST_LONG);
                return;
            }

            // Reload the database
            if (DataServices.combatantManager) {
                await DataServices.combatantManager.loadCreatureDatabase();
            }

            ToastSystem.show(`Deleted: ${creature.name}`, 'success', TIMING.TOAST_SHORT);
            console.log(`✅ Deleted creature: ${creature.name}`);

            // Refresh the compendium to show updated list
            CreatureModalEvents.setupCreatureDatabaseModal(modal);

            // Update the file status indicator
            CreatureModalEvents.updateCreatureDatabaseFileStatus(modal);

            // Clear the details pane
            const detailsPane = modal.querySelector('.creature-details-column');
            if (detailsPane) {
                detailsPane.innerHTML = `
                    <div class="empty-state">
                        <h3>No Creature Selected</h3>
                        <p>Select a creature from the list to view details</p>
                    </div>
                `;
            }

        } catch (error) {
            console.error('❌ Error deleting creature:', error);
            ToastSystem.show('Failed to delete creature: ' + error.message, 'error', TIMING.TOAST_LONG);
        }
    }

    /**
     * Handle duplicating a creature
     * @param {HTMLElement} target - The duplicate button
     */
    static async handleDuplicateCreature(target) {
        const modal = target.closest('[data-modal="creature-database"]');
        if (!modal) return;

        const creatureId = modal.getAttribute('data-selected-creature-id');
        if (!validateCreatureSelected(creatureId)) return;

        // Get creature from consolidated database
        const allCreatures = DataServices.combatantManager?.creatureDatabase || [];
        const creature = allCreatures.find(c => c.id === creatureId);

        if (!creature) {
            ToastSystem.show('Creature not found', 'error', TIMING.TOAST_SHORT);
            return;
        }

        try {
            // Deep clone the creature
            const duplicate = JSON.parse(JSON.stringify(creature));

            // Find the next available number for the duplicate name
            let duplicateNumber = 1;
            let newName = `${creature.name} (${duplicateNumber})`;

            // Keep incrementing until we find an unused name
            while (allCreatures.some(c => c.name === newName)) {
                duplicateNumber++;
                newName = `${creature.name} (${duplicateNumber})`;
            }

            // Update the duplicate's name and generate new ID
            duplicate.name = newName;
            duplicate.id = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

            // Ensure the ID is unique too
            let idNumber = duplicateNumber;
            while (allCreatures.some(c => c.id === duplicate.id)) {
                duplicate.id = `${creature.id}-${idNumber}`;
                idNumber++;
            }

            // Mark as custom creature and add timestamp
            duplicate.isCustom = true;
            duplicate.createdAt = Date.now();

            // Add to custom creatures in localStorage
            const customCreatures = JSON.parse(localStorage.getItem('dnd-custom-creatures') || '[]');
            customCreatures.push(duplicate);
            localStorage.setItem('dnd-custom-creatures', JSON.stringify(customCreatures));

            // Reload the consolidated database
            if (DataServices.combatantManager) {
                await DataServices.combatantManager.loadCreatureDatabase();
            }

            ToastSystem.show(`Duplicated: ${duplicate.name}`, 'success', TIMING.TOAST_SHORT);
            console.log(`✅ Duplicated creature: ${creature.name} → ${duplicate.name}`);

            // Refresh the compendium
            CreatureModalEvents.setupCreatureDatabaseModal(modal);

            // Select the new duplicate
            setTimeout(() => {
                const duplicateItem = modal.querySelector(`.creature-list-item[data-creature-id="${duplicate.id}"]`);
                if (duplicateItem) {
                    duplicateItem.click();
                    duplicateItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 100);

        } catch (error) {
            console.error('❌ Error duplicating creature:', error);
            ToastSystem.show('Failed to duplicate creature: ' + error.message, 'error', TIMING.TOAST_LONG);
        }
    }

    /**
     * Handle cancel from creature form - return to compendium
     */
    static handleCancelCreatureForm() {
        returnToCompendiumAfterCancel(MODAL_NAMES.CREATURE_FORM, 'creature form');
    }

    /**
     * Handle cancel from player form - return to compendium
     */
    static handleCancelPlayerForm() {
        returnToCompendiumAfterCancel(MODAL_NAMES.PLAYER_FORM, 'player form');
    }

    /**
     * Handle cancel from creature type selection - return to compendium
     */
    static handleCancelCreatureTypeSelection() {
        returnToCompendiumAfterCancel(MODAL_NAMES.CREATURE_TYPE_SELECTION, 'creature type selection');
    }

    /**
     * Handle cancel from stat block parser - return to compendium
     */
    static handleCancelStatBlockParser() {
        returnToCompendiumAfterCancel(MODAL_NAMES.STAT_BLOCK_PARSER, 'stat block parser');
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

        ToastSystem.show(message, 'info', TIMING.TOAST_SHORT);

        // Update combat header if this is the active combatant
        if (combatant.status.isActive) {
            CombatEvents.updateCombatHeader();
        }
    }

    /**
     * Handle toggling XP filter dropdown
     * @param {HTMLElement} target - The XP tracker element
     */
    static handleToggleXPFilter(target) {
        const xpTracker = target.closest('.xp-tracker');
        if (!xpTracker) return;

        const dropdown = xpTracker.querySelector('.xp-filter-dropdown');
        if (!dropdown) return;

        // Toggle dropdown visibility
        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';

        // Add event listeners to filter options if dropdown is now visible
        if (!isVisible) {
            const filterOptions = dropdown.querySelectorAll('.xp-filter-option');
            filterOptions.forEach(option => {
                option.addEventListener('click', (e) => {
                    const filterValue = option.getAttribute('data-filter');

                    // Save filter preference
                    localStorage.setItem('xp-filter', filterValue);

                    // Update combat header to reflect new XP total
                    CombatEvents.updateCombatHeader();

                    // Close dropdown
                    dropdown.style.display = 'none';

                    ToastSystem.show('XP filter updated', 'success', 1500);
                });
            });

            // Close dropdown when clicking outside
            setTimeout(() => {
                const closeDropdown = (e) => {
                    if (!xpTracker.contains(e.target)) {
                        dropdown.style.display = 'none';
                        document.removeEventListener('click', closeDropdown);
                    }
                };
                document.addEventListener('click', closeDropdown);
            }, 0);
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

        ToastSystem.show(`${combatant.name} is now the active combatant`, 'success', TIMING.TOAST_SHORT);

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

            ToastSystem.show(`Removed ${combatant.name} from encounter`, 'success', TIMING.TOAST_LONG);
            console.log(`✅ Removed combatant: ${combatant.name} (${combatantId})`);
        } catch (error) {
            console.error('❌ Error removing combatant:', error);
            ToastSystem.show('Failed to remove combatant: ' + error.message, 'error', TIMING.TOAST_EXTRA_LONG);
        }
    }

    static async handleDuplicateCombatant(target) {
        // Find the combatant card and get the ID
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');

        if (!combatantId) {
            console.error('Could not find combatant ID');
            return;
        }

        // Get the combatant
        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }

        // Show the modal FIRST (loads it if not already loaded)
        await ModalSystem.show('duplicate-combatant');

        // Now query for the modal (it should exist after show())
        const modal = document.querySelector('[data-modal="duplicate-combatant"]');
        if (!modal) {
            console.error('Duplicate modal not found even after show()');
            return;
        }

        // Store the combatant ID in the modal for later use
        modal.setAttribute('data-combatant-id', combatantId);

        // Update modal title with combatant name
        const nameSpan = modal.querySelector('#duplicate-combatant-name');
        if (nameSpan) {
            nameSpan.textContent = combatant.name;
        }
    }

    static handleDuplicateOption(target, option) {
        // Get the modal and combatant ID
        const modal = target.closest('[data-modal="duplicate-combatant"]');
        const combatantId = modal?.getAttribute('data-combatant-id');

        if (!combatantId) {
            console.error('Could not find combatant ID in modal');
            return;
        }

        // Get the original combatant
        const originalCombatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!originalCombatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }

        try {
            let newCombatant;

            switch (option) {
                case 'duplicate-fresh':
                    newCombatant = this.duplicateCombatantFresh(originalCombatant);
                    break;
                case 'duplicate-preserve':
                    newCombatant = this.duplicateCombatantPreserve(originalCombatant);
                    break;
                case 'duplicate-ooze-split':
                    newCombatant = this.duplicateCombatantOozeSplit(originalCombatant);
                    break;
                default:
                    console.error('Unknown duplicate option:', option);
                    return;
            }

            // Check if duplication was successful
            if (!newCombatant) {
                throw new Error('Failed to create duplicate combatant');
            }

            // Close the modal
            ModalSystem.hide('duplicate-combatant');

            // Show success message
            ToastSystem.show(`Created ${newCombatant.name}`, 'success', TIMING.TOAST_LONG);
            console.log(`✅ Duplicated combatant: ${originalCombatant.name} → ${newCombatant.name}`);
        } catch (error) {
            console.error('❌ Error duplicating combatant:', error);
            ToastSystem.show('Failed to duplicate combatant: ' + error.message, 'error', TIMING.TOAST_EXTRA_LONG);
        }
    }

    static duplicateCombatantFresh(original) {
        // Create a copy with reset HP and cleared conditions/effects
        const newName = `${original.name} (copy)`;

        const instanceData = {
            name: newName,
            initiative: original.initiative,
            currentHP: original.maxHP,
            tempHP: 0,
            deathSaves: [false, false, false],
            conditions: [],
            effects: [],
            status: {
                isActive: false,
                holdAction: false,
                surprised: false,
                concentration: false,
                concentrationSpell: '',
                hiding: false,
                cover: 'none',
                flying: false,
                flyingHeight: 0
            },
            autoRoll: null,
            damageHistory: [],
            healHistory: [],
            tempHPHistory: [],
            manualOrder: this.calculateNewManualOrder(original)
        };

        // Add the new combatant using creatureId and instanceData
        const newCombatant = DataServices.combatantManager.addCombatant(original.creatureId, instanceData);
        return newCombatant;
    }

    static duplicateCombatantPreserve(original) {
        // Create an exact copy preserving all HP, conditions, effects, and auto-roll
        const newName = `${original.name} (copy)`;

        const instanceData = {
            name: newName,
            initiative: original.initiative,
            currentHP: original.currentHP,
            tempHP: original.tempHP,
            status: {
                ...original.status,
                isActive: false  // Don't make the duplicate active
            },
            // Keep original's death saves
            deathSaves: [...original.deathSaves],
            // Preserve conditions
            conditions: original.conditions.map(c => ({ ...c })),
            // Preserve effects
            effects: original.effects.map(e => ({ ...e })),
            // Preserve auto-roll if it exists
            autoRoll: original.autoRoll ? { ...original.autoRoll } : null,
            // Clear history for new combatant
            damageHistory: [],
            healHistory: [],
            tempHPHistory: [],
            manualOrder: this.calculateNewManualOrder(original)
        };

        // Add the new combatant using creatureId and instanceData
        const newCombatant = DataServices.combatantManager.addCombatant(original.creatureId, instanceData);
        return newCombatant;
    }

    static duplicateCombatantOozeSplit(original) {
        // For ooze splits: divide max HP and current HP, remove temp HP, preserve conditions
        const newName = `${original.name} (split)`;
        const halfMaxHP = Math.floor(original.maxHP / 2);
        const halfCurrentHP = Math.floor(original.currentHP / 2);

        // Get all combatants and sort them by current display order
        const allCombatants = DataServices.combatantManager.getAllCombatants();
        const sortedCombatants = allCombatants.sort((a, b) => {
            if (a.manualOrder !== null && b.manualOrder !== null) {
                return a.manualOrder - b.manualOrder;
            }
            if (a.manualOrder !== null) return -1;
            if (b.manualOrder !== null) return 1;
            if (b.initiative !== a.initiative) {
                return b.initiative - a.initiative;
            }
            return a.name.localeCompare(b.name);
        });

        // Find the original's current position
        const originalIndex = sortedCombatants.findIndex(c => c.id === original.id);

        // Assign manual orders to ALL combatants if any don't have them
        // This ensures stable positioning
        const needsManualOrders = sortedCombatants.some(c => c.manualOrder === null);
        if (needsManualOrders) {
            sortedCombatants.forEach((combatant, index) => {
                if (combatant.manualOrder === null) {
                    DataServices.combatantManager.updateCombatant(combatant.id, 'manualOrder', index);
                }
            });
        }

        // Calculate manual order for new combatant (right before original)
        // Use the original's position (which is now set) and subtract 0.5
        const originalManualOrder = original.manualOrder !== null ? original.manualOrder : originalIndex;
        const newManualOrder = originalManualOrder - 0.5;

        // Update the original creature to have half HP and add "(split)" to name
        DataServices.combatantManager.updateCombatant(original.id, 'name', newName);
        DataServices.combatantManager.updateCombatant(original.id, 'maxHP', halfMaxHP);
        DataServices.combatantManager.updateCombatant(original.id, 'currentHP', halfCurrentHP);
        DataServices.combatantManager.updateCombatant(original.id, 'tempHP', 0);

        const instanceData = {
            name: newName,
            initiative: original.initiative,
            maxHP: halfMaxHP,
            currentHP: halfCurrentHP,
            tempHP: 0,
            deathSaves: [false, false, false],  // New creature has no failed death saves
            status: {
                ...original.status,
                isActive: false  // Don't make the duplicate active
            },
            // Preserve conditions
            conditions: original.conditions.map(c => ({ ...c })),
            // Preserve effects
            effects: original.effects.map(e => ({ ...e })),
            // Clear auto-roll for ooze split
            autoRoll: null,
            // Clear history for new combatant
            damageHistory: [],
            healHistory: [],
            tempHPHistory: [],
            // For ooze split, place new creature ABOVE (before) the original
            manualOrder: newManualOrder
        };

        // Add the new combatant using creatureId and instanceData
        const newCombatant = DataServices.combatantManager.addCombatant(original.creatureId, instanceData);

        // Show info toast about the split
        ToastSystem.show(`${original.name} split! Both creatures now have ${halfMaxHP} max HP and ${halfCurrentHP} current HP`, 'info', TIMING.TOAST_EXTRA_LONG);

        return newCombatant;
    }

    static calculateNewManualOrder(original) {
        // Place the duplicate right after the original in turn order
        // Get all combatants to find the position
        const allCombatants = DataServices.combatantManager.getAllCombatants();

        // If original has manual order, increment it by 0.5 to place it right after
        if (original.manualOrder !== null) {
            return original.manualOrder + 0.5;
        }

        // If no manual order, we need to assign manual orders to maintain position
        // Sort combatants by current display order
        const sortedCombatants = allCombatants.sort((a, b) => {
            if (a.manualOrder !== null && b.manualOrder !== null) {
                return a.manualOrder - b.manualOrder;
            }
            if (a.manualOrder !== null) return -1;
            if (b.manualOrder !== null) return 1;
            if (b.initiative !== a.initiative) {
                return b.initiative - a.initiative;
            }
            return a.name.localeCompare(b.name);
        });

        // Find the original's index
        const originalIndex = sortedCombatants.findIndex(c => c.id === original.id);
        if (originalIndex === -1) {
            return null; // Shouldn't happen, but fallback
        }

        // Return manual order that places duplicate right after original
        return originalIndex + 0.5;
    }

    static calculateNewManualOrderBefore(original) {
        // Place the duplicate right before the original in turn order (for ooze splits)
        // Get all combatants to find the position
        const allCombatants = DataServices.combatantManager.getAllCombatants();

        // If original has manual order, subtract 0.5 to place it right before
        if (original.manualOrder !== null) {
            return original.manualOrder - 0.5;
        }

        // If no manual order exists, we need to create one based on current position
        // Sort combatants by current display order (same logic as CombatantManager)
        const sortedCombatants = allCombatants.sort((a, b) => {
            if (a.manualOrder !== null && b.manualOrder !== null) {
                return a.manualOrder - b.manualOrder;
            }
            if (a.manualOrder !== null) return -1;
            if (b.manualOrder !== null) return 1;
            if (b.initiative !== a.initiative) {
                return b.initiative - a.initiative;
            }
            return a.name.localeCompare(b.name);
        });

        // Find the original's index
        const originalIndex = sortedCombatants.findIndex(c => c.id === original.id);
        if (originalIndex === -1) {
            return null; // Shouldn't happen, but fallback
        }

        // Assign manual orders to all combatants to establish the current order
        // Then place the duplicate right before the original
        // Use index-based manual orders (0, 1, 2, etc.) for clean spacing
        // The duplicate will get originalIndex - 0.5 to appear before original
        return originalIndex - 0.5;
    }

    static handleHPModification(target, actionType) {
        HPEvents.handleHPModification(target, actionType);
    }

    static handleBatchHPModification(target) {
        HPEvents.handleBatchHPModification(target);
    }

    static handleBatchCondition(target) {
        const modal = target.closest('.modal-overlay');
        if (!modal) return;

        // Get form data
        const form = modal.querySelector('form');
        const formData = new FormData(form);

        const condition = formData.get('condition');
        const turns = formData.get('turns');
        const note = formData.get('note')?.trim() || '';
        const expiresAt = formData.get('expiresAt') || 'start'; // 'start' or 'end'

        // Validation
        if (!condition) {
            ToastSystem.show('Please select a condition', 'error', TIMING.TOAST_SHORT);
            return;
        }

        // Get selected combatants
        const selectedCombatants = this.getSelectedCombatants();
        if (!validateCombatantsSelected(selectedCombatants)) return;

        // Apply condition to all selected combatants
        let successCount = 0;
        selectedCombatants.forEach(combatant => {
            // Create a NEW condition object for each combatant (not shared reference)
            const conditionObj = {
                name: condition,
                duration: turns === 'infinite' ? 'infinite' : parseInt(turns) || 1,
                note: note,
                expiresAt: expiresAt // 'start' = beginning of turn, 'end' = end of turn
            };

            // Special case: If this condition expires at "end" and is being applied to the active combatant,
            // set a flag to skip the first end-of-turn decrement (so it expires at the end of their NEXT turn)
            if (expiresAt === 'end' && combatant.status.isActive) {
                conditionObj.skipNextEndDecrement = true;
            }

            // Check if condition already exists
            const existingIndex = combatant.conditions.findIndex(c => c.name === condition);
            if (existingIndex !== -1) {
                // Update existing condition
                combatant.conditions[existingIndex] = conditionObj;
            } else {
                // Add new condition
                combatant.conditions.push(conditionObj);
            }

            // Update the combatant
            DataServices.combatantManager.updateCombatant(combatant.id, 'conditions', combatant.conditions);
            successCount++;
        });

        // Close modal
        ModalSystem.hideAll();

        // Show success message
        ToastSystem.show(`Applied ${condition} to ${successCount} combatant${successCount !== 1 ? 's' : ''}`, 'success', TIMING.TOAST_LONG);

        // Update combat header if any of the selected are active
        const hasActiveCombatant = selectedCombatants.some(c => c.status.isActive);
        if (hasActiveCombatant) {
            CombatEvents.updateCombatHeader();
        }
    }

    static handleBatchEffect(target) {
        const modal = target.closest('.modal-overlay');
        if (!modal) return;

        // Get form data
        const form = modal.querySelector('form');
        const formData = new FormData(form);

        // Get form values - check both custom input and dropdown
        let effectName = formData.get('custom-effect')?.trim();
        if (!effectName) {
            effectName = formData.get('effect-dropdown');
        }

        const turns = formData.get('turns');
        const note = formData.get('note')?.trim() || '';
        const expiresAt = formData.get('expiresAt') || 'start'; // 'start' or 'end'

        // Validation
        if (!effectName) {
            ToastSystem.show('Please enter or select an effect', 'error', TIMING.TOAST_SHORT);
            return;
        }

        // Get selected combatants
        const selectedCombatants = this.getSelectedCombatants();
        if (!validateCombatantsSelected(selectedCombatants)) return;

        // Apply effect to all selected combatants
        let successCount = 0;
        selectedCombatants.forEach(combatant => {
            // Create a NEW effect object for each combatant (not shared reference)
            const effectObj = {
                name: effectName,
                duration: turns === 'infinite' ? 'infinite' : parseInt(turns) || 1,
                note: note,
                expiresAt: expiresAt // 'start' = beginning of turn, 'end' = end of turn
            };

            // Special case: If this effect expires at "end" and is being applied to the active combatant,
            // set a flag to skip the first end-of-turn decrement (so it expires at the end of their NEXT turn)
            if (expiresAt === 'end' && combatant.status.isActive) {
                effectObj.skipNextEndDecrement = true;
            }

            // Check if effect already exists
            const existingIndex = combatant.effects.findIndex(e => e.name === effectName);
            if (existingIndex !== -1) {
                // Update existing effect
                combatant.effects[existingIndex] = effectObj;
            } else {
                // Add new effect
                combatant.effects.push(effectObj);
            }

            // Update the combatant
            DataServices.combatantManager.updateCombatant(combatant.id, 'effects', combatant.effects);
            successCount++;
        });

        // Add to recent effects for future use
        RecentItems.addToRecentEffects(effectName);

        // Close modal
        ModalSystem.hideAll();

        // Show success message
        ToastSystem.show(`Applied ${effectName} to ${successCount} combatant${successCount !== 1 ? 's' : ''}`, 'success', TIMING.TOAST_LONG);

        // Update combat header if any of the selected are active
        const hasActiveCombatant = selectedCombatants.some(c => c.status.isActive);
        if (hasActiveCombatant) {
            CombatEvents.updateCombatHeader();
        }
    }

    /**
     * Handle batch note application to selected combatants
     * @param {HTMLElement} target - The batch button that was clicked
     */
    static handleBatchNote(target) {
        const modal = target.closest('.modal-overlay');
        if (!modal) return;

        // Get form data
        const form = modal.querySelector('form');
        const formData = new FormData(form);

        const noteText = formData.get('noteText')?.trim() || '';

        // Validation
        if (!noteText) {
            ToastSystem.show('Please enter a note', 'error', TIMING.TOAST_SHORT);
            return;
        }

        // Get selected combatants
        const selectedCombatants = this.getSelectedCombatants();
        if (!validateCombatantsSelected(selectedCombatants)) return;

        // Apply note to all selected combatants
        let successCount = 0;
        selectedCombatants.forEach(combatant => {
            DataServices.combatantManager.updateCombatant(combatant.id, 'notes', noteText);
            successCount++;
        });

        // Add to recent notes for future use
        RecentItems.addToRecentNotes(noteText);

        // Close modal
        ModalSystem.hideAll();

        // Show success message
        ToastSystem.show(`Applied note to ${successCount} combatant${successCount !== 1 ? 's' : ''}`, 'success', TIMING.TOAST_LONG);
    }

    /**
     * Handle batch auto-roll application to selected combatants
     * @param {HTMLElement} target - The batch button that was clicked
     */
    static handleBatchAutoRoll(target) {
        const modal = target.closest('.modal-overlay');
        if (!modal) return;

        // Get form data
        const form = modal.querySelector('form');
        const formData = new FormData(form);

        const formula = formData.get('formula');
        const trigger = formData.get('trigger');

        // Validate formula
        if (!validateDiceFormula(formula)) return;

        // Additional validation using AutoRollEvents
        import('./auto-roll-events.js').then(module => {
            if (!module.AutoRollEvents.validateDiceFormula(formula)) {
                return;
            }

            // Get selected combatants
            const selectedCombatants = this.getSelectedCombatants();
            if (selectedCombatants.length === 0) {
                ToastSystem.show('No combatants selected', 'warning', TIMING.TOAST_SHORT);
                return;
            }

            // Apply auto-roll to all selected combatants
            let successCount = 0;
            selectedCombatants.forEach(combatant => {
                combatant.autoRoll = {
                    formula: formula,
                    trigger: trigger,
                    lastResult: null
                };
                combatant.update();
                successCount++;
            });

            // Close modal
            ModalSystem.hideAll();

            // Show success message
            ToastSystem.show(`Applied auto-roll to ${successCount} combatant${successCount !== 1 ? 's' : ''}`, 'success', TIMING.TOAST_LONG);
        });
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

        ToastSystem.show(`Note cleared for ${combatant.name}`, 'success', TIMING.TOAST_SHORT);

        // Re-render to update the display
        DataServices.combatantManager.renderAll();
    }

    static handleToggleConcentration(target) {
        CombatantEvents.handleToggleConcentration(target);
    }

    static handleToggleStealth(target) {
        CombatantEvents.handleToggleStealth(target);
    }

    static handleToggleFlying(target) {
        CombatantEvents.handleToggleFlying(target);
    }

    static handleEditFlyingHeight(target) {
        CombatantEvents.handleEditFlyingHeight(target);
    }

    static handleIncrementFlyingHeight(target) {
        CombatantEvents.handleIncrementFlyingHeight(target);
    }

    static handleDecrementFlyingHeight(target) {
        CombatantEvents.handleDecrementFlyingHeight(target);
    }

    static handleApplyFallingDamage(target) {
        CombatantEvents.handleApplyFallingDamage(target);
    }

    /**
     * Handle ability check roll from stat block
     * @param {HTMLElement} target - The ability score cell that was clicked
     */
    static handleRollAbilityCheck(target) {
        const ability = target.getAttribute('data-ability');
        const modifier = parseInt(target.getAttribute('data-modifier')) || 0;

        // Format ability name for display
        const abilityNames = {
            'str': 'Strength',
            'dex': 'Dexterity',
            'con': 'Constitution',
            'int': 'Intelligence',
            'wis': 'Wisdom',
            'cha': 'Charisma'
        };
        const abilityName = abilityNames[ability] || ability.toUpperCase();

        // Import DiceRoller and open window with automatic 1d20 + modifier roll
        import('../../components/dice-roller/DiceRoller.js').then(module => {
            const DiceRoller = module.DiceRoller;

            // Open dice roller and execute 1d20 + modifier roll
            DiceRoller.showAndRoll({
                multiplier: 1,
                diceType: 20,
                modifier: modifier,
                damageType: `${abilityName} Check`,
                formula: `1d20${modifier >= 0 ? '+' : ''}${modifier}`
            });

            console.log(`🎲 Rolling ${abilityName} check: 1d20${modifier >= 0 ? '+' : ''}${modifier}`);
        });
    }

    /**
     * Handle saving throw roll from stat block
     * @param {HTMLElement} target - The saving throw cell that was clicked
     */
    static handleRollSavingThrow(target) {
        const ability = target.getAttribute('data-ability');
        const modifier = parseInt(target.getAttribute('data-modifier')) || 0;

        // Format ability name for display
        const abilityNames = {
            'str': 'Strength',
            'dex': 'Dexterity',
            'con': 'Constitution',
            'int': 'Intelligence',
            'wis': 'Wisdom',
            'cha': 'Charisma'
        };
        const abilityName = abilityNames[ability] || ability.toUpperCase();

        // Import DiceRoller and open window with automatic 1d20 + modifier roll
        import('../../components/dice-roller/DiceRoller.js').then(module => {
            const DiceRoller = module.DiceRoller;

            // Open dice roller and execute 1d20 + modifier roll
            DiceRoller.showAndRoll({
                multiplier: 1,
                diceType: 20,
                modifier: modifier,
                damageType: `${abilityName} Save`,
                formula: `1d20${modifier >= 0 ? '+' : ''}${modifier}`
            });

            console.log(`🎲 Rolling ${abilityName} save: 1d20${modifier >= 0 ? '+' : ''}${modifier}`);
        });
    }

    /**
     * Handle skill check roll from stat block
     * @param {HTMLElement} target - The skill check cell that was clicked
     */
    static handleRollSkillCheck(target) {
        const skill = target.getAttribute('data-skill');
        const modifier = parseInt(target.getAttribute('data-modifier')) || 0;

        // Import DiceRoller and open window with automatic 1d20 + modifier roll
        import('../../components/dice-roller/DiceRoller.js').then(module => {
            const DiceRoller = module.DiceRoller;

            // Capitalize skill name for display
            const skillName = skill.charAt(0).toUpperCase() + skill.slice(1);

            // Open dice roller and execute 1d20 + modifier roll
            DiceRoller.showAndRoll({
                multiplier: 1,
                diceType: 20,
                modifier: modifier,
                damageType: `${skillName}`,
                formula: `1d20${modifier >= 0 ? '+' : ''}${modifier}`
            });

            console.log(`🎲 Rolling ${skillName} check: 1d20${modifier >= 0 ? '+' : ''}${modifier}`);
        });
    }

    /**
     * Handle initiative roll from stat block
     * @param {HTMLElement} target - The initiative cell that was clicked
     */
    static handleRollCreatureInitiative(target) {
        const creatureId = target.getAttribute('data-creature-id');
        const modifier = parseInt(target.getAttribute('data-modifier')) || 0;

        if (!creatureId) {
            ToastSystem.show('Creature ID not found', 'error', TIMING.TOAST_SHORT);
            return;
        }

        // Check if this creature is in the encounter
        const allCombatants = DataServices.combatantManager.getAllCombatants();
        const combatant = allCombatants.find(c => c.creatureId === creatureId);

        if (!combatant) {
            ToastSystem.show('This creature is not in the encounter', 'warning', 2500);
            return;
        }

        // Roll initiative: 1d20 + modifier
        const roll = Math.floor(Math.random() * 20) + 1;
        const total = roll + modifier;

        // Update combatant initiative
        DataServices.combatantManager.updateCombatant(combatant.id, 'initiative', total);

        // Sort and render
        DataServices.combatantManager.sortCombatants();
        DataServices.combatantManager.renderAll();

        // Show result
        ToastSystem.show(
            `${combatant.name}: ${roll} (d20) + ${modifier} (INIT) = ${total}`,
            'success',
            3000
        );

        // Close the creature database modal if it's open
        const modal = document.querySelector('[data-modal="creature-database"]');
        if (modal && modal.style.display !== 'none') {
            ModalSystem.hide('creature-database');
        }

        console.log(`🎲 Rolled initiative for ${combatant.name}: 1d20${modifier >= 0 ? '+' : ''}${modifier} = ${total}`);
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

    static handleToggleBatchSelect(target, event) {
        CombatantEvents.handleToggleBatchSelect(target, event);
    }

    /**
     * Open Quick Initiative modal (forwarding to InitiativeEvents)
     * @param {HTMLElement} initiativeDisplay - The initiative display element
     */
    static handleQuickInitiative(initiativeDisplay) {
        InitiativeEvents.openQuickInitiativeModal(initiativeDisplay);
    }

    /**
     * Handle roll initiative for single combatant
     */
    static handleRollInitSingle() {
        const modal = document.querySelector('[data-modal="quick-initiative"]');
        if (!modal) return;

        const hiddenField = modal.querySelector('#quick-init-combatant-id');
        const combatantId = hiddenField?.value;

        if (!combatantId) {
            ToastSystem.show('No combatant selected', 'error', TIMING.TOAST_SHORT);
            return;
        }

        InitiativeManagerEvents.handleRollInitiativeSingle(combatantId);
    }

    /**
     * Handle apply custom initiative for single combatant
     */
    static handleApplyCustomInitSingle() {
        const modal = document.querySelector('[data-modal="quick-initiative"]');
        if (!modal) return;

        const hiddenField = modal.querySelector('#quick-init-combatant-id');
        const combatantId = hiddenField?.value;

        const customField = modal.querySelector('#custom-initiative-value');
        const customValue = customField?.value;

        if (!combatantId) {
            ToastSystem.show('No combatant selected', 'error', TIMING.TOAST_SHORT);
            return;
        }

        InitiativeManagerEvents.handleApplyCustomInitiativeSingle(combatantId, customValue);
    }

    /**
     * Handle apply custom initiative for selected combatants
     */
    static handleApplyCustomInitSelected() {
        const modal = document.querySelector('[data-modal="quick-initiative"]');
        if (!modal) return;

        const customField = modal.querySelector('#custom-initiative-value');
        const customValue = customField?.value;

        InitiativeManagerEvents.handleApplyCustomInitiativeSelected(customValue);
    }

    static handleClearCondition(target) {
        CombatantEvents.handleClearCondition(target);
    }

    static handleClearEffect(target) {
        CombatantEvents.handleClearEffect(target);
    }

    static handleClearTimer(target) {
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

        // Clear the timer
        combatant.timer = null;
        DataServices.combatantManager.updateCombatant(combatantId, 'timer', null);

        ToastSystem.show(`Timer cleared for ${combatant.name}`, 'success', TIMING.TOAST_SHORT);

        // Update combat header if this is the active combatant
        if (combatant.status.isActive) {
            CombatEvents.updateCombatHeader();
        }
    }

    /**
     * Handle parsing a stat block from text
     * @param {HTMLElement} target - The button that was clicked
     */
    static handleParseStatBlock(target) {
        const statBlockText = document.getElementById('stat-block-text')?.value;
        const sourceFormat = document.getElementById('stat-block-source')?.value;
        const creatureType = document.getElementById('stat-block-creature-type')?.value || 'enemy';

        if (!statBlockText || statBlockText.trim() === '') {
            ToastSystem.show('Please paste a stat block first', 'warning', TIMING.TOAST_SHORT);
            return;
        }

        try {
            // Parse the stat block
            const parsedCreature = StatBlockParser.parse(statBlockText, sourceFormat);

            // Add creature type to parsed creature
            parsedCreature.type = creatureType;

            // Display preview
            CreatureHandlers.displayStatBlockPreview(parsedCreature);

            // Show import button
            const importButton = document.getElementById('import-parsed-creature');
            if (importButton) {
                importButton.style.display = 'block';
                // Store parsed data on button for later import
                importButton.dataset.parsedCreature = JSON.stringify(parsedCreature);
            }

            // Hide errors
            const errorDiv = document.getElementById('stat-block-errors');
            if (errorDiv) errorDiv.style.display = 'none';

            ToastSystem.show('Stat block parsed successfully!', 'success', TIMING.TOAST_SHORT);
        } catch (error) {
            console.error('Error parsing stat block:', error);

            // Show error
            const errorDiv = document.getElementById('stat-block-errors');
            if (errorDiv) {
                errorDiv.innerHTML = `<p class="error-message"><strong>Error:</strong> ${error.message}</p>`;
                errorDiv.style.display = 'block';
            }

            ToastSystem.show('Failed to parse stat block', 'error', TIMING.TOAST_LONG);
        }
    }

    // Note: Stat block parsing has been moved to StatBlockParser module
    // See src/scripts/parsers/stat-block-parser.js

    static setupCombatControls() {
        // Combat controls use the action-based routing system (data-action attributes)
        // No additional setup needed - all handled by event delegation
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

    /**
     * Handle editing an existing condition
     * @param {HTMLElement} target - The condition name element that was clicked
     */
    static async handleEditCondition(target) {
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');

        if (!combatantId) {
            console.error('No combatant ID found');
            return;
        }

        // Get condition data from the clicked element
        const conditionData = {
            name: target.getAttribute('data-condition-name'),
            duration: target.getAttribute('data-condition-duration'),
            note: target.getAttribute('data-condition-note'),
            expiresAt: target.getAttribute('data-condition-expires-at') || 'start'
        };

        // Get the combatant
        const combatant = DataServices.combatantManager?.getCombatant(combatantId);
        if (!combatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }

        // Show the modal FIRST (loads it if not already loaded)
        await ModalSystem.show('condition');

        // Now query for the modal (it should exist after show())
        const modal = document.querySelector('[data-modal="condition"]');
        if (modal) {
            // Set the target combatant
            modal.setAttribute('data-current-target', combatantId);

            // Set editing mode - track the original condition name
            modal.setAttribute('data-editing-mode', 'true');
            modal.setAttribute('data-editing-original-name', conditionData.name);

            const targetNameEl = modal.querySelector('[data-target-name]');
            if (targetNameEl) {
                targetNameEl.textContent = combatant.name;
            }

            // Pre-populate the modal with existing data
            ModalEvents.prePopulateConditionModal(modal, conditionData);

            console.log(`✏️ Editing condition "${conditionData.name}" for ${combatant.name}`);
        }
    }

    /**
     * Handle editing an existing effect
     * @param {HTMLElement} target - The effect name element that was clicked
     */
    static async handleEditEffect(target) {
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');

        if (!combatantId) {
            console.error('No combatant ID found');
            return;
        }

        // Get effect data from the clicked element
        const effectData = {
            name: target.getAttribute('data-effect-name'),
            duration: target.getAttribute('data-effect-duration'),
            note: target.getAttribute('data-effect-note'),
            expiresAt: target.getAttribute('data-effect-expires-at') || 'start'
        };

        // Get the combatant
        const combatant = DataServices.combatantManager?.getCombatant(combatantId);
        if (!combatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }

        // Show the modal FIRST (loads it if not already loaded)
        await ModalSystem.show('effect');

        // Now query for the modal (it should exist after show())
        const modal = document.querySelector('[data-modal="effect"]');
        if (modal) {
            // Set the target combatant
            modal.setAttribute('data-current-target', combatantId);

            // Set editing mode - track the original effect name
            modal.setAttribute('data-editing-mode', 'true');
            modal.setAttribute('data-editing-original-name', effectData.name);

            const targetNameEl = modal.querySelector('[data-target-name]');
            if (targetNameEl) {
                targetNameEl.textContent = combatant.name;
            }

            // Pre-populate the modal with existing data
            ModalEvents.prePopulateEffectModal(modal, effectData);

            console.log(`✏️ Editing effect "${effectData.name}" for ${combatant.name}`);
        }
    }

    /**
     * Handle editing a timer by clicking on the timer badge
     * @param {HTMLElement} target - The timer name element that was clicked
     */
    static async handleEditTimer(target) {
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');

        if (!combatantId) {
            console.error('No combatant ID found');
            return;
        }

        // Get the combatant
        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant || !combatant.timer) {
            console.error('Combatant or timer not found');
            return;
        }

        // Show the modal FIRST (loads it if not already loaded)
        await ModalSystem.show('placeholder-timer');

        // Now query for the modal (it should exist after show())
        const modal = document.querySelector('[data-modal="placeholder-timer"]');
        if (modal) {
            // Set the target combatant
            modal.setAttribute('data-current-target', combatantId);
            const targetNameEl = modal.querySelector('[data-target-name]');
            if (targetNameEl) {
                targetNameEl.textContent = combatant.name;
            }

            // Pre-populate the modal with existing timer data
            const turnsInput = modal.querySelector('#timer-turns');
            const noteInput = modal.querySelector('#timer-note');
            const infinityBtn = modal.querySelector('[data-toggle-target="timer-turns"]');
            const expiresAtRadios = modal.querySelectorAll('input[name="expiresAt"]');

            if (combatant.timer.duration === 'infinite') {
                if (infinityBtn) {
                    infinityBtn.classList.add('active');
                    infinityBtn.setAttribute('data-infinity-state', 'true');
                }
                if (turnsInput) {
                    turnsInput.type = 'text';  // Change to text to allow "infinite" string
                    turnsInput.value = 'infinite';
                    turnsInput.readOnly = true;
                }
            } else {
                if (infinityBtn) {
                    infinityBtn.classList.remove('active');
                    infinityBtn.setAttribute('data-infinity-state', 'false');
                }
                if (turnsInput) {
                    turnsInput.type = 'number';  // Restore number input
                    turnsInput.value = combatant.timer.duration;
                    turnsInput.readOnly = false;
                }
            }

            if (noteInput) {
                noteInput.value = combatant.timer.note || '';
            }

            // Set the expiresAt radio button (default to 'start' for legacy timers)
            const expiresAt = combatant.timer.expiresAt || 'start';
            expiresAtRadios.forEach(radio => {
                radio.checked = (radio.value === expiresAt);
            });

            console.log(`✏️ Editing timer for ${combatant.name}`);
        }
    }

    /**
     * Handle clicking a dice notation link in a stat block
     * Opens the dice roller and automatically performs the roll
     * @param {HTMLElement} target - The clicked dice link element
     */
    static handleRollDiceFromStatBlock(target) {
        try {
            // Extract roll data from the clicked element
            const rollData = DiceLinkConverter.extractRollData(target);

            console.log('🎲 Rolling dice from stat block:', rollData);

            // Open dice roller and execute the roll
            DiceRoller.showAndRoll(rollData);

            // Show toast notification
            const formula = rollData.formula || `${rollData.multiplier}d${rollData.diceType}`;
            const damageType = rollData.damageType ? ` (${rollData.damageType})` : '';
            ToastSystem.show(`Rolling ${formula}${damageType}`, 'info', 1500);
        } catch (error) {
            console.error('Failed to roll dice from stat block:', error);
            ToastSystem.show('Failed to execute roll', 'error', TIMING.TOAST_SHORT);
        }
    }

    /**
     * Handle importing creature database from JSON file
     */
    static async handleImportCreatureDatabase() {
        try {
            // Create file input
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json';

            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const success = await CreatureService.importDatabase(file);

                if (success) {
                    // Reload creature database in CombatantManager
                    if (DataServices.combatantManager) {
                        await DataServices.combatantManager.loadCreatureDatabase();
                    }

                    // Refresh the compendium modal if it's open
                    const modal = document.querySelector('[data-modal="creature-database"]');
                    if (modal && modal.style.display !== 'none') {
                        CreatureModalEvents.setupCreatureDatabaseModal(modal);
                        CreatureModalEvents.updateCreatureDatabaseFileStatus(modal);
                    }
                }
            };

            // Trigger file picker
            input.click();
        } catch (error) {
            console.error('❌ Error importing creature database:', error);
            ToastSystem.show('Failed to import database: ' + error.message, 'error', TIMING.TOAST_LONG);
        }
    }

    /**
     * Handle exporting creature database to JSON file
     */
    static async handleExportCreatureDatabase() {
        try {
            const success = await CreatureService.exportDatabase();

            if (success) {
                // Update file status indicator
                const modal = document.querySelector('[data-modal="creature-database"]');
                if (modal) {
                    CreatureModalEvents.updateCreatureDatabaseFileStatus(modal);
                }
            }
        } catch (error) {
            console.error('❌ Error exporting creature database:', error);
            ToastSystem.show('Failed to export database: ' + error.message, 'error', TIMING.TOAST_LONG);
        }
    }

    /**
     * Handle resetting creature database to base version
     */
    static async handleResetCreatureDatabase() {
        try {
            const success = await CreatureService.resetToBase();

            if (success) {
                // Reload creature database in CombatantManager
                if (DataServices.combatantManager) {
                    await DataServices.combatantManager.loadCreatureDatabase();
                }

                // Refresh the compendium modal if it's open
                const modal = document.querySelector('[data-modal="creature-database"]');
                if (modal && modal.style.display !== 'none') {
                    CreatureModalEvents.setupCreatureDatabaseModal(modal);
                    CreatureModalEvents.updateCreatureDatabaseFileStatus(modal);
                }
            }
        } catch (error) {
            console.error('❌ Error resetting creature database:', error);
            ToastSystem.show('Failed to reset database: ' + error.message, 'error', TIMING.TOAST_LONG);
        }
    }
}