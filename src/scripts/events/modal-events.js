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
        let targetCombatant = null;

        if (targetId) {
            modal.setAttribute('data-current-target', targetId);

            // Update the target name in the modal
            targetCombatant = DataServices.combatantManager.getCombatant(targetId);
            if (targetCombatant) {
                const targetNameElement = modal.querySelector('[data-target-name]');
                if (targetNameElement) {
                    targetNameElement.textContent = targetCombatant.name;
                }
            }
        }

        // Handle specific modal types (some don't need target combatant)
        this.handleSpecificModalSetup(modalType, modal, targetCombatant, trigger);

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
            case 'add-combatant':
                this.setupAddCombatantModal(modal);
                break;
            case 'creature-database':
                this.setupCreatureDatabaseModal(modal);
                break;
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
     * Set up add combatant modal by populating creature dropdown
     * @param {HTMLElement} modal - Modal element
     */
    static async setupAddCombatantModal(modal) {
        const creatureSelect = modal.querySelector('#creature-select');
        if (!creatureSelect) return;

        try {
            // Get creatures from CombatantManager (which loads from JSON file)
            const creatures = DataServices.combatantManager?.creatureDatabase || [];

            // Clear existing options (except the placeholder)
            const placeholder = creatureSelect.querySelector('option[disabled]');
            creatureSelect.innerHTML = '';
            if (placeholder) {
                creatureSelect.appendChild(placeholder);
            } else {
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.disabled = true;
                defaultOption.selected = true;
                defaultOption.textContent = 'Choose a creature...';
                creatureSelect.appendChild(defaultOption);
            }

            // Populate with creatures from database
            if (creatures && creatures.length > 0) {
                creatures.forEach(creature => {
                    const option = document.createElement('option');
                    option.value = creature.id;
                    option.textContent = `${creature.name} (${creature.type.toUpperCase()}) - AC: ${creature.ac}, HP: ${creature.maxHP}`;
                    creatureSelect.appendChild(option);
                });
            }

            console.log(`📝 Populated creature dropdown with ${creatures.length} creatures`);
        } catch (error) {
            console.error('Failed to populate creature dropdown:', error);
            ToastSystem.show('Failed to load creatures', 'error');
        }

        // Reset all form fields to default values
        this.resetAddCombatantForm(modal);

        // Setup HP percentage buttons
        this.setupHPPercentageButtons(modal);
    }

    /**
     * Reset all fields in the Add Combatant modal to default values
     * @param {HTMLElement} modal - Modal element
     */
    static resetAddCombatantForm(modal) {
        // Reset initiative to 1
        const initiativeInput = modal.querySelector('#combatant-initiative');
        if (initiativeInput) {
            initiativeInput.value = '1';
        }

        // Clear name note
        const nameNoteInput = modal.querySelector('#combatant-name-note');
        if (nameNoteInput) {
            nameNoteInput.value = '';
        }

        // Clear current HP
        const currentHPInput = modal.querySelector('#combatant-current-hp');
        if (currentHPInput) {
            currentHPInput.value = '';
        }

        // Reset creature selection to placeholder
        const creatureSelect = modal.querySelector('#creature-select');
        if (creatureSelect) {
            creatureSelect.selectedIndex = 0; // Select the "Choose a creature..." option
        }

        // Reset starting condition checkboxes
        const surprisedCheckbox = modal.querySelector('input[name="startingSurprised"]');
        const hidingCheckbox = modal.querySelector('input[name="startingHiding"]');
        if (surprisedCheckbox) surprisedCheckbox.checked = false;
        if (hidingCheckbox) hidingCheckbox.checked = false;
    }

    /**
     * Setup HP percentage buttons for the Add Combatant modal
     * @param {HTMLElement} modal - Modal element
     */
    static setupHPPercentageButtons(modal) {
        const percentageButtons = modal.querySelectorAll('.hp-percentage-btn');
        const currentHPInput = modal.querySelector('#combatant-current-hp');
        const creatureSelect = modal.querySelector('#creature-select');

        percentageButtons.forEach(button => {
            button.addEventListener('click', () => {
                const percentage = parseInt(button.getAttribute('data-percentage'));
                const selectedCreatureId = creatureSelect.value;

                if (!selectedCreatureId) {
                    ToastSystem.show('Please select a creature first', 'warning', 2000);
                    return;
                }

                // Find the selected creature's max HP
                const creatures = DataServices.combatantManager?.creatureDatabase || [];
                const selectedCreature = creatures.find(c => c.id === selectedCreatureId);

                if (!selectedCreature) {
                    ToastSystem.show('Creature not found', 'error', 2000);
                    return;
                }

                // Calculate HP based on percentage
                const maxHP = selectedCreature.maxHP;
                const calculatedHP = Math.floor(maxHP * (percentage / 100));

                // Set the HP input value
                if (currentHPInput) {
                    currentHPInput.value = calculatedHP;
                }
            });
        });
    }

    /**
     * Set up creature database modal by populating creature list
     * @param {HTMLElement} modal - Modal element
     */
    static async setupCreatureDatabaseModal(modal) {
        const creatureListContainer = modal.querySelector('#creature-list .creature-list-viewport');
        const totalCountElement = modal.querySelector('#total-count');
        const visibleCountElement = modal.querySelector('#visible-count');

        if (!creatureListContainer) return;

        try {
            // Get creatures from CombatantManager (which loads from JSON file)
            const creatures = DataServices.combatantManager?.creatureDatabase || [];

            // Clear existing placeholder content
            creatureListContainer.innerHTML = '';

            // Update counts
            if (totalCountElement) totalCountElement.textContent = creatures.length;
            if (visibleCountElement) visibleCountElement.textContent = creatures.length;

            // Populate with real creatures from database
            if (creatures && creatures.length > 0) {
                creatures.forEach(creature => {
                    const creatureItem = document.createElement('div');
                    creatureItem.className = 'creature-list-item';
                    creatureItem.setAttribute('data-creature-id', creature.id);

                    creatureItem.innerHTML = `
                        <div class="creature-item-header">
                            <span class="creature-name creature-name-${creature.type}">${creature.name}</span>
                            <span class="creature-type-badge badge-${creature.type}">${creature.type.toUpperCase()}</span>
                        </div>
                        <div class="creature-item-stats">
                            <span class="creature-stat">AC: ${creature.ac}</span>
                            <span class="creature-stat">HP: ${creature.maxHP}</span>
                            <span class="creature-stat">CR: ${creature.cr || 'Unknown'}</span>
                        </div>
                    `;

                    // Add click handler for creature selection
                    creatureItem.addEventListener('click', () => {
                        // Remove active class from other items
                        modal.querySelectorAll('.creature-list-item').forEach(item => {
                            item.classList.remove('active');
                        });

                        // Add active class to clicked item
                        creatureItem.classList.add('active');

                        // Update details pane (to be implemented)
                        this.updateCreatureDetails(modal, creature);
                    });

                    creatureListContainer.appendChild(creatureItem);
                });
            } else {
                creatureListContainer.innerHTML = '<div class="no-creatures">No creatures found in database.</div>';
            }

            console.log(`📝 Populated creature database with ${creatures.length} creatures`);
        } catch (error) {
            console.error('Failed to populate creature database:', error);
            ToastSystem.show('Failed to load creature database', 'error');
        }
    }

    /**
     * Update creature details pane
     * @param {HTMLElement} modal - Modal element
     * @param {Object} creature - Selected creature data
     */
    static updateCreatureDetails(modal, creature) {
        const detailsPane = modal.querySelector('.creature-details-column');
        if (!detailsPane) return;

        // For now, just show basic info. This can be expanded later
        detailsPane.innerHTML = `
            <div class="creature-details-header">
                <h3>${creature.name}</h3>
                <span class="creature-type-badge badge-${creature.type}">${creature.type.toUpperCase()}</span>
            </div>
            <div class="creature-stats-grid">
                <div class="stat-block">
                    <label>Armor Class</label>
                    <value>${creature.ac}</value>
                </div>
                <div class="stat-block">
                    <label>Hit Points</label>
                    <value>${creature.maxHP}</value>
                </div>
                <div class="stat-block">
                    <label>Challenge Rating</label>
                    <value>${creature.cr || 'Unknown'}</value>
                </div>
            </div>
            <div class="creature-actions">
                <button class="btn btn-primary" onclick="console.log('Add to encounter - TODO')">
                    ➕ Add to Encounter
                </button>
            </div>
        `;
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

        // Populate the recent notes datalist for suggestions
        this.populateRecentNotesDatalist(noteType);

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
        // Populate the recent effects datalist for suggestions
        this.populateRecentEffectsDatalist();

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
            case 'combatant-creation':
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
        }

        // Add to recent effects for future use (both new and updated effects)
        this.addToRecentEffects(effectName);

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

        // Add to recent notes for future use (only if noteText is not empty)
        if (noteText.trim()) {
            this.addToRecentNotes(noteText, noteType);
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

        // Create instance data from form inputs
        const instanceData = {
            initiative: initiative,
            nameNote: nameNote
        };

        // Set custom HP if provided
        if (currentHP !== null && !isNaN(currentHP)) {
            instanceData.currentHP = currentHP;
        }

        // Set starting status conditions
        if (startingSurprised || startingHiding) {
            instanceData.status = {};
            if (startingSurprised) {
                instanceData.status.surprised = true;
            }
            if (startingHiding) {
                instanceData.status.hiding = true;
            }
        }

        try {
            // Add combatant using the global CombatantManager
            const combatantCard = DataServices.combatantManager.addCombatant(creatureId, instanceData);

            if (combatantCard) {
                ToastSystem.show(`Added ${combatantCard.name} to encounter`, 'success', 3000);
                console.log(`✅ Successfully added combatant: ${combatantCard.name}`);
            } else {
                ToastSystem.show('Failed to add combatant: Creature not found', 'error', 3000);
                return;
            }
        } catch (error) {
            console.error('❌ Error adding combatant:', error);
            ToastSystem.show('Failed to add combatant: ' + error.message, 'error', 3000);
            return;
        }

        ModalSystem.hideAll();
    }

    /**
     * Handle creature form submission (for adding new creatures to database)
     * @param {HTMLFormElement} form - Creature form
     */
    static handleCreatureForm(form) {
        const formData = new FormData(form);

        // Extract basic required fields
        const name = formData.get('name')?.trim();
        const type = formData.get('type');
        const ac = parseInt(formData.get('ac'));
        const maxHP = parseInt(formData.get('maxHP'));

        // Validate required fields
        if (!name || !type || isNaN(ac) || isNaN(maxHP)) {
            ToastSystem.show('Please fill in all required fields (Name, Type, AC, HP)', 'error', 3000);
            return;
        }

        // Generate a unique ID for the creature
        const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

        // Check if creature with this ID already exists
        const existingCreatures = DataServices.combatantManager.getAvailableCreatures();
        if (existingCreatures.some(creature => creature.id === id)) {
            ToastSystem.show(`A creature named "${name}" already exists`, 'error', 3000);
            return;
        }

        // Build creature data structure
        const creatureData = {
            id: id,
            name: name,
            type: type,
            ac: ac,
            maxHP: maxHP,
            cr: formData.get('cr') || '0',
            size: formData.get('size') || 'Medium',
            race: formData.get('race') || '',
            subrace: formData.get('subrace') || '',
            alignment: formData.get('alignment') || '',
            description: formData.get('description') || '',
            source: formData.get('source') || 'Custom',
            hasFullStatBlock: false // For now, just basic stats
        };

        // Optional: Build stat block if we have ability scores
        const str = parseInt(formData.get('str'));
        const dex = parseInt(formData.get('dex'));
        const con = parseInt(formData.get('con'));
        const int = parseInt(formData.get('int'));
        const wis = parseInt(formData.get('wis'));
        const cha = parseInt(formData.get('cha'));

        if (!isNaN(str) && !isNaN(dex) && !isNaN(con) && !isNaN(int) && !isNaN(wis) && !isNaN(cha)) {
            creatureData.hasFullStatBlock = true;
            creatureData.statBlock = {
                fullType: `${creatureData.size} ${creatureData.race}${creatureData.subrace ? ` (${creatureData.subrace})` : ''}, ${creatureData.alignment}`,
                armorClass: {
                    value: ac,
                    type: formData.get('acType') || 'Natural Armor'
                },
                hitPoints: {
                    average: maxHP,
                    formula: formData.get('hpFormula') || ''
                },
                initiative: {
                    modifier: parseInt(formData.get('initiativeModifier')) || Math.floor((dex - 10) / 2),
                    total: parseInt(formData.get('initiativeTotal')) || 0
                },
                speed: {
                    walk: parseInt(formData.get('walkSpeed')) || 30,
                    burrow: parseInt(formData.get('burrowSpeed')) || null,
                    climb: parseInt(formData.get('climbSpeed')) || null,
                    fly: parseInt(formData.get('flySpeed')) || null,
                    swim: parseInt(formData.get('swimSpeed')) || null
                },
                abilities: {
                    str: { score: str, modifier: Math.floor((str - 10) / 2) },
                    dex: { score: dex, modifier: Math.floor((dex - 10) / 2) },
                    con: { score: con, modifier: Math.floor((con - 10) / 2) },
                    int: { score: int, modifier: Math.floor((int - 10) / 2) },
                    wis: { score: wis, modifier: Math.floor((wis - 10) / 2) },
                    cha: { score: cha, modifier: Math.floor((cha - 10) / 2) }
                },
                proficiencyBonus: parseInt(formData.get('proficiencyBonus')) || 2
            };
        }

        try {
            // Add creature to the database
            // Note: This is a temporary solution since we can't actually save to the JSON file
            // In a real app, this would be sent to a backend API
            const currentDatabase = DataServices.combatantManager.creatureDatabase || [];
            currentDatabase.push(creatureData);

            // Store in localStorage for persistence during the session
            const customCreatures = JSON.parse(localStorage.getItem('dnd-custom-creatures') || '[]');
            customCreatures.push(creatureData);
            localStorage.setItem('dnd-custom-creatures', JSON.stringify(customCreatures));

            ToastSystem.show(`Created creature: ${name}`, 'success', 3000);
            console.log(`✅ Created custom creature: ${name} (${id})`);

            ModalSystem.hideAll();

            // Refresh the creature database in memory
            if (DataServices.combatantManager.creatureDatabase) {
                DataServices.combatantManager.creatureDatabase.push(creatureData);
            }

        } catch (error) {
            console.error('❌ Error creating creature:', error);
            ToastSystem.show('Failed to create creature: ' + error.message, 'error', 4000);
        }
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
     * Populate the datalist with recent effects for suggestions
     */
    static populateRecentEffectsDatalist() {
        const datalist = document.getElementById('recent-effects-list');
        if (!datalist) return;

        const recentEffects = this.getRecentEffects();

        // Clear existing options
        datalist.innerHTML = '';

        // Add recent effects as options
        recentEffects.forEach(effect => {
            const option = document.createElement('option');
            option.value = effect;
            datalist.appendChild(option);
        });
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

        // Limit to 12 recent effects
        const limitedEffects = recentEffects.slice(0, 12);

        // Save back to localStorage
        try {
            localStorage.setItem('recentEffects', JSON.stringify(limitedEffects));
        } catch (error) {
            console.warn('Failed to save recent effects:', error);
        }
    }

    /**
     * Get recent notes from localStorage
     * @param {string} noteType - Type of note ('name' or 'general')
     * @returns {Array} Array of recent note texts
     */
    static getRecentNotes(noteType) {
        try {
            const storageKey = noteType === 'name' ? 'recentNameNotes' : 'recentGeneralNotes';
            const stored = localStorage.getItem(storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.warn(`Failed to load recent ${noteType} notes:`, error);
            return [];
        }
    }

    /**
     * Populate the datalist with recent notes for suggestions
     * @param {string} noteType - Type of note ('name' or 'general')
     */
    static populateRecentNotesDatalist(noteType) {
        const datalist = document.getElementById('recent-notes-list');
        if (!datalist) return;

        const recentNotes = this.getRecentNotes(noteType);

        // Clear existing options
        datalist.innerHTML = '';

        // Add recent notes as options
        recentNotes.forEach(note => {
            const option = document.createElement('option');
            option.value = note;
            datalist.appendChild(option);
        });
    }

    /**
     * Add note to recent notes list
     * @param {string} noteText - Text of the note to add
     * @param {string} noteType - Type of note ('name' or 'general')
     */
    static addToRecentNotes(noteText, noteType) {
        if (!noteText) return;

        const storageKey = noteType === 'name' ? 'recentNameNotes' : 'recentGeneralNotes';
        const recentNotes = this.getRecentNotes(noteType);

        // Remove if already exists (to move to front)
        const existingIndex = recentNotes.indexOf(noteText);
        if (existingIndex !== -1) {
            recentNotes.splice(existingIndex, 1);
        }

        // Add to front
        recentNotes.unshift(noteText);

        // Limit to 12 recent notes
        const limitedNotes = recentNotes.slice(0, 12);

        // Save back to localStorage
        try {
            localStorage.setItem(storageKey, JSON.stringify(limitedNotes));
        } catch (error) {
            console.warn(`Failed to save recent ${noteType} notes:`, error);
        }
    }
}