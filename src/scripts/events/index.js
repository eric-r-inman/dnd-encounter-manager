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
                this.handleSearchCreatures(target, event);
            }
        });

        // Change event delegation for filters and selects
        document.addEventListener('change', (event) => {
            const target = event.target;
            const action = target.getAttribute('data-action');
            if (action === 'filter-creature-type') {
                this.handleFilterCreatureType(target);
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
            case 'batch-condition':
                this.handleBatchCondition(target);
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
                this.handleToggleBatchSelect(target, event);
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
            case 'add-new-creature':
                this.handleAddNewCreature();
                break;
            case 'add-creature-to-encounter':
                this.handleAddCreatureToEncounter(target);
                break;
            case 'search-creatures':
                this.handleSearchCreatures(target, event);
                break;
            case 'filter-creature-type':
                this.handleFilterCreatureType(target);
                break;
            case 'edit-creature':
                this.handleEditCreature(target);
                break;
            case 'delete-creature':
                this.handleDeleteCreature(target);
                break;
            case 'duplicate-creature':
                this.handleDuplicateCreature(target);
                break;
            case 'export-creature':
                this.handleExportCreature(target);
                break;
            case 'import-creature':
                this.handleImportCreature();
                break;
            case 'parse-stat-block':
                this.handleParseStatBlock(target);
                break;
            case 'import-parsed-creature':
                this.handleImportParsedCreature(target);
                break;
            case 'view-creature-stat-block':
                this.handleViewCreatureStatBlock(target);
                break;
            case 'add-custom-section':
                CreatureModalEvents.addCustomSectionRowWithData();
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

        try {
            // Generate default filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const defaultFileName = `encounter-${timestamp}.json`;

            // Prepare encounter data for export
            const encounterData = {
                name: '', // Will be filled from filename
                timestamp: new Date().toISOString(),
                version: '1.0',
                combatants: allCombatants.map(combatant => ({
                    creatureId: combatant.creatureId,
                    instanceData: combatant
                }))
            };

            // Convert to JSON
            const jsonString = JSON.stringify(encounterData, null, 2);

            // Check if File System Access API is supported
            if ('showSaveFilePicker' in window) {
                try {
                    // Use File System Access API to show save dialog
                    const fileHandle = await window.showSaveFilePicker({
                        suggestedName: defaultFileName,
                        types: [{
                            description: 'JSON Files',
                            accept: { 'application/json': ['.json'] }
                        }]
                    });

                    // Get the filename from the file handle
                    const savedFileName = fileHandle.name.replace('.json', '');
                    encounterData.name = savedFileName;

                    // Update JSON with the actual filename
                    const updatedJsonString = JSON.stringify(encounterData, null, 2);

                    // Write the file
                    const writable = await fileHandle.createWritable();
                    await writable.write(updatedJsonString);
                    await writable.close();

                    ToastSystem.show(`Encounter saved successfully!`, 'success', 3000);
                    console.log(`✅ Saved encounter: ${savedFileName}`);
                } catch (err) {
                    // User cancelled the save dialog
                    if (err.name === 'AbortError') {
                        ToastSystem.show('Save cancelled', 'info', 2000);
                    } else {
                        throw err;
                    }
                }
            } else {
                // Fallback to traditional download method
                encounterData.name = defaultFileName.replace('.json', '');
                const updatedJsonString = JSON.stringify(encounterData, null, 2);
                const blob = new Blob([updatedJsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = defaultFileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                ToastSystem.show(`Encounter saved successfully!`, 'success', 3000);
                console.log(`✅ Saved encounter: ${defaultFileName}`);
            }
        } catch (error) {
            console.error('❌ Error saving encounter:', error);
            ToastSystem.show('Failed to save encounter: ' + error.message, 'error', 4000);
        }
    }

    static async handleLoadEncounter() {
        // Create file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';

        fileInput.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) {
                ToastSystem.show('No file selected', 'info', 2000);
                return;
            }

            try {
                // Read the file
                const fileContent = await file.text();
                const encounterData = JSON.parse(fileContent);

                // Validate encounter data structure
                if (!encounterData.name || !encounterData.combatants || !Array.isArray(encounterData.combatants)) {
                    ToastSystem.show('Invalid encounter file format', 'error', 3000);
                    return;
                }

                // Confirm if there are existing combatants
                const currentCombatants = DataServices.combatantManager.getAllCombatants();
                if (currentCombatants.length > 0) {
                    const confirmReplace = confirm(`This will replace the current encounter with ${currentCombatants.length} combatants. Continue?`);
                    if (!confirmReplace) {
                        ToastSystem.show('Load cancelled', 'info', 2000);
                        return;
                    }
                }

                // Get all available creatures from compendium
                const allCreatures = DataServices.combatantManager?.creatureDatabase || [];
                const creatureIds = new Set(allCreatures.map(c => c.id));

                // Validate which combatants can be loaded
                const validCombatants = [];
                const missingCreatures = [];

                encounterData.combatants.forEach(combatantData => {
                    const creatureId = combatantData.creatureId;
                    if (creatureIds.has(creatureId)) {
                        validCombatants.push(combatantData);
                    } else {
                        // Find creature name from saved data if available
                        const creatureName = combatantData.instanceData?.name || creatureId;
                        missingCreatures.push(creatureName);
                    }
                });

                // Clear current encounter
                DataServices.combatantManager.clearAll();

                // Load valid combatants
                validCombatants.forEach(combatantData => {
                    DataServices.combatantManager.addCombatant(combatantData.creatureId, combatantData.instanceData);
                });

                // Show results
                const loadedCount = validCombatants.length;
                const missingCount = missingCreatures.length;

                if (missingCount > 0) {
                    // Alert about missing creatures
                    const missingList = missingCreatures.join('\n- ');
                    alert(`⚠️ Encounter loaded with ${loadedCount} combatant(s).\n\nThe following ${missingCount} creature(s) could not be loaded because they are not in the Compendium:\n\n- ${missingList}`);

                    console.warn('❌ Missing creatures:', missingCreatures);
                }

                ToastSystem.show(`Loaded encounter: ${encounterData.name} (${loadedCount} combatants)`, 'success', 3000);
                console.log(`✅ Loaded encounter: ${encounterData.name} with ${loadedCount} combatants`);

            } catch (error) {
                console.error('❌ Error loading encounter:', error);
                if (error instanceof SyntaxError) {
                    ToastSystem.show('Invalid JSON file', 'error', 3000);
                } else {
                    ToastSystem.show('Failed to load encounter: ' + error.message, 'error', 4000);
                }
            }
        };

        // Trigger file picker
        fileInput.click();
    }

    static handleQuickViewCreature() {
        // Get the active combatant (whose turn it is)
        const allCombatants = DataServices.combatantManager.getAllCombatants();
        const activeCombatant = allCombatants.find(c => c.status.isActive);

        if (!activeCombatant) {
            ToastSystem.show('No active creature in combat', 'info', 2000);
            // Still open the modal, but without a selected creature
            const trigger = document.createElement('div');
            ModalEvents.handleModalShow('creature-database', trigger);
            return;
        }

        // Get the creature ID from the active combatant
        const creatureId = activeCombatant.creatureId;

        if (!creatureId) {
            ToastSystem.show('Active combatant has no creature ID', 'warning', 2000);
            const trigger = document.createElement('div');
            ModalEvents.handleModalShow('creature-database', trigger);
            return;
        }

        // Store the creature ID to be selected when modal opens
        const trigger = document.createElement('div');
        trigger.setAttribute('data-selected-creature-id', creatureId);

        console.log(`🔍 Quick View: Opening compendium modal for active creature: ${activeCombatant.name} (${creatureId})`);

        ModalEvents.handleModalShow('creature-database', trigger);
    }

    static handleOpenCreatureDatabase() {
        // Create a temporary trigger element to properly initialize modal
        const trigger = document.createElement('div');
        ModalEvents.handleModalShow('creature-database', trigger);
    }

    static handleViewCreatureStatBlock(target) {
        // Get the creature ID from the clicked element
        const creatureId = target.getAttribute('data-creature-id');

        if (!creatureId) {
            ToastSystem.show('No creature information available', 'info', 2000);
            return;
        }

        // Display the creature stat block in the right pane
        CreatureModalEvents.displayCreatureInRightPane(creatureId);
    }

    static handleImportStatBlock() {
        ModalSystem.show('stat-block-parser');
    }

    static handleAddNewCreature() {
        ModalSystem.show('creature-form');
    }

    /**
     * Handle adding a creature from the database to the current encounter
     * @param {HTMLElement} target - The button that was clicked
     */
    static handleAddCreatureToEncounter(target) {
        const creatureId = target.getAttribute('data-creature-id');
        if (!creatureId) {
            console.error('No creature ID found on target');
            return;
        }

        try {
            // Add the creature to the encounter
            const combatantCard = DataServices.combatantManager.addCombatant(creatureId);

            if (combatantCard) {
                ToastSystem.show(`Added ${combatantCard.name} to encounter`, 'success', 2000);

                // Close the creature database modal
                ModalSystem.hide('creature-database');

                console.log(`✅ Added creature ${creatureId} to encounter`);
            } else {
                ToastSystem.show('Failed to add creature to encounter', 'error', 3000);
            }
        } catch (error) {
            console.error('Error adding creature to encounter:', error);
            ToastSystem.show('Failed to add creature: ' + error.message, 'error', 3000);
        }
    }

    /**
     * Handle search input in creature database
     * @param {HTMLElement} target - The search input element
     * @param {Event} event - The input event
     */
    static handleSearchCreatures(target, event) {
        const searchTerm = target.value.toLowerCase().trim();
        const modal = target.closest('[data-modal="creature-database"]');
        if (!modal) return;

        const creatureItems = modal.querySelectorAll('.creature-list-item');
        const visibleCountElement = modal.querySelector('#visible-count');
        let visibleCount = 0;

        creatureItems.forEach(item => {
            const creatureName = item.querySelector('.creature-name')?.textContent.toLowerCase() || '';
            const creatureType = item.querySelector('.creature-type-badge')?.textContent.toLowerCase() || '';
            const creatureStats = item.querySelector('.creature-item-stats')?.textContent.toLowerCase() || '';

            // Check if search term matches name, type, or stats (AC, HP, CR)
            const matches = creatureName.includes(searchTerm) ||
                          creatureType.includes(searchTerm) ||
                          creatureStats.includes(searchTerm);

            if (matches || searchTerm === '') {
                item.style.display = '';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });

        // Update visible count
        if (visibleCountElement) {
            visibleCountElement.textContent = visibleCount;
        }

        console.log(`🔍 Search: "${searchTerm}" - ${visibleCount} creatures visible`);
    }

    /**
     * Handle type filter dropdown in creature database
     * @param {HTMLElement} target - The select element
     */
    static handleFilterCreatureType(target) {
        const filterType = target.value.toLowerCase();
        const modal = target.closest('[data-modal="creature-database"]');
        if (!modal) return;

        const creatureItems = modal.querySelectorAll('.creature-list-item');
        const visibleCountElement = modal.querySelector('#visible-count');
        let visibleCount = 0;

        creatureItems.forEach(item => {
            const creatureTypeBadge = item.querySelector('.creature-type-badge');
            const creatureType = creatureTypeBadge?.textContent.toLowerCase() || '';

            // Show all if "all" is selected, otherwise filter by type
            if (filterType === 'all' || creatureType === filterType) {
                item.style.display = '';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });

        // Update visible count
        if (visibleCountElement) {
            visibleCountElement.textContent = visibleCount;
        }

        console.log(`🎯 Filter: "${filterType}" - ${visibleCount} creatures visible`);
    }

    /**
     * Handle editing a creature from the database
     * @param {HTMLElement} target - The edit button
     */
    static handleEditCreature(target) {
        try {
            const modal = target.closest('[data-modal="creature-database"]');
            if (!modal) {
                console.error('❌ Edit creature: Modal not found');
                return;
            }

            const creatureId = modal.getAttribute('data-selected-creature-id');
            if (!creatureId) {
                ToastSystem.show('Please select a creature first', 'warning', 2000);
                return;
            }

            console.log(`📝 Editing creature: ${creatureId}`);

            // Get creature from consolidated database
            const allCreatures = DataServices.combatantManager?.creatureDatabase || [];
            const creature = allCreatures.find(c => c.id === creatureId);

            if (!creature) {
                console.error('❌ Creature not found:', creatureId);
                ToastSystem.show('Creature not found', 'error', 2000);
                return;
            }

            console.log('📝 Found creature:', creature.name);

            // Populate the creature form with existing data
            CreatureModalEvents.setupCreatureFormForEdit(creature);

            // Open the creature form modal
            ModalSystem.show('creature-form');

            console.log('✅ Edit creature form opened successfully');
        } catch (error) {
            console.error('❌ Error in handleEditCreature:', error);
            console.error('Error stack:', error.stack);
            ToastSystem.show('Failed to open edit form: ' + error.message, 'error', 3000);
        }
    }

    /**
     * Handle deleting a creature from the database
     * @param {HTMLElement} target - The delete button
     */
    static async handleDeleteCreature(target) {
        const modal = target.closest('[data-modal="creature-database"]');
        if (!modal) return;

        const creatureId = modal.getAttribute('data-selected-creature-id');
        if (!creatureId) {
            ToastSystem.show('Please select a creature first', 'warning', 2000);
            return;
        }

        // Get creature from consolidated database
        const allCreatures = DataServices.combatantManager?.creatureDatabase || [];
        const creature = allCreatures.find(c => c.id === creatureId);

        if (!creature) {
            ToastSystem.show('Creature not found', 'error', 2000);
            return;
        }

        // Check if it's a custom creature
        const isCustom = creature.isCustom === true;

        // Confirm deletion
        const confirmDelete = confirm(`Are you sure you want to delete "${creature.name}"?`);
        if (!confirmDelete) {
            return;
        }

        try {
            if (isCustom) {
                // Remove custom creature from localStorage
                const customCreatures = JSON.parse(localStorage.getItem('dnd-custom-creatures') || '[]');
                const updatedCustomCreatures = customCreatures.filter(c => c.id !== creatureId);
                localStorage.setItem('dnd-custom-creatures', JSON.stringify(updatedCustomCreatures));

                // Reload the consolidated database
                if (DataServices.combatantManager) {
                    await DataServices.combatantManager.loadCreatureDatabase();
                }
            } else {
                // For database creatures, add to hidden list
                const hiddenCreatures = JSON.parse(localStorage.getItem('dnd-hidden-creatures') || '[]');
                if (!hiddenCreatures.includes(creatureId)) {
                    hiddenCreatures.push(creatureId);
                    localStorage.setItem('dnd-hidden-creatures', JSON.stringify(hiddenCreatures));
                }

                // Reload the consolidated database to apply hidden filter
                if (DataServices.combatantManager) {
                    await DataServices.combatantManager.loadCreatureDatabase();
                }
            }

            ToastSystem.show(`Deleted: ${creature.name}`, 'success', 2000);
            console.log(`✅ Deleted creature: ${creature.name}`);

            // Refresh the compendium to show updated list
            CreatureModalEvents.setupCreatureDatabaseModal(modal);

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
            ToastSystem.show('Failed to delete creature: ' + error.message, 'error', 3000);
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
        if (!creatureId) {
            ToastSystem.show('Please select a creature first', 'warning', 2000);
            return;
        }

        // Get creature from consolidated database
        const allCreatures = DataServices.combatantManager?.creatureDatabase || [];
        const creature = allCreatures.find(c => c.id === creatureId);

        if (!creature) {
            ToastSystem.show('Creature not found', 'error', 2000);
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

            // Mark as custom creature
            duplicate.isCustom = true;

            // Add to custom creatures in localStorage
            const customCreatures = JSON.parse(localStorage.getItem('dnd-custom-creatures') || '[]');
            customCreatures.push(duplicate);
            localStorage.setItem('dnd-custom-creatures', JSON.stringify(customCreatures));

            // Reload the consolidated database
            if (DataServices.combatantManager) {
                await DataServices.combatantManager.loadCreatureDatabase();
            }

            ToastSystem.show(`Duplicated: ${duplicate.name}`, 'success', 2000);
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
            ToastSystem.show('Failed to duplicate creature: ' + error.message, 'error', 3000);
        }
    }

    /**
     * Handle exporting a creature as JSON
     * @param {HTMLElement} target - The export button
     */
    static handleExportCreature(target) {
        const modal = target.closest('[data-modal="creature-database"]');
        if (!modal) return;

        const creatureId = modal.getAttribute('data-selected-creature-id');
        if (!creatureId) {
            ToastSystem.show('Please select a creature first', 'warning', 2000);
            return;
        }

        // Get creature from database
        const allCreatures = DataServices.combatantManager?.creatureDatabase || [];
        const creature = allCreatures.find(c => c.id === creatureId);

        if (!creature) {
            ToastSystem.show('Creature not found', 'error', 2000);
            return;
        }

        try {
            // Convert creature to JSON
            const jsonString = JSON.stringify(creature, null, 2);

            // Create blob and download
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            // Create download link
            const a = document.createElement('a');
            a.href = url;
            a.download = `${creature.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`;

            // Trigger download
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Clean up
            URL.revokeObjectURL(url);

            ToastSystem.show(`Exported ${creature.name}`, 'success', 2000);
            console.log(`✅ Exported creature: ${creature.name}`);
        } catch (error) {
            console.error('❌ Error exporting creature:', error);
            ToastSystem.show('Failed to export creature: ' + error.message, 'error', 3000);
        }
    }

    /**
     * Handle importing a creature from JSON file
     */
    static async handleImportCreature() {
        try {
            // Create file input
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json';

            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                try {
                    // Read file
                    const text = await file.text();
                    const creatureData = JSON.parse(text);

                    // Validate required fields
                    if (!creatureData.name || !creatureData.type || creatureData.ac === undefined || creatureData.maxHP === undefined) {
                        ToastSystem.show('Invalid creature file: missing required fields (name, type, AC, HP)', 'error', 4000);
                        return;
                    }

                    // Get existing creatures
                    const customCreatures = JSON.parse(localStorage.getItem('dnd-custom-creatures') || '[]');

                    // Check for name collision and auto-rename if needed
                    let finalName = creatureData.name;
                    let finalId = creatureData.id || finalName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                    let counter = 1;

                    while (customCreatures.some(c => c.id === finalId)) {
                        counter++;
                        finalName = `${creatureData.name} (${counter})`;
                        finalId = finalName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                    }

                    // Update creature data with final name and ID
                    creatureData.name = finalName;
                    creatureData.id = finalId;
                    creatureData.isCustom = true;
                    creatureData.source = creatureData.source || 'Imported';

                    // Add to custom creatures
                    customCreatures.push(creatureData);
                    localStorage.setItem('dnd-custom-creatures', JSON.stringify(customCreatures));

                    // Reload database
                    if (DataServices.combatantManager) {
                        await DataServices.combatantManager.loadCreatureDatabase();
                    }

                    // Refresh the compendium modal if open
                    const modal = document.querySelector('[data-modal="creature-database"]');
                    if (modal) {
                        CreatureModalEvents.setupCreatureDatabaseModal(modal);

                        // Auto-select the imported creature
                        setTimeout(() => {
                            const creatureItem = modal.querySelector(`.creature-list-item[data-creature-id="${finalId}"]`);
                            if (creatureItem) {
                                creatureItem.click();
                                creatureItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            }
                        }, 100);
                    }

                    const wasRenamed = counter > 1;
                    const message = wasRenamed
                        ? `Imported as "${finalName}" (renamed to avoid collision)`
                        : `Imported ${finalName}`;

                    ToastSystem.show(message, 'success', 3000);
                    console.log(`✅ Imported creature: ${finalName}`);

                } catch (parseError) {
                    console.error('❌ Error parsing creature file:', parseError);
                    ToastSystem.show('Failed to import: Invalid JSON file', 'error', 3000);
                }
            };

            // Trigger file picker
            input.click();

        } catch (error) {
            console.error('❌ Error importing creature:', error);
            ToastSystem.show('Failed to import creature: ' + error.message, 'error', 3000);
        }
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

    static handleBatchCondition(target) {
        const modal = target.closest('.modal-overlay');
        if (!modal) return;

        // Get form data
        const form = modal.querySelector('form');
        const formData = new FormData(form);

        const condition = formData.get('condition');
        const turns = formData.get('turns');
        const note = formData.get('note')?.trim() || '';

        // Validation
        if (!condition) {
            ToastSystem.show('Please select a condition', 'error', 2000);
            return;
        }

        // Get selected combatants
        const selectedCombatants = this.getSelectedCombatants();
        if (selectedCombatants.length === 0) {
            ToastSystem.show('No combatants selected', 'warning', 2000);
            return;
        }

        // Apply condition to all selected combatants
        let successCount = 0;
        selectedCombatants.forEach(combatant => {
            // Create a NEW condition object for each combatant (not shared reference)
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
        ToastSystem.show(`Applied ${condition} to ${successCount} combatant${successCount !== 1 ? 's' : ''}`, 'success', 3000);

        // Update combat header if any of the selected are active
        const hasActiveCombatant = selectedCombatants.some(c => c.status.isActive);
        if (hasActiveCombatant) {
            CombatEvents.updateCombatHeader();
        }
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

    static handleToggleBatchSelect(target, event) {
        CombatantEvents.handleToggleBatchSelect(target, event);
    }

    static handleClearCondition(target) {
        CombatantEvents.handleClearCondition(target);
    }

    static handleClearEffect(target) {
        CombatantEvents.handleClearEffect(target);
    }

    /**
     * Handle parsing a stat block from text
     * @param {HTMLElement} target - The button that was clicked
     */
    static handleParseStatBlock(target) {
        const statBlockText = document.getElementById('stat-block-text')?.value;
        const sourceFormat = document.getElementById('stat-block-source')?.value;

        if (!statBlockText || statBlockText.trim() === '') {
            ToastSystem.show('Please paste a stat block first', 'warning', 2000);
            return;
        }

        try {
            // Parse the stat block
            const parsedCreature = this.parseStatBlockText(statBlockText, sourceFormat);

            // Display preview
            this.displayStatBlockPreview(parsedCreature);

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

            ToastSystem.show('Stat block parsed successfully!', 'success', 2000);
        } catch (error) {
            console.error('Error parsing stat block:', error);

            // Show error
            const errorDiv = document.getElementById('stat-block-errors');
            if (errorDiv) {
                errorDiv.innerHTML = `<p style="color: var(--color-danger);"><strong>Error:</strong> ${error.message}</p>`;
                errorDiv.style.display = 'block';
            }

            ToastSystem.show('Failed to parse stat block', 'error', 3000);
        }
    }

    /**
     * Parse stat block text into a creature object
     * @param {string} text - The stat block text
     * @param {string} format - The format (auto, dndbeyond, roll20, book)
     * @returns {Object} Parsed creature data
     */
    static parseStatBlockText(text, format = 'auto') {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        if (lines.length === 0) {
            throw new Error('Stat block is empty');
        }

        const creature = {
            id: '',
            name: '',
            type: 'enemy',
            ac: 10,
            maxHP: 1,
            cr: '0',
            size: null,
            race: null,
            subrace: null,
            alignment: null,
            description: null,
            source: 'Custom Import',
            hasFullStatBlock: true,
            statBlock: {
                damageResistances: [],
                damageImmunities: [],
                damageVulnerabilities: [],
                conditionImmunities: [],
                savingThrows: {},
                skills: {},
                traits: [],
                actions: [],
                reactions: [],
                legendaryActions: null,
                lairActions: null,
                regionalEffects: null,
                spellcasting: null
            }
        };

        // Extract name (first line)
        creature.name = lines[0];
        creature.id = creature.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        // Extract type/size/alignment (usually second line)
        if (lines.length > 1) {
            const typeLine = lines[1];
            const typeMatch = typeLine.match(/(Tiny|Small|Medium|Large|Huge|Gargantuan)?\s*([A-Za-z\s]+?)(?:,\s*(.+))?$/i);
            if (typeMatch) {
                creature.size = typeMatch[1] || null;
                creature.race = typeMatch[2]?.trim() || null;
                creature.alignment = typeMatch[3]?.trim() || null;
                creature.statBlock.fullType = typeLine;
            }
        }

        // D&D Beyond format uses abbreviated stat names
        let abilityData = {
            str: null, dex: null, con: null, int: null, wis: null, cha: null
        };
        let abilityMods = {
            str: null, dex: null, con: null, int: null, wis: null, cha: null
        };
        let savingThrows = {
            str: null, dex: null, con: null, int: null, wis: null, cha: null
        };

        // Parse remaining lines
        for (let i = 2; i < lines.length; i++) {
            const line = lines[i];

            // Skip empty lines and common headers
            if (!line || line === 'MOD' || line === 'SAVE' || line.match(/^(Actions|Traits|Bonus Actions|Reactions)$/i)) {
                continue;
            }

            // AC (D&D Beyond format: "AC 20" or "AC 20    Initiative +12 (22)")
            const acMatch = line.match(/^AC\s+(\d+)/i);
            if (acMatch) {
                creature.ac = parseInt(acMatch[1]);
                creature.statBlock.armorClass = {
                    value: creature.ac,
                    type: null
                };
                // Extract initiative if present
                const initMatch = line.match(/Initiative\s+([+-]?\d+)\s+\((\d+)\)/i);
                if (initMatch) {
                    creature.statBlock.initiative = {
                        modifier: parseInt(initMatch[1]),
                        total: parseInt(initMatch[2])
                    };
                }
                continue;
            }

            // HP (D&D Beyond format: "HP 333 (18d20 + 144)")
            const hpMatch = line.match(/^HP\s+(\d+)(?:\s+\(([^)]+)\))?/i);
            if (hpMatch) {
                creature.maxHP = parseInt(hpMatch[1]);
                creature.statBlock.hitPoints = {
                    average: creature.maxHP,
                    formula: hpMatch[2] || null
                };
                continue;
            }

            // Speed - more flexible regex
            const speedMatch = line.match(/^Speed\s+(.+?)(?:\s*$)/i);
            if (speedMatch) {
                const speedStr = speedMatch[1].trim();
                if (speedStr.length > 0) {
                    creature.statBlock.speed = this.parseSpeed(speedStr);
                }
                continue;
            }

            // D&D Beyond ability scores format (e.g., "STR    26    +8    +8")
            const abilityLineMatch = line.match(/^(STR|DEX|CON|INT|WIS|CHA)\s+(\d+)\s+([+-]?\d+)\s+([+-]?\d+)/i);
            if (abilityLineMatch) {
                const ability = abilityLineMatch[1].toLowerCase();
                abilityData[ability] = parseInt(abilityLineMatch[2]);
                abilityMods[ability] = parseInt(abilityLineMatch[3]);
                savingThrows[ability] = parseInt(abilityLineMatch[4]);
                continue;
            }

            // D&D Beyond multi-line ability format (ability name on one line, values on next lines)
            const abilityNameMatch = line.match(/^(STR|DEX|CON|INT|WIS|CHA)$/i);
            if (abilityNameMatch && i + 3 < lines.length) {
                const ability = abilityNameMatch[1].toLowerCase();
                const scoreLine = lines[i + 1];
                const modLine = lines[i + 2];
                const saveLine = lines[i + 3];

                // Check if next lines are numbers
                if (scoreLine.match(/^\d+$/) && modLine.match(/^[+-]?\d+$/) && saveLine.match(/^[+-]?\d+$/)) {
                    abilityData[ability] = parseInt(scoreLine);
                    abilityMods[ability] = parseInt(modLine);
                    savingThrows[ability] = parseInt(saveLine);
                    i += 3; // Skip the next 3 lines since we've processed them
                    continue;
                }
            }

            // Standard format ability scores (all on one line)
            const abilityMatch = line.match(/STR\s+(\d+)\s+\(([+-]?\d+)\)\s+DEX\s+(\d+)\s+\(([+-]?\d+)\)\s+CON\s+(\d+)\s+\(([+-]?\d+)\)\s+INT\s+(\d+)\s+\(([+-]?\d+)\)\s+WIS\s+(\d+)\s+\(([+-]?\d+)\)\s+CHA\s+(\d+)\s+\(([+-]?\d+)\)/i);
            if (abilityMatch) {
                abilityData = {
                    str: parseInt(abilityMatch[1]),
                    dex: parseInt(abilityMatch[3]),
                    con: parseInt(abilityMatch[5]),
                    int: parseInt(abilityMatch[7]),
                    wis: parseInt(abilityMatch[9]),
                    cha: parseInt(abilityMatch[11])
                };
                abilityMods = {
                    str: parseInt(abilityMatch[2]),
                    dex: parseInt(abilityMatch[4]),
                    con: parseInt(abilityMatch[6]),
                    int: parseInt(abilityMatch[8]),
                    wis: parseInt(abilityMatch[10]),
                    cha: parseInt(abilityMatch[12])
                };
                continue;
            }

            // Skills
            const skillsMatch = line.match(/^Skills\s+(.+)/i);
            if (skillsMatch) {
                const skillPairs = skillsMatch[1].split(',').map(s => s.trim());
                skillPairs.forEach(pair => {
                    const match = pair.match(/([A-Za-z\s]+)\s+([+-]?\d+)/);
                    if (match) {
                        const skillName = match[1].trim().replace(/\s+/g, '');
                        const skillBonus = parseInt(match[2]);
                        // Convert to camelCase
                        const camelSkill = skillName.charAt(0).toLowerCase() + skillName.slice(1);
                        creature.statBlock.skills[camelSkill] = skillBonus;
                    }
                });
                continue;
            }

            // Damage Immunities/Resistances/Vulnerabilities
            const immuneMatch = line.match(/^(?:Damage\s+)?Immunities\s+(.+)/i);
            if (immuneMatch) {
                creature.statBlock.damageImmunities = immuneMatch[1].split(',').map(s => s.trim());
                continue;
            }

            const resistMatch = line.match(/^(?:Damage\s+)?Resistances\s+(.+)/i);
            if (resistMatch) {
                creature.statBlock.damageResistances = resistMatch[1].split(',').map(s => s.trim());
                continue;
            }

            const vulnMatch = line.match(/^(?:Damage\s+)?Vulnerabilities\s+(.+)/i);
            if (vulnMatch) {
                creature.statBlock.damageVulnerabilities = vulnMatch[1].split(',').map(s => s.trim());
                continue;
            }

            // Senses
            const sensesMatch = line.match(/^Senses\s+(.+)/i);
            if (sensesMatch) {
                creature.statBlock.senses = this.parseSenses(sensesMatch[1]);
                continue;
            }

            // Languages
            const langMatch = line.match(/^Languages\s+(.+)/i);
            if (langMatch) {
                creature.statBlock.languages = langMatch[1].split(',').map(s => s.trim());
                continue;
            }

            // CR (D&D Beyond format: "CR 20 (XP 25,000, or 33,000 in lair; PB +6)")
            const crMatch = line.match(/^(?:Challenge|CR)\s+([\d/]+)(?:\s+\((?:XP\s+)?([0-9,]+))?(?:,\s*or\s+([0-9,]+)\s+in\s+lair)?(?:;\s*PB\s+\+?(\d+))?/i);
            if (crMatch) {
                creature.cr = crMatch[1];
                const xpStr = crMatch[2]?.replace(/,/g, '');
                const xpLairStr = crMatch[3]?.replace(/,/g, '');
                creature.statBlock.challengeRating = {
                    cr: creature.cr,
                    xp: xpStr ? parseInt(xpStr) : null,
                    xpInLair: xpLairStr ? parseInt(xpLairStr) : null,
                    proficiencyBonus: crMatch[4] ? parseInt(crMatch[4]) : null
                };
                continue;
            }
        }

        // Build abilities object from collected data
        if (abilityData.str !== null) {
            creature.statBlock.abilities = {
                str: { score: abilityData.str, modifier: abilityMods.str },
                dex: { score: abilityData.dex, modifier: abilityMods.dex },
                con: { score: abilityData.con, modifier: abilityMods.con },
                int: { score: abilityData.int, modifier: abilityMods.int },
                wis: { score: abilityData.wis, modifier: abilityMods.wis },
                cha: { score: abilityData.cha, modifier: abilityMods.cha }
            };

            // Add saving throws if we have them
            if (savingThrows.str !== null) {
                creature.statBlock.savingThrows = savingThrows;
            }
        }

        // Parse sections (Traits, Actions, Reactions, Legendary Actions, etc.)
        this.parseStatBlockSections(lines, creature);

        return creature;
    }

    /**
     * Parse special sections from stat block (Traits, Actions, etc.)
     * @param {Array} lines - Array of stat block lines
     * @param {Object} creature - Creature object to populate
     */
    static parseStatBlockSections(lines, creature) {
        let currentSection = null;
        let currentEntry = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Detect section headers
            if (line.match(/^Traits$/i)) {
                currentSection = 'traits';
                currentEntry = null;
                continue;
            } else if (line.match(/^Actions$/i)) {
                currentSection = 'actions';
                currentEntry = null;
                continue;
            } else if (line.match(/^Bonus Actions$/i)) {
                currentSection = 'bonusActions';
                currentEntry = null;
                continue;
            } else if (line.match(/^Reactions$/i)) {
                currentSection = 'reactions';
                currentEntry = null;
                continue;
            } else if (line.match(/^Legendary Actions$/i)) {
                currentSection = 'legendaryActions';
                currentEntry = null;
                // Initialize legendary actions object
                creature.statBlock.legendaryActions = {
                    description: '',
                    uses: 3,
                    usesInLair: 4,
                    options: []
                };
                continue;
            } else if (line.match(/^Lair Actions$/i)) {
                currentSection = 'lairActions';
                currentEntry = null;
                creature.statBlock.lairActions = {
                    description: '',
                    options: []
                };
                continue;
            } else if (line.match(/^Regional Effects$/i)) {
                currentSection = 'regionalEffects';
                currentEntry = null;
                creature.statBlock.regionalEffects = {
                    description: '',
                    effects: []
                };
                continue;
            }

            // Skip if no current section
            if (!currentSection) continue;

            // Parse legendary actions description
            if (currentSection === 'legendaryActions' && line.match(/Legendary Action Uses:/i)) {
                creature.statBlock.legendaryActions.description = line;
                const usesMatch = line.match(/(\d+)\s+\((\d+)\s+in\s+Lair\)/i);
                if (usesMatch) {
                    creature.statBlock.legendaryActions.uses = parseInt(usesMatch[1]);
                    creature.statBlock.legendaryActions.usesInLair = parseInt(usesMatch[2]);
                }
                continue;
            }

            // Detect entry start (bold text followed by period, typically "Name. Description")
            const entryMatch = line.match(/^([^.]+)\.\s*(.*)$/);
            if (entryMatch) {
                const entryName = entryMatch[1].trim();
                const entryDesc = entryMatch[2].trim();

                // Create new entry
                currentEntry = {
                    name: entryName,
                    description: entryDesc
                };

                // Add to appropriate section
                if (currentSection === 'traits') {
                    // Check for usage info in name
                    const usageMatch = entryName.match(/\(([^)]+)\)/);
                    if (usageMatch) {
                        currentEntry.usage = this.parseUsage(usageMatch[1]);
                    }
                    creature.statBlock.traits.push(currentEntry);
                } else if (currentSection === 'actions' || currentSection === 'bonusActions') {
                    // Parse action type
                    currentEntry.type = this.detectActionType(entryName, entryDesc);

                    // Parse attack details if present
                    this.parseAttackDetails(entryDesc, currentEntry);

                    creature.statBlock.actions.push(currentEntry);
                } else if (currentSection === 'reactions') {
                    creature.statBlock.reactions.push(currentEntry);
                } else if (currentSection === 'legendaryActions') {
                    // Check for cost
                    const costMatch = entryName.match(/\(Costs?\s+(\d+)\s+Actions?\)/i);
                    if (costMatch) {
                        currentEntry.cost = parseInt(costMatch[1]);
                    } else {
                        currentEntry.cost = 1;
                    }
                    creature.statBlock.legendaryActions.options.push(currentEntry);
                } else if (currentSection === 'lairActions') {
                    creature.statBlock.lairActions.options.push(currentEntry);
                } else if (currentSection === 'regionalEffects') {
                    creature.statBlock.regionalEffects.effects.push(currentEntry);
                }
            } else if (currentEntry && line.length > 0) {
                // Continue previous entry description
                currentEntry.description += ' ' + line;
            }
        }
    }

    /**
     * Parse usage information from text
     * @param {string} usageText - Usage text (e.g., "3/Day")
     * @returns {Object} Usage object
     */
    static parseUsage(usageText) {
        const perDayMatch = usageText.match(/(\d+)\/Day/i);
        if (perDayMatch) {
            return {
                type: 'perDay',
                amount: parseInt(perDayMatch[1])
            };
        }

        const rechargeMatch = usageText.match(/Recharge\s+([\d-]+)/i);
        if (rechargeMatch) {
            return {
                type: 'recharge',
                recharge: rechargeMatch[1]
            };
        }

        return null;
    }

    /**
     * Detect action type from name and description
     * @param {string} name - Action name
     * @param {string} description - Action description
     * @returns {string} Action type
     */
    static detectActionType(name, description) {
        if (name.toLowerCase().includes('multiattack')) {
            return 'multiattack';
        }

        if (description.match(/Melee\s+(Weapon\s+)?Attack/i)) {
            return 'melee';
        }

        if (description.match(/Ranged\s+(Weapon\s+)?Attack/i)) {
            return 'ranged';
        }

        return 'special';
    }

    /**
     * Parse attack details from description
     * @param {string} description - Action description
     * @param {Object} action - Action object to populate
     */
    static parseAttackDetails(description, action) {
        // Attack bonus
        const attackMatch = description.match(/Attack Roll:\s*([+-]?\d+)/i);
        if (attackMatch) {
            action.attackBonus = parseInt(attackMatch[1]);
        }

        // Reach
        const reachMatch = description.match(/reach\s+(\d+)\s*ft/i);
        if (reachMatch) {
            action.reach = `${reachMatch[1]} ft.`;
        }

        // Range
        const rangeMatch = description.match(/range\s+(\d+(?:\/\d+)?)\s*ft/i);
        if (rangeMatch) {
            action.range = `${rangeMatch[1]} ft.`;
        }

        // Damage
        const damageMatch = description.match(/Hit:\s*(\d+)\s*\(([^)]+)\)\s*(\w+)\s+damage/i);
        if (damageMatch) {
            action.damage = `${damageMatch[1]} (${damageMatch[2]})`;
            action.damageType = damageMatch[3].toLowerCase();
        }

        // Additional damage
        const additionalMatch = description.match(/plus\s+(\d+)\s*\(([^)]+)\)\s*(\w+)\s+damage/i);
        if (additionalMatch) {
            action.additionalDamage = `${additionalMatch[1]} (${additionalMatch[2]})`;
            action.additionalDamageType = additionalMatch[3].toLowerCase();
        }

        // Saving throw
        const saveMatch = description.match(/(\w+)\s+Saving\s+Throw:\s*DC\s*(\d+)/i);
        if (saveMatch) {
            action.saveType = saveMatch[1];
            action.saveDC = parseInt(saveMatch[2]);
        }

        // Area
        const areaMatch = description.match(/(\d+-foot)\s+(Cone|Line|Cube|Sphere|Cylinder)/i);
        if (areaMatch) {
            action.area = `${areaMatch[1]} ${areaMatch[2].toLowerCase()}`;
        }

        // Recharge
        const rechargeMatch = description.match(/\(Recharge\s+([\d-]+)\)/i);
        if (rechargeMatch) {
            action.recharge = rechargeMatch[1];
        }
    }

    /**
     * Parse senses string into senses object
     * @param {string} sensesStr - Senses string
     * @returns {Object} Senses object
     */
    static parseSenses(sensesStr) {
        const senses = {
            blindsight: null,
            darkvision: null,
            tremorsense: null,
            truesight: null,
            passivePerception: null
        };

        const parts = sensesStr.split(',').map(p => p.trim());

        for (const part of parts) {
            const match = part.match(/(Blindsight|Darkvision|Tremorsense|Truesight)\s+(\d+)\s*ft/i);
            if (match) {
                const senseType = match[1].toLowerCase();
                const value = parseInt(match[2]);
                senses[senseType] = value;
            }

            const passiveMatch = part.match(/Passive\s+Perception\s+(\d+)/i);
            if (passiveMatch) {
                senses.passivePerception = parseInt(passiveMatch[1]);
            }
        }

        return senses;
    }

    /**
     * Parse speed string into speed object
     * @param {string} speedStr - Speed string (e.g., "40 ft., burrow 40 ft., fly 80 ft.")
     * @returns {Object} Speed object
     */
    static parseSpeed(speedStr) {
        const speed = {
            walk: null,
            burrow: null,
            climb: null,
            fly: null,
            swim: null,
            hover: false
        };

        // Split by comma
        const parts = speedStr.split(',').map(p => p.trim());

        for (const part of parts) {
            const match = part.match(/(\w+)?\s*(\d+)\s*ft/i);
            if (match) {
                const type = match[1]?.toLowerCase() || 'walk';
                const value = parseInt(match[2]);

                if (type === 'walk' || !match[1]) {
                    speed.walk = value;
                } else if (speed.hasOwnProperty(type)) {
                    speed[type] = value;
                }
            }

            if (part.includes('hover')) {
                speed.hover = true;
            }
        }

        return speed;
    }

    /**
     * Display stat block preview
     * @param {Object} creature - Parsed creature object
     */
    static displayStatBlockPreview(creature) {
        const previewDiv = document.getElementById('stat-block-preview');
        if (!previewDiv) return;

        let html = `
            <div class="creature-details-header">
                <h3>${creature.name}</h3>
                <span class="creature-type-badge badge-${creature.type}">${creature.type.toUpperCase()}</span>
            </div>
        `;

        if (creature.statBlock.fullType) {
            html += `<p class="creature-full-type">${creature.statBlock.fullType}</p>`;
        }

        html += `<div style="margin-top: var(--spacing-md);">`;

        if (creature.statBlock.armorClass) {
            html += `<p><strong>AC</strong> ${creature.statBlock.armorClass.value}`;
            if (creature.statBlock.armorClass.type) html += ` (${creature.statBlock.armorClass.type})`;
            html += `</p>`;
        } else {
            html += `<p><strong>AC</strong> ${creature.ac}</p>`;
        }

        if (creature.statBlock.hitPoints) {
            html += `<p><strong>HP</strong> ${creature.statBlock.hitPoints.average}`;
            if (creature.statBlock.hitPoints.formula) html += ` (${creature.statBlock.hitPoints.formula})`;
            html += `</p>`;
        } else {
            html += `<p><strong>HP</strong> ${creature.maxHP}</p>`;
        }

        if (creature.statBlock.speed) {
            const speeds = [];
            if (creature.statBlock.speed.walk) speeds.push(`${creature.statBlock.speed.walk} ft.`);
            if (creature.statBlock.speed.burrow) speeds.push(`burrow ${creature.statBlock.speed.burrow} ft.`);
            if (creature.statBlock.speed.climb) speeds.push(`climb ${creature.statBlock.speed.climb} ft.`);
            if (creature.statBlock.speed.fly) speeds.push(`fly ${creature.statBlock.speed.fly} ft.${creature.statBlock.speed.hover ? ' (hover)' : ''}`);
            if (creature.statBlock.speed.swim) speeds.push(`swim ${creature.statBlock.speed.swim} ft.`);
            if (speeds.length > 0) {
                html += `<p><strong>Speed</strong> ${speeds.join(', ')}</p>`;
            }
        }

        if (creature.statBlock.abilities) {
            html += `<table class="ability-scores-table" style="margin-top: var(--spacing-md); width: 100%;">
                <thead>
                    <tr>
                        <th>STR</th><th>DEX</th><th>CON</th><th>INT</th><th>WIS</th><th>CHA</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${creature.statBlock.abilities.str.score} (${this.formatModifier(creature.statBlock.abilities.str.modifier)})</td>
                        <td>${creature.statBlock.abilities.dex.score} (${this.formatModifier(creature.statBlock.abilities.dex.modifier)})</td>
                        <td>${creature.statBlock.abilities.con.score} (${this.formatModifier(creature.statBlock.abilities.con.modifier)})</td>
                        <td>${creature.statBlock.abilities.int.score} (${this.formatModifier(creature.statBlock.abilities.int.modifier)})</td>
                        <td>${creature.statBlock.abilities.wis.score} (${this.formatModifier(creature.statBlock.abilities.wis.modifier)})</td>
                        <td>${creature.statBlock.abilities.cha.score} (${this.formatModifier(creature.statBlock.abilities.cha.modifier)})</td>
                    </tr>
                </tbody>
            </table>`;
        }

        html += `</div>`;

        // Additional stats section
        html += `<div style="margin-top: var(--spacing-md);">`;

        // Skills
        if (creature.statBlock.skills && Object.keys(creature.statBlock.skills).length > 0) {
            const skills = [];
            for (const [skill, bonus] of Object.entries(creature.statBlock.skills)) {
                const skillName = skill.replace(/([A-Z])/g, ' $1').trim();
                const capitalizedSkill = skillName.charAt(0).toUpperCase() + skillName.slice(1);
                skills.push(`${capitalizedSkill} ${this.formatModifier(bonus)}`);
            }
            html += `<p><strong>Skills</strong> ${skills.join(', ')}</p>`;
        }

        // Damage Immunities/Resistances/Vulnerabilities
        if (creature.statBlock.damageImmunities && creature.statBlock.damageImmunities.length > 0) {
            html += `<p><strong>Damage Immunities</strong> ${creature.statBlock.damageImmunities.join(', ')}</p>`;
        }
        if (creature.statBlock.damageResistances && creature.statBlock.damageResistances.length > 0) {
            html += `<p><strong>Damage Resistances</strong> ${creature.statBlock.damageResistances.join(', ')}</p>`;
        }
        if (creature.statBlock.damageVulnerabilities && creature.statBlock.damageVulnerabilities.length > 0) {
            html += `<p><strong>Damage Vulnerabilities</strong> ${creature.statBlock.damageVulnerabilities.join(', ')}</p>`;
        }

        // Senses
        if (creature.statBlock.senses) {
            const senses = [];
            if (creature.statBlock.senses.blindsight) senses.push(`Blindsight ${creature.statBlock.senses.blindsight} ft.`);
            if (creature.statBlock.senses.darkvision) senses.push(`Darkvision ${creature.statBlock.senses.darkvision} ft.`);
            if (creature.statBlock.senses.tremorsense) senses.push(`Tremorsense ${creature.statBlock.senses.tremorsense} ft.`);
            if (creature.statBlock.senses.truesight) senses.push(`Truesight ${creature.statBlock.senses.truesight} ft.`);
            if (creature.statBlock.senses.passivePerception) senses.push(`Passive Perception ${creature.statBlock.senses.passivePerception}`);
            if (senses.length > 0) {
                html += `<p><strong>Senses</strong> ${senses.join(', ')}</p>`;
            }
        }

        // Languages
        if (creature.statBlock.languages && creature.statBlock.languages.length > 0) {
            html += `<p><strong>Languages</strong> ${creature.statBlock.languages.join(', ')}</p>`;
        }

        // CR
        if (creature.statBlock.challengeRating) {
            html += `<p><strong>CR</strong> ${creature.statBlock.challengeRating.cr}`;
            if (creature.statBlock.challengeRating.xp) html += ` (${creature.statBlock.challengeRating.xp.toLocaleString()} XP)`;
            html += `</p>`;
        } else if (creature.cr) {
            html += `<p><strong>CR</strong> ${creature.cr}</p>`;
        }

        html += `</div>`;

        // Traits
        if (creature.statBlock.traits && creature.statBlock.traits.length > 0) {
            html += `<div class="stat-block-section stat-block-traits" style="margin-top: var(--spacing-md);">`;
            creature.statBlock.traits.forEach(trait => {
                let traitHtml = `<p><strong><em>${trait.name}.</em></strong> ${trait.description}`;
                if (trait.usage) {
                    traitHtml += ` <em>(${trait.usage})</em>`;
                }
                traitHtml += `</p>`;
                html += traitHtml;
            });
            html += `</div>`;
        }

        // Actions
        if (creature.statBlock.actions && creature.statBlock.actions.length > 0) {
            html += `<div class="stat-block-section" style="margin-top: var(--spacing-md);"><h4 class="stat-block-heading">Actions</h4>`;
            creature.statBlock.actions.forEach(action => {
                html += `<p><strong><em>${action.name}.</em></strong> ${action.description}</p>`;
            });
            html += `</div>`;
        }

        // Bonus Actions
        if (creature.statBlock.bonusActions && creature.statBlock.bonusActions.length > 0) {
            html += `<div class="stat-block-section" style="margin-top: var(--spacing-md);"><h4 class="stat-block-heading">Bonus Actions</h4>`;
            creature.statBlock.bonusActions.forEach(action => {
                html += `<p><strong><em>${action.name}.</em></strong> ${action.description}</p>`;
            });
            html += `</div>`;
        }

        // Reactions
        if (creature.statBlock.reactions && creature.statBlock.reactions.length > 0) {
            html += `<div class="stat-block-section" style="margin-top: var(--spacing-md);"><h4 class="stat-block-heading">Reactions</h4>`;
            creature.statBlock.reactions.forEach(reaction => {
                html += `<p><strong><em>${reaction.name}.</em></strong> ${reaction.description}</p>`;
            });
            html += `</div>`;
        }

        // Legendary Actions
        if (creature.statBlock.legendaryActions && creature.statBlock.legendaryActions.options && creature.statBlock.legendaryActions.options.length > 0) {
            html += `<div class="stat-block-section" style="margin-top: var(--spacing-md);"><h4 class="stat-block-heading">Legendary Actions</h4>`;
            if (creature.statBlock.legendaryActions.description) {
                html += `<p>${creature.statBlock.legendaryActions.description}</p>`;
            }
            creature.statBlock.legendaryActions.options.forEach(option => {
                html += `<p><strong><em>${option.name}`;
                if (option.cost && option.cost > 1) html += ` (Costs ${option.cost} Actions)`;
                html += `.</em></strong> ${option.description}</p>`;
            });
            html += `</div>`;
        }

        // Lair Actions
        if (creature.statBlock.lairActions && (creature.statBlock.lairActions.description || (creature.statBlock.lairActions.options && creature.statBlock.lairActions.options.length > 0))) {
            html += `<div class="stat-block-section" style="margin-top: var(--spacing-md);"><h4 class="stat-block-heading">Lair Actions</h4>`;
            if (creature.statBlock.lairActions.description) {
                html += `<p>${creature.statBlock.lairActions.description}</p>`;
            }
            if (creature.statBlock.lairActions.options && creature.statBlock.lairActions.options.length > 0) {
                creature.statBlock.lairActions.options.forEach(option => {
                    html += `<p><strong><em>${option.name}.</em></strong> ${option.description}</p>`;
                });
            }
            html += `</div>`;
        }

        // Regional Effects
        if (creature.statBlock.regionalEffects && (creature.statBlock.regionalEffects.description || (creature.statBlock.regionalEffects.effects && creature.statBlock.regionalEffects.effects.length > 0))) {
            html += `<div class="stat-block-section" style="margin-top: var(--spacing-md);"><h4 class="stat-block-heading">Regional Effects</h4>`;
            if (creature.statBlock.regionalEffects.description) {
                html += `<p>${creature.statBlock.regionalEffects.description}</p>`;
            }
            if (creature.statBlock.regionalEffects.effects && creature.statBlock.regionalEffects.effects.length > 0) {
                creature.statBlock.regionalEffects.effects.forEach(effect => {
                    html += `<p><strong><em>${effect.name}.</em></strong> ${effect.description}</p>`;
                });
            }
            html += `</div>`;
        }

        // Spellcasting
        if (creature.statBlock.spellcasting) {
            html += `<div class="stat-block-section" style="margin-top: var(--spacing-md);"><h4 class="stat-block-heading">Spellcasting</h4>`;
            if (creature.statBlock.spellcasting.description) {
                html += `<p>${creature.statBlock.spellcasting.description}</p>`;
            }

            if (creature.statBlock.spellcasting.spells) {
                // At-will spells
                if (creature.statBlock.spellcasting.spells.atWill && creature.statBlock.spellcasting.spells.atWill.length > 0) {
                    const spellNames = creature.statBlock.spellcasting.spells.atWill.map(s => {
                        return s.level !== null ? `${s.name} (${s.level})` : s.name;
                    }).join(', ');
                    html += `<p><strong>At will:</strong> ${spellNames}</p>`;
                }

                // Per day spells
                if (creature.statBlock.spellcasting.spells.perDay) {
                    for (const [times, spells] of Object.entries(creature.statBlock.spellcasting.spells.perDay)) {
                        const spellNames = spells.map(s => {
                            return s.level !== null ? `${s.name} (${s.level})` : s.name;
                        }).join(', ');
                        html += `<p><strong>${times}/day each:</strong> ${spellNames}</p>`;
                    }
                }

                // Spell slots (if using spell slots system)
                if (creature.statBlock.spellcasting.spells.slots) {
                    const slotInfo = [];
                    for (const [level, count] of Object.entries(creature.statBlock.spellcasting.spells.slots)) {
                        const ordinal = level == 1 ? '1st' : level == 2 ? '2nd' : level == 3 ? '3rd' : `${level}th`;
                        slotInfo.push(`${ordinal} level (${count} slots)`);
                    }
                    if (slotInfo.length > 0) {
                        html += `<p><strong>Spell Slots:</strong> ${slotInfo.join(', ')}</p>`;
                    }
                }
            }
            html += `</div>`;
        }

        previewDiv.innerHTML = html;
    }

    /**
     * Format modifier with + or - sign
     * @param {number} modifier - Modifier value
     * @returns {string} Formatted modifier
     */
    static formatModifier(modifier) {
        return modifier >= 0 ? `+${modifier}` : `${modifier}`;
    }

    /**
     * Handle importing a parsed creature into the compendium
     * @param {HTMLElement} target - The import button
     */
    static async handleImportParsedCreature(target) {
        try {
            const parsedDataStr = target.dataset.parsedCreature;
            if (!parsedDataStr) {
                throw new Error('No parsed creature data found');
            }

            const creature = JSON.parse(parsedDataStr);

            // Mark as custom creature
            creature.isCustom = true;

            // Get existing custom creatures
            const customCreatures = JSON.parse(localStorage.getItem('dnd-custom-creatures') || '[]');

            // Check if creature with this ID already exists
            const existingIndex = customCreatures.findIndex(c => c.id === creature.id);
            if (existingIndex >= 0) {
                const confirm = window.confirm(`A creature named "${creature.name}" already exists. Overwrite it?`);
                if (confirm) {
                    customCreatures[existingIndex] = creature;
                } else {
                    ToastSystem.show('Import cancelled', 'info', 2000);
                    return;
                }
            } else {
                customCreatures.push(creature);
            }

            // Save to localStorage
            localStorage.setItem('dnd-custom-creatures', JSON.stringify(customCreatures));

            // Reload the consolidated database
            if (DataServices.combatantManager) {
                await DataServices.combatantManager.loadCreatureDatabase();
            }

            ToastSystem.show(`✅ "${creature.name}" imported to compendium!`, 'success', 3000);

            // Store the creature ID for auto-selection
            const creatureId = creature.id;

            // Close parser modal
            ModalSystem.hide('stat-block-parser');

            // Clear form
            const textArea = document.getElementById('stat-block-text');
            if (textArea) textArea.value = '';

            const previewDiv = document.getElementById('stat-block-preview');
            if (previewDiv) {
                previewDiv.innerHTML = `<div class="empty-state" style="text-align: center; color: var(--color-text-muted);"><p>Paste a stat block and click "Parse Stat Block" to see a preview</p></div>`;
            }

            // Hide import button
            const importButton = document.getElementById('import-parsed-creature');
            if (importButton) {
                importButton.style.display = 'none';
                delete importButton.dataset.parsedCreature;
            }

            // Wait for parser modal close animation, then open compendium
            setTimeout(() => {
                // Open the compendium modal
                ModalSystem.show('creature-database');

                // Get the compendium modal and refresh its list
                const compendiumModal = document.querySelector('[data-modal="creature-database"]');
                if (compendiumModal) {
                    // Refresh the creature list to include the newly imported creature
                    CreatureModalEvents.setupCreatureDatabaseModal(compendiumModal);

                    // Wait for list to populate, then select the imported creature
                    setTimeout(() => {
                        const creatureItem = compendiumModal.querySelector(`.creature-list-item[data-creature-id="${creatureId}"]`);
                        if (creatureItem) {
                            creatureItem.click();
                            creatureItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                    }, 100);
                }
            }, 250);

        } catch (error) {
            console.error('Error importing parsed creature:', error);
            ToastSystem.show('Failed to import creature: ' + error.message, 'error', 3000);
        }
    }

    // Note: Form handling now routed through handleFormSubmission

    /**
     * Set up combat control handlers
     */
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
}