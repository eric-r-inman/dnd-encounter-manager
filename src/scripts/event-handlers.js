/**
 * EventHandlers - Global Event Management for D&D Encounter Manager
 * 
 * Features:
 * - Event delegation for efficient DOM interaction
 * - Integration with StateManager for reactive updates
 * - Combat control handlers (Next Turn, Reset, etc.)
 * - Combatant card interaction handlers
 * - Modal and form handlers
 * 
 * @version 1.0.0
 */

import { StateManager } from './state-manager.js';
import { ToastSystem } from '../components/toast/ToastSystem.js';
import { ModalSystem } from '../components/modals/ModalSystem.js';
import { DataServices } from './data-services.js';

// D&D 5e Condition Details
const CONDITION_DETAILS = {
    'Blinded': {
        effects: [
            { title: "Can't See", desc: "You can't see and automatically fail any ability check that requires sight." },
            { title: "Attacks Affected", desc: "Attack rolls against you have Advantage, and your attack rolls have Disadvantage." }
        ]
    },
    'Charmed': {
        effects: [
            { title: "Can't Harm the Charmer", desc: "You can't attack the charmer or target the charmer with damaging abilities or magical effects." },
            { title: "Social Advantage", desc: "The charmer has Advantage on any ability check to interact with you socially." }
        ]
    },
    'Deafened': {
        effects: [
            { title: "Can't Hear", desc: "You can't hear and automatically fail any ability check that requires hearing." }
        ]
    },
    'Exhaustion': {
        effects: [
            { title: "Exhaustion Levels", desc: "This condition is cumulative. Each time you receive it, you gain 1 Exhaustion level. You die if your Exhaustion level is 6." },
            { title: "D20 Tests Affected", desc: "When you make a D20 Test, the roll is reduced by 2 times your Exhaustion level." },
            { title: "Speed Reduced", desc: "Your Speed is reduced by a number of feet equal to 5 times your Exhaustion level." },
            { title: "Removing Exhaustion Levels", desc: "Finishing a Long Rest removes 1 of your Exhaustion levels. When your Exhaustion level reaches 0, the condition ends." }
        ]
    },
    'Frightened': {
        effects: [
            { title: "Ability Checks and Attacks Affected", desc: "You have Disadvantage on ability checks and attack rolls while the source of fear is within line of sight." },
            { title: "Can't Approach", desc: "You can't willingly move closer to the source of fear." }
        ]
    },
    'Grappled': {
        effects: [
            { title: "Speed 0", desc: "Your Speed is 0 and can't increase." },
            { title: "Attacks Affected", desc: "You have Disadvantage on attack rolls against any target other than the grappler." },
            { title: "Movable", desc: "The grappler can drag or carry you when it moves, but every foot of movement costs it 1 extra foot unless you are Tiny or two or more sizes smaller than it." }
        ]
    },
    'Incapacitated': {
        effects: [
            { title: "Inactive", desc: "You can't take any action, Bonus Action, or Reaction." },
            { title: "No Concentration", desc: "Your Concentration is broken." },
            { title: "Speechless", desc: "You can't speak." },
            { title: "Surprised", desc: "If you're Incapacitated when you roll Initiative, you have Disadvantage on the roll." }
        ]
    },
    'Invisible': {
        effects: [
            { title: "Surprise", desc: "If you're Invisible when you roll Initiative, you have Advantage on the roll." },
            { title: "Concealed", desc: "You aren't affected by any effect that requires its target to be seen unless the effect's creator can somehow see you. Any equipment you are wearing or carrying is also concealed." },
            { title: "Attacks Affected", desc: "Attack rolls against you have Disadvantage, and your attack rolls have Advantage. If a creature can somehow see you, you don't gain this benefit against that creature." }
        ]
    },
    'Paralyzed': {
        effects: [
            { title: "Incapacitated", desc: "You have the Incapacitated condition." },
            { title: "Speed 0", desc: "Your Speed is 0 and can't increase." },
            { title: "Saving Throws Affected", desc: "You automatically fail Strength and Dexterity saving throws." },
            { title: "Attacks Affected", desc: "Attack rolls against you have Advantage." },
            { title: "Automatic Critical Hits", desc: "Any attack roll that hits you is a Critical Hit if the attacker is within 5 feet of you." }
        ]
    },
    'Petrified': {
        effects: [
            { title: "Turned to Inanimate Substance", desc: "You are transformed, along with any nonmagical objects you are wearing and carrying, into a solid inanimate substance (usually stone). Your weight increases by a factor of ten, and you cease aging." },
            { title: "Incapacitated", desc: "You have the Incapacitated condition." },
            { title: "Speed 0", desc: "Your Speed is 0 and can't increase." },
            { title: "Attacks Affected", desc: "Attack rolls against you have Advantage." },
            { title: "Saving Throws Affected", desc: "You automatically fail Strength and Dexterity saving throws." },
            { title: "Resist Damage", desc: "You have Resistance to all damage." },
            { title: "Poison Immunity", desc: "You have Immunity to the Poisoned condition." }
        ]
    },
    'Poisoned': {
        effects: [
            { title: "Ability Checks and Attacks Affected", desc: "You have Disadvantage on attack rolls and ability checks." }
        ]
    },
    'Prone': {
        effects: [
            { title: "Restricted Movement", desc: "Your only movement options are to crawl or to spend an amount of movement equal to half your Speed (round down) to right yourself and thereby end the condition. If your Speed is 0, you can't right yourself." },
            { title: "Attacks Affected", desc: "You have Disadvantage on attack rolls. An attack roll against you has Advantage if the attacker is within 5 feet of you. Otherwise, that attack roll has Disadvantage." }
        ]
    },
    'Restrained': {
        effects: [
            { title: "Speed 0", desc: "Your Speed is 0 and can't increase." },
            { title: "Attacks Affected", desc: "Attack rolls against you have Advantage, and your attack rolls have Disadvantage." },
            { title: "Saving Throws Affected", desc: "You have Disadvantage on Dexterity saving throws." }
        ]
    },
    'Stunned': {
        effects: [
            { title: "Incapacitated", desc: "You have the Incapacitated condition." },
            { title: "Saving Throws Affected", desc: "You automatically fail Strength and Dexterity saving throws." },
            { title: "Attacks Affected", desc: "Attack rolls against you have Advantage." }
        ]
    },
    'Unconscious': {
        effects: [
            { title: "Inert", desc: "You have the Incapacitated and Prone conditions, and you drop whatever you're holding. When this condition ends, you remain Prone." },
            { title: "Speed 0", desc: "Your Speed is 0 and can't increase." },
            { title: "Attacks Affected", desc: "Attack rolls against you have Advantage." },
            { title: "Saving Throws Affected", desc: "You automatically fail Strength and Dexterity saving throws." },
            { title: "Automatic Critical Hits", desc: "Any attack roll that hits you is a Critical Hit if the attacker is within 5 feet of you." },
            { title: "Unaware", desc: "You're unaware of your surroundings." }
        ]
    }
};

export class EventHandlers {
    static isInitialized = false;

    static init() {
        if (this.isInitialized) {
            console.warn('EventHandlers already initialized');
            return;
        }

        console.log('🔗 Event Handlers initializing...');
        
        // Set up global event delegation
        this.setupEventDelegation();
        
        // Set up combat control handlers
        this.setupCombatControls();
        
        // Set up modal handlers
        this.setupModalHandlers();
        
        // Set up keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Set up batch tooltips
        this.setupBatchTooltips();
        
        // Set up condition tooltips
        this.setupConditionTooltips();
        
        this.isInitialized = true;
        console.log('✅ Event Handlers initialized');
    }

    /**
     * Set up global event delegation for efficiency
     */
    static setupEventDelegation() {
        // Single click handler for the entire document
        document.addEventListener('click', (event) => {
            const target = event.target;
            
            // Look for data-action on the target or its parents
            let actionElement = target;
            let action = null;

            // Look for clicks on stat block add buttons
            if (target.classList.contains('stat-block-add-btn')) {
                event.preventDefault();
                const creatureId = target.getAttribute('data-creature-id');
                if (creatureId) {
                    this.handleQuickAddToEncounter(creatureId);
                }
            }

            // Look for clicks on stat block window buttons
            if (target.classList.contains('stat-block-window-btn')) {
                event.preventDefault();
                const creatureId = target.getAttribute('data-creature-id');
                if (creatureId) {
                    this.openCreatureInNewWindow(creatureId);
                }
            }
            
            // Look for clicks on current turn name in header
            if (target.classList.contains('current-turn-name') && target.classList.contains('clickable-name')) {
                event.preventDefault();
                const creatureId = target.getAttribute('data-creature-id');
                if (creatureId) {
                    this.displayCreatureStatBlock(creatureId);
                }
            }

            // Walk up the DOM tree to find an element with data-action
            while (actionElement && !action) {
                action = actionElement.getAttribute('data-action');
                if (!action) {
                    // Also check for data-action-type on editable-action elements
                    if (actionElement.classList.contains('editable-action')) {
                        action = actionElement.getAttribute('data-action-type');
                    }
                }
                if (!action) {
                    actionElement = actionElement.parentElement;
                }
            }
            
            if (!action) return;
            
            // Prevent default for buttons/links
            if (actionElement.tagName === 'BUTTON' || actionElement.tagName === 'A') {
                event.preventDefault();
            }
            
            // Route to appropriate handler based on action
            this.handleAction(action, actionElement, event);
        });

        // Event handler for select elements and other form controls
        document.addEventListener('change', (event) => {
            const target = event.target;
            const action = target.getAttribute('data-action');
            
            if (!action) return;
            
            // Route to appropriate handler based on action
            this.handleAction(action, target, event);
        });

        // Form submission handler
        document.addEventListener('submit', (event) => {
            const form = event.target;
            const formType = form.getAttribute('data-modal-form');
            
            if (formType) {
                event.preventDefault();
                this.handleFormSubmission(formType, form, event);
            }
        });

        // Add click handler for creature names
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('combatant-name')) {
                event.preventDefault();
                this.handleCreatureNameClick(event);
            }
        });
    }

    /**
     * Route actions to appropriate handlers
     */
    static handleAction(action, target, event) {
        console.log(`🎯 Handling action: ${action}`);
        
        try {
            switch (action) {
                // Combat Controls
                case 'next-turn':
                    this.handleNextTurn();
                    break;
                case 'reset-combat':
                    this.handleResetCombat();
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
                case 'clear-encounter':
                    this.handleClearEncounter();
                    break;

                // Combatant Card Actions
                case 'edit-combatant-initiative':
                    this.handleEditInitiative(target);
                    break;
                case 'edit-combatant-ac':
                    this.handleEditAC(target);
                    break;
                case 'move-combatant-up-initiative':
                    this.handleMoveInitiative(target, 'up');
                    break;
                case 'move-combatant-down-initiative':
                    this.handleMoveInitiative(target, 'down');
                    break;
                case 'toggle-combatant-hold-action':
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
                case 'batch-hp-modification':
                    this.handleBatchHPModification(target);
                    break;
                case 'clear-note':
                    this.handleClearNote(target);
                    break;

                // Status Toggles
                case 'toggle-concentration-status':
                    this.handleToggleConcentration(target);
                    break;
                case 'toggle-stealth-status':
                    this.handleToggleStealth(target);
                    break;
                case 'cycle-cover-states':
                    this.handleCycleCover(target);
                    break;
                case 'toggle-surprise-status':
                    this.handleToggleSurprise(target);
                    break;

                // Batch Selection
                case 'toggle-batch-select':
                    this.handleToggleBatchSelect(target);
                    break;

                // Condition/Effect Management
                case 'clear-condition':
                    this.handleClearCondition(target);
                    break;
                case 'clear-effect':
                    this.handleClearEffect(target);
                    break;
                case 'batch-condition':
                    this.handleBatchCondition(target);
                    break;
                case 'batch-effect':
                    this.handleBatchEffect(target);
                    break;
                case 'combatant-note':
                    batchBtn = modal.querySelector('#note-batch-apply-btn');
                    batchCount = modal.querySelector('#note-batch-count');
                    break;

                case 'batch-note':
                    this.handleBatchNote(target);
                    break;

                case 'toggle-infinity':
                    this.handleInfinityToggle(target);
                    break;

                case 'open-creature-database':
                    this.handleOpenCreatureDatabase();
                    break;
                case 'quick-view-creature':
                    this.handleQuickViewCreature();
                    break;
                case 'import-creature-database':
                    this.handleImportCreatureDatabase();
                    break;
                case 'import-stat-block':
                    this.handleImportStatBlock();
                    break;
                case 'add-new-creature':
                    this.handleAddNewCreature();
                    break;
                case 'search-creatures':
                    this.handleSearchCreatures(target);
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
                case 'add-to-encounter':
                    this.handleAddToEncounter(target);
                    break;

                default:
                    console.log(`⚠️ Unhandled action: ${action}`);
            }
        } catch (error) {
            console.error(`❌ Error handling action ${action}:`, error);
            ToastSystem.show(`Error: ${error.message}`, 'error', 5000);
        }
    }

    /**
     * Set up combat control button handlers
     */
    static setupCombatControls() {
        // Combat controls are handled through the action delegation system
        // This method sets up any additional combat-specific logic
        
        // Observer for combat state changes to update UI
        StateManager.observe('combat.round', (newRound) => {
            console.log(`🔄 Round updated to: ${newRound}`);
            ToastSystem.show(`Round ${newRound} begins!`, 'info', 2000);
        });

        StateManager.observe('combat.currentTurnIndex', (newIndex) => {
            const activeCombatant = StateManager.getActiveCombatant();
            if (activeCombatant) {
                console.log(`⚡ ${activeCombatant.name}'s turn`);
                ToastSystem.show(`${activeCombatant.name}'s turn`, 'info', 2000);
            }
        });
    }

    /**
     * Handle HP modification (damage/heal/temp HP)
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
        const submitAction = modal.querySelector('#hp-submit-action');
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
        }
        
        actionTypeSpan.textContent = modalTitle;
        actionLabel.textContent = modalTitle;
        /* submitAction.textContent = modalTitle; */
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
     * Handle HP modification form submission
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
        
        // Store original values
        const originalHP = combatant.currentHP;
        const originalTempHP = combatant.tempHP;
        
        // Calculate new values based on action type
        let newHP = originalHP;
        let newTempHP = originalTempHP;
        let message = '';
        
        switch (actionType) {
            case 'damage':
                let remainingDamage = amount;
                let actualDamage = 0;
                
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
                
                message = `${combatant.name} took ${actualDamage} damage`;
                break;
                
            case 'heal':
                const hpBefore = newHP;
                newHP = Math.min(combatant.maxHP, newHP + amount);
                const actualHealing = newHP - hpBefore;
                message = `${combatant.name} healed ${actualHealing} HP`;
                break;
                
            case 'temp-hp':
                // Temp HP doesn't stack - take the higher value
                newTempHP = Math.max(newTempHP, amount);
                message = `${combatant.name} gained ${amount} temporary HP`;
                break;
        }
        
        // Update the combatant using the manager
        if (newHP !== originalHP) {
            DataServices.combatantManager.updateCombatant(combatantId, 'currentHP', newHP);
        }
        if (newTempHP !== originalTempHP) {
            DataServices.combatantManager.updateCombatant(combatantId, 'tempHP', newTempHP);
        }
        
        // Close modal and show success message
        ModalSystem.hideAll();
        ToastSystem.show(message, 'success', 3000);

        // Add to history (get current round from StateManager)
        const currentRound = StateManager.state.combat.round || 1;

        // Store the actual amounts that changed
        let actualDamage = 0;
        let actualHealing = 0;

        // Calculate actual amounts for history
        if (actionType === 'damage') {
            actualDamage = originalHP + originalTempHP - newHP - newTempHP;
            if (actualDamage > 0) {
                combatant.addDamageHistory(actualDamage, currentRound);
            }
        } else if (actionType === 'heal') {
            actualHealing = newHP - originalHP;
            if (actualHealing > 0) {
                combatant.addHealHistory(actualHealing, currentRound);
            }
        } else if (actionType === 'temp-hp') {
            if (newTempHP > originalTempHP) {
                combatant.addTempHPHistory(amount, currentRound);
            }
        }

        // Save the updated combatant data
        DataServices.combatantManager.saveInstances();

        // Check for state changes
        const newHealthState = combatant.getHealthState();
        if (newHealthState === 'unconscious' && originalHP > 0) {
            ToastSystem.show(`${combatant.name} is unconscious!`, 'warning', 3000);
            
            // Turn off concentration if unconscious
            if (combatant.status.concentration) {
                DataServices.combatantManager.updateCombatant(combatantId, 'status.concentration', false);
                ToastSystem.show(`${combatant.name} lost concentration`, 'warning', 2000);
            }
        } else if (newHealthState === 'dead' && originalHP > 0) {
            ToastSystem.show(`${combatant.name} has died!`, 'danger', 3000);
            
            // Turn off concentration if dead
            if (combatant.status.concentration) {
                DataServices.combatantManager.updateCombatant(combatantId, 'status.concentration', false);
            }
        } else if (newHealthState === 'bloodied' && originalHP > Math.floor(combatant.maxHP / 2)) {
            ToastSystem.show(`${combatant.name} is bloodied!`, 'warning', 3000);
        }

        if (combatant.status.isActive) {
            EventHandlers.updateCombatHeader();
        }
    }

    /**
     * Handle batch HP modification
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
            const combatantsGoingDown = [];
            
            selectedCombatants.forEach(combatant => {
                let remainingDamage = amount;
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
            
            // Show warning if any would go down
            if (combatantsGoingDown.length > 0) {
                const namesList = combatantsGoingDown.join(', ');
                const message = `This damage will reduce the following to 0 HP or below: ${namesList}. Continue?`;
                
                if (!confirm(message)) {
                    return;
                }
            }
        }
        
        // Apply the modification to all selected combatants
        let successCount = 0;
        const currentRound = StateManager.state.combat.round || 1;
        
        selectedCombatants.forEach(combatant => {
            // Store original values
            const originalHP = combatant.currentHP;
            const originalTempHP = combatant.tempHP;
            
            // Calculate new values based on action type
            let newHP = originalHP;
            let newTempHP = originalTempHP;
            let actualAmount = 0;
            
            switch (actionType) {
                case 'damage':
                    let remainingDamage = amount;
                    
                    // First, damage removes temporary HP
                    if (newTempHP > 0) {
                        if (remainingDamage >= newTempHP) {
                            remainingDamage -= newTempHP;
                            actualAmount += newTempHP;
                            newTempHP = 0;
                        } else {
                            newTempHP -= remainingDamage;
                            actualAmount += remainingDamage;
                            remainingDamage = 0;
                        }
                    }
                    
                    // Then damage reduces current HP
                    if (remainingDamage > 0) {
                        const hpBefore = newHP;
                        newHP = Math.max(0, newHP - remainingDamage);
                        actualAmount += (hpBefore - newHP);
                    }
                    
                    // Add to damage history
                    if (actualAmount > 0) {
                        combatant.addDamageHistory(actualAmount, currentRound);
                    }
                    break;
                    
                case 'heal':
                    const hpBefore = newHP;
                    newHP = Math.min(combatant.maxHP, newHP + amount);
                    actualAmount = newHP - hpBefore;
                    
                    // Add to heal history
                    if (actualAmount > 0) {
                        combatant.addHealHistory(actualAmount, currentRound);
                    }
                    break;
                    
                case 'temp-hp':
                    // Temp HP doesn't stack - take the higher value
                    newTempHP = Math.max(newTempHP, amount);
                    actualAmount = amount;
                    
                    // Add to temp HP history
                    if (amount > 0) {
                        combatant.addTempHPHistory(amount, currentRound);
                    }
                    break;
            }
            
            // Update the combatant
            if (newHP !== originalHP) {
                DataServices.combatantManager.updateCombatant(combatant.id, 'currentHP', newHP);
            }
            if (newTempHP !== originalTempHP) {
                DataServices.combatantManager.updateCombatant(combatant.id, 'tempHP', newTempHP);
            }
            
            successCount++;
            
            // Check for state changes (unconscious, dead, bloodied)
            const newHealthState = combatant.getHealthState();
            if (actionType === 'damage') {
                if (newHealthState === 'unconscious' && originalHP > 0) {
                    // Turn off concentration if unconscious
                    if (combatant.status.concentration) {
                        DataServices.combatantManager.updateCombatant(combatant.id, 'status.concentration', false);
                    }
                } else if (newHealthState === 'dead' && originalHP > 0) {
                    // Turn off concentration if dead
                    if (combatant.status.concentration) {
                        DataServices.combatantManager.updateCombatant(combatant.id, 'status.concentration', false);
                    }
                }
            }
        });
        
        // Save all changes
        DataServices.combatantManager.saveInstances();
        
        // Save all changes
        DataServices.combatantManager.saveInstances();

        // Add to recent effects
        this.addToRecentEffects(effectName);

        // Close modal
        ModalSystem.hideAll();

        // Close modal
        ModalSystem.hideAll();
        
        // Show summary toast
        const actionText = actionType === 'temp-hp' ? 'temporary HP' : actionType;
        ToastSystem.show(`Applied ${amount} ${actionText} to ${successCount} combatant${successCount !== 1 ? 's' : ''}`, 'success', 3000);
        
        // Update combat header if active combatant was affected
        const activeCombatant = selectedCombatants.find(c => c.status.isActive);
        if (activeCombatant) {
            EventHandlers.updateCombatHeader();
        }
    }

    /**
     * Set up modal system handlers
     */
    static setupModalHandlers() {
        // Modal show handlers
        // Handle modal show events
        document.addEventListener('click', (event) => {
            const modalShow = event.target.getAttribute('data-modal-show');
            if (modalShow) {
                event.preventDefault();
                
                // Get target combatant ID if specified
                const targetId = event.target.getAttribute('data-modal-target');
                if (targetId) {
                    // Store the target ID for the form handlers
                    const modal = document.querySelector(`[data-modal="${modalShow}"]`);
                    if (modal) {
                        modal.setAttribute('data-current-target', targetId);
                        
                        // Update the target name in the modal
                        const targetCombatant = DataServices.combatantManager.getCombatant(targetId);
                        if (targetCombatant) {
                            const targetNameElement = modal.querySelector('[data-target-name]');
                            if (targetNameElement) {
                                targetNameElement.textContent = targetCombatant.name;
                            }
                            
                        // For note modal, populate with existing note
                        if (modalShow === 'combatant-note') {
                            const noteInput = modal.querySelector('#combatant-note-text');
                            const noteType = event.target.getAttribute('data-note-type') || 'general';
                            
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
                        }
                        
                        // Check for selected combatants and show/hide batch buttons
                        const selectedCombatants = EventHandlers.getSelectedCombatants();

                        if (modalShow === 'condition') {
                            const batchBtn = modal.querySelector('#condition-batch-apply-btn');
                            const batchCount = modal.querySelector('#condition-batch-count');
                            
                            if (batchBtn && selectedCombatants.length > 0) {
                                batchBtn.style.display = 'block';
                                batchCount.textContent = selectedCombatants.length;
                            } else if (batchBtn) {
                                batchBtn.style.display = 'none';
                            }
                            } else if (modalShow === 'effect') {
                                const batchBtn = modal.querySelector('#effect-batch-apply-btn');
                                const batchCount = modal.querySelector('#effect-batch-count');
                                
                                if (batchBtn && selectedCombatants.length > 0) {
                                    batchBtn.style.display = 'block';
                                    batchCount.textContent = selectedCombatants.length;
                                } else if (batchBtn) {
                                    batchBtn.style.display = 'none';
                                }
                                
                                // Populate the recent effects dropdown
                                EventHandlers.populateRecentEffectsDropdown();

                                // Clear the custom effect input
                                const customEffectInput = modal.querySelector('#custom-effect');
                                if (customEffectInput) {
                                    customEffectInput.value = '';
    }

                        } else if (modalShow === 'combatant-note') {
                            const batchBtn = modal.querySelector('#note-batch-apply-btn');
                            const batchCount = modal.querySelector('#note-batch-count');
                            
                            if (batchBtn && selectedCombatants.length > 0) {
                                batchBtn.style.display = 'block';
                                batchCount.textContent = selectedCombatants.length;
                            } else if (batchBtn) {
                                batchBtn.style.display = 'none';
                            }
                        }
                    }
                }
                
                ModalSystem.show(modalShow);
            }
        });

        // Modal close handlers
        document.addEventListener('click', (event) => {
            const modalClose = event.target.getAttribute('data-modal-close');
            if (modalClose !== null) {
                event.preventDefault();
                
                // Check if we're closing the creature database modal
                const modal = event.target.closest('.modal-overlay');
                if (modal && modal.getAttribute('data-modal') === 'creature-database') {
                    this.handleCreatureDatabaseClose();
                }
                
                ModalSystem.hideAll();
            }
        });

        // Close modal on overlay click
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal-overlay')) {
                // Check if we're closing the creature database modal
                if (event.target.getAttribute('data-modal') === 'creature-database') {
                    this.handleCreatureDatabaseClose();
                }
                
                ModalSystem.hideAll();
            }
        });
        
        // Handle note character counter
        document.addEventListener('input', (event) => {
            if (event.target.id === 'combatant-note-text') {
                const charCount = event.target.value.length;
                const counter = document.getElementById('note-char-count');
                if (counter) {
                    counter.textContent = charCount;
                    counter.style.color = charCount >= 18 ? 'var(--color-warning)' : 'var(--color-text-muted)';
                }
            }
        });

    }

    /**
     * Set up batch button hover tooltips
     */
    static setupBatchTooltips() {
        // Create tooltip element if it doesn't exist
        let tooltip = document.getElementById('batch-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'batch-tooltip';
            tooltip.className = 'batch-tooltip';
            document.body.appendChild(tooltip);
        }
        
        // Handle hover on batch buttons (all types)
        document.addEventListener('mouseover', (event) => {
            const target = event.target.closest('#hp-batch-apply-btn, #condition-batch-apply-btn, #effect-batch-apply-btn, #note-batch-apply-btn');
            if (target && target.style.display !== 'none') {
                this.showBatchTooltip(target, event);
            }
        });
        
        document.addEventListener('mouseout', (event) => {
            const target = event.target.closest('#hp-batch-apply-btn, #condition-batch-apply-btn, #effect-batch-apply-btn, #note-batch-apply-btn');
            if (target) {
                this.hideBatchTooltip();
            }
        });
        
        // Update position on mouse move
        document.addEventListener('mousemove', (event) => {
            const target = event.target.closest('#hp-batch-apply-btn, #condition-batch-apply-btn, #effect-batch-apply-btn, #note-batch-apply-btn');
            if (target && tooltip.classList.contains('show')) {
                this.updateTooltipPosition(event);
            }
        });
    }

    /**
     * Set up condition hover tooltips
     */
    static setupConditionTooltips() {
        // Create condition tooltip element if it doesn't exist
        let tooltip = document.getElementById('condition-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'condition-tooltip';
            tooltip.className = 'condition-tooltip';
            document.body.appendChild(tooltip);
        }
        
        // Handle hover on condition badges and header conditions
        document.addEventListener('mouseover', (event) => {
            const target = event.target;
            
            // Check if hovering over a condition badge in a combatant card
            if (target.closest('.combatant-condition-badge')) {
                const badge = target.closest('.combatant-condition-badge');
                const conditionName = badge.textContent.trim().split('\n')[0];
                this.showConditionTooltip(conditionName, event);
            }
            // Check if hovering over a condition in the header
            else if (target.closest('.conditions-list')) {
                const conditionsList = target.closest('.conditions-list');
                // Get the word under the cursor
                const conditionName = this.getWordUnderCursor(conditionsList, event);
                if (conditionName && CONDITION_DETAILS[conditionName]) {
                    this.showConditionTooltip(conditionName, event);
                }
            }
        });
        
        document.addEventListener('mouseout', (event) => {
            const target = event.target;
            if (target.closest('.combatant-condition-badge') || target.closest('.conditions-list')) {
                this.hideConditionTooltip();
            }
        });
        
        // Update position on mouse move
        document.addEventListener('mousemove', (event) => {
            const tooltip = document.getElementById('condition-tooltip');
            if (tooltip && tooltip.classList.contains('show')) {
                this.updateConditionTooltipPosition(event);
            }
        });
    }

    /**
     * Get the word under the cursor in a text element
     */
    static getWordUnderCursor(element, event) {
        // For the header conditions list, we'll show tooltip for any condition in the list
        const text = element.textContent;
        const conditions = text.split(',').map(c => c.trim());
        
        // Check each condition to see if it's a valid D&D condition
        for (const condition of conditions) {
            if (CONDITION_DETAILS[condition]) {
                // For simplicity, return the first valid condition found
                // In a more complex implementation, we'd calculate which word is under the cursor
                return condition;
            }
        }
        return null;
    }

    /**
     * Show condition tooltip with details
     */
    static showConditionTooltip(conditionName, event) {
        const tooltip = document.getElementById('condition-tooltip');
        if (!tooltip) return;
        
        const details = CONDITION_DETAILS[conditionName];
        if (!details) return;
        
        // Build the tooltip content
        let effectsHTML = '';
        details.effects.forEach(effect => {
            effectsHTML += `
                <div class="condition-effect-item">
                    <div class="condition-effect-title">${effect.title}</div>
                    <div class="condition-effect-desc">${effect.desc}</div>
                </div>
            `;
        });
        
        tooltip.innerHTML = `
            <div class="condition-tooltip-header">${conditionName}</div>
            <div class="condition-tooltip-effects">
                ${effectsHTML}
            </div>
        `;
        
        // Show and position the tooltip
        tooltip.classList.add('show');
        this.updateConditionTooltipPosition(event);
    }

    /**
     * Hide condition tooltip
     */
    static hideConditionTooltip() {
        const tooltip = document.getElementById('condition-tooltip');
        if (tooltip) {
            tooltip.classList.remove('show');
        }
    }

    /**
     * Update condition tooltip position
     */
    static updateConditionTooltipPosition(event) {
        const tooltip = document.getElementById('condition-tooltip');
        if (!tooltip || !tooltip.classList.contains('show')) return;
        
        // Position with offset
        const offsetX = 15;
        const offsetY = 15;
        
        // Calculate position
        let x = event.clientX + offsetX;
        let y = event.clientY + offsetY;
        
        // Get viewport dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Get tooltip dimensions
        const tooltipRect = tooltip.getBoundingClientRect();
        
        // Adjust if tooltip would go off screen
        if (x + tooltipRect.width > viewportWidth) {
            x = event.clientX - tooltipRect.width - offsetX;
        }
        
        if (y + tooltipRect.height > viewportHeight) {
            y = event.clientY - tooltipRect.height - offsetY;
        }
        
        // Apply position
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
    }

    /**
     * Show batch tooltip with selected combatants
     */
    static showBatchTooltip(button, event) {
        const tooltip = document.getElementById('batch-tooltip');
        if (!tooltip) return;
        
        // Get selected combatants
        const selectedCombatants = this.getSelectedCombatants();
        if (selectedCombatants.length === 0) return;
        
        // Build the list HTML
        const listItems = selectedCombatants
            .map(c => `<li class="batch-tooltip-item ${c.type}">${c.name}</li>`)
            .join('');
        
        tooltip.innerHTML = `<ul class="batch-tooltip-list">${listItems}</ul>`;
        
        // Show and position the tooltip
        tooltip.classList.add('show');
        this.updateTooltipPosition(event);
    }

    /**
     * Hide batch tooltip
     */
    static hideBatchTooltip() {
        const tooltip = document.getElementById('batch-tooltip');
        if (tooltip) {
            tooltip.classList.remove('show');
        }
    }

    /**
     * Update tooltip position to follow cursor
     */
    static updateTooltipPosition(event) {
        const tooltip = document.getElementById('batch-tooltip');
        if (!tooltip || !tooltip.classList.contains('show')) return;
        
        // Position below cursor with some offset
        const offsetX = 10;
        const offsetY = 20;
        
        // Calculate position
        let x = event.clientX + offsetX;
        let y = event.clientY + offsetY;
        
        // Get viewport dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Get tooltip dimensions
        const tooltipRect = tooltip.getBoundingClientRect();
        
        // Adjust if tooltip would go off screen
        if (x + tooltipRect.width > viewportWidth) {
            x = event.clientX - tooltipRect.width - offsetX;
        }
        
        if (y + tooltipRect.height > viewportHeight) {
            y = event.clientY - tooltipRect.height - offsetY;
        }
        
        // Apply position
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
    }

    /**
     * Get creatures marked for quick view from localStorage
     * @returns {Array} Array of creature IDs
     */
    static getQuickViewCreatures() {
        try {
            const stored = localStorage.getItem('dnd-quick-view-creatures');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to load quick view creatures:', error);
            return [];
        }
    }

    /**
     * Get recent effects from localStorage
     * @returns {Array} Array of recent effect names
     */
    static getRecentEffects() {
        try {
            const stored = localStorage.getItem('dnd-recent-effects');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to load recent effects:', error);
            return [];
        }
    }

    /**
     * Save recent effects to localStorage
     * @param {Array} effects - Array of effect names
     */
    static saveRecentEffects(effects) {
        try {
            localStorage.setItem('dnd-recent-effects', JSON.stringify(effects));
        } catch (error) {
            console.error('Failed to save recent effects:', error);
        }
    }

    /**
     * Add an effect to the recent effects list
     * @param {string} effectName - The effect name to add
     */
    static addToRecentEffects(effectName) {
        if (!effectName || effectName.trim() === '') return;
        
        // Normalize the effect name (trim and lowercase for comparison)
        const normalizedEffect = effectName.trim();
        const lowerCaseEffect = normalizedEffect.toLowerCase();
        
        // Get current recent effects
        let recentEffects = this.getRecentEffects();
        
        // Remove any existing occurrence (case-insensitive)
        recentEffects = recentEffects.filter(effect => 
            effect.toLowerCase() !== lowerCaseEffect
        );
        
        // Add the new effect with original casing
        recentEffects.unshift(normalizedEffect);
        
        // Keep only the last 30 effects
        recentEffects = recentEffects.slice(0, 30);
        
        // Save back to localStorage
        this.saveRecentEffects(recentEffects);
    }

    /**
     * Populate the effect dropdown with recent effects
     */
    static populateRecentEffectsDropdown() {
        const dropdown = document.getElementById('effect-dropdown');
        if (!dropdown) return;
        
        // Clear existing options except the first one
        while (dropdown.options.length > 1) {
            dropdown.remove(1);
        }
        
        // Get recent effects and sort alphabetically (case-insensitive)
        const recentEffects = this.getRecentEffects();
        const sortedEffects = [...recentEffects].sort((a, b) => 
            a.toLowerCase().localeCompare(b.toLowerCase())
        );
        
        // Add sorted effects to dropdown
        sortedEffects.forEach(effect => {
            const option = document.createElement('option');
            option.value = effect;
            option.textContent = effect;
            dropdown.appendChild(option);
        });
    }

    /**
     * Save quick view creatures to localStorage
     * @param {Array} creatureIds - Array of creature IDs
     */
    static saveQuickViewCreatures(creatureIds) {
        try {
            localStorage.setItem('dnd-quick-view-creatures', JSON.stringify(creatureIds));
        } catch (error) {
            console.error('Failed to save quick view creatures:', error);
        }
    }

    /**
     * Handle quick view checkbox toggle
     * @param {string} creatureId - The creature ID
     * @param {boolean} checked - Whether the checkbox is checked
     */
    static handleQuickViewToggle(creatureId, checked) {
        let quickViewCreatures = this.getQuickViewCreatures();
        
        if (checked) {
            // Add to quick view if not already there
            if (!quickViewCreatures.includes(creatureId)) {
                quickViewCreatures.push(creatureId);
            }
        } else {
            // Remove from quick view
            quickViewCreatures = quickViewCreatures.filter(id => id !== creatureId);
        }
        
        this.saveQuickViewCreatures(quickViewCreatures);
        console.log(`${checked ? 'Added' : 'Removed'} creature ${creatureId} ${checked ? 'to' : 'from'} Quick View`);
    }

    /**
     * Create and show quick view dropdown
     * @param {HTMLElement} button - The quick view button element
     */
    static showQuickViewDropdown(button) {
        // Remove any existing dropdown
        const existingDropdown = document.querySelector('.quick-view-dropdown');
        if (existingDropdown) {
            existingDropdown.remove();
        }
        
        // Get quick view creatures
        const quickViewIds = this.getQuickViewCreatures();
        const creatures = DataServices.combatantManager.creatureDatabase || [];
        
        // Filter and sort creatures
        const quickViewCreatures = creatures
            .filter(c => quickViewIds.includes(c.id))
            .sort((a, b) => a.name.localeCompare(b.name));
        
        // Create dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'quick-view-dropdown';
        
        if (quickViewCreatures.length === 0) {
            dropdown.innerHTML = '<div class="quick-view-empty">No creatures have been added to Quick View</div>';
        } else {
            dropdown.innerHTML = quickViewCreatures.map(creature => `
                <div class="quick-view-item" data-creature-id="${creature.id}">
                    <button class="quick-view-add-btn" 
                            data-creature-id="${creature.id}"
                            title="Add to encounter"></button>
                    <span class="quick-view-item-name creature-name-${creature.type}">${creature.name}</span>
                    <span class="quick-view-item-stats">
                        ${creature.cr ? `CR ${creature.cr} | ` : ''}AC ${creature.ac} | HP ${creature.maxHP}
                    </span>
                </div>
            `).join('');
        }
        
        // Position dropdown below button
        const buttonRect = button.getBoundingClientRect();
        dropdown.style.position = 'absolute';
        dropdown.style.top = `${buttonRect.bottom + 5}px`;
        dropdown.style.left = `${buttonRect.left}px`;
        dropdown.style.minWidth = `${buttonRect.width}px`;
        
        // Add to body
        document.body.appendChild(dropdown);
        
        // Add click handlers for add buttons
        dropdown.querySelectorAll('.quick-view-add-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering the item click
                const creatureId = btn.getAttribute('data-creature-id');
                this.handleQuickAddToEncounter(creatureId);
                dropdown.remove(); // Close dropdown after adding
            });
        });
        
        // Add click handlers for items (existing functionality)
        dropdown.querySelectorAll('.quick-view-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't trigger if clicking the add button
                if (!e.target.closest('.quick-view-add-btn')) {
                    const creatureId = item.getAttribute('data-creature-id');
                    this.displayCreatureStatBlock(creatureId);
                    dropdown.remove();
                }
            });
        });
        
        // Close dropdown when clicking outside
        setTimeout(() => {
            document.addEventListener('click', function closeDropdown(e) {
                if (!dropdown.contains(e.target) && e.target !== button) {
                    dropdown.remove();
                    document.removeEventListener('click', closeDropdown);
                }
            });
        }, 0);
    }

    /**
     * Handle quick add to encounter from Quick View dropdown
     * @param {string} creatureId - The creature ID to add
     */
    static handleQuickAddToEncounter(creatureId) {
        console.log('➕ Quick adding creature to encounter:', creatureId);
        
        // Populate the add combatant form
        const creatureSelect = document.getElementById('creature-select');
        if (creatureSelect) {
            // Make sure the dropdown is populated
            this.populateCreatureDropdown();
            
            // Select the creature
            creatureSelect.value = creatureId;
            
            // Show the add combatant modal
            ModalSystem.show('add-combatant');
            
            // Focus on initiative input
            setTimeout(() => {
                const initiativeInput = document.getElementById('combatant-initiative');
                if (initiativeInput) {
                    initiativeInput.focus();
                    initiativeInput.select();
                }
            }, 100);
        }
    }

    /**
     * Handle creature database modal close
     * Display selected creature in main UI if one is selected
     */
    static handleCreatureDatabaseClose() {
        if (this.selectedDatabaseCreatureId) {
            console.log('📖 Displaying selected creature in compendium:', this.selectedDatabaseCreatureId);
            // Display the creature stat block in the main UI
            this.displayCreatureStatBlock(this.selectedDatabaseCreatureId);
            
            // Scroll to the compendium section
            const compendiumSection = document.querySelector('.compendium-section');
            if (compendiumSection) {
                compendiumSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }

    /**
     * Open creature stat block in a new window
     * @param {string} creatureId - The creature ID to display
     */
    static openCreatureInNewWindow(creatureId) {
        const creature = DataServices.combatantManager.creatureDatabase.find(c => c.id === creatureId);
        if (!creature) {
            console.error('Creature not found:', creatureId);
            return;
        }
        
        // Generate the HTML content for the new window
        const statBlockHTML = creature.hasFullStatBlock && creature.statBlock 
            ? this.renderFullStatBlock(creature)
            : this.renderBasicCreatureInfo(creature);
        
        const windowContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${creature.name} - D&D Stat Block</title>
        <style>
            /* Import the design system variables and stat block styles */
            ${this.getStatBlockWindowStyles()}
        </style>
    </head>
    <body>
        <div class="stat-block-container">
            ${statBlockHTML}
        </div>
    </body>
    </html>`;
        
        // Open in new window
        const windowFeatures = 'width=600,height=800,resizable=yes,scrollbars=yes';
        const newWindow = window.open('', `creature-${creatureId}-${Date.now()}`, windowFeatures);
        
        if (newWindow) {
            newWindow.document.write(windowContent);
            newWindow.document.close();
            console.log(`📖 Opened ${creature.name} in new window`);
        } else {
            ToastSystem.show('Unable to open new window. Please check your popup blocker settings.', 'warning', 4000);
        }
    }

    /**
     * Get minimal CSS styles for the stat block window
     * @returns {string} CSS styles
     */
    static getStatBlockWindowStyles() {
        return `
            :root {
                /* Dark theme colors */
                --color-bg-primary: #0d1117;
                --color-bg-card: #1c2128;
                --color-bg-hover: #30363d;
                --color-text-primary: #f0f6fc;
                --color-text-secondary: #8b949e;
                --color-text-muted: #6e7681;
                --color-border-primary: #30363d;
                --color-border-muted: #2a2f36;
                --color-warning: #f0883e;
                --color-primary: #58a6ff;
                
                /* Spacing */
                --spacing-xs: 0.25rem;
                --spacing-sm: 0.5rem;
                --spacing-md: 0.75rem;
                --spacing-lg: 1rem;
                --spacing-xl: 1.5rem;
                --spacing-2xl: 2rem;
                
                /* Typography */
                --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
                --font-size-xs: 0.75rem;
                --font-size-sm: 0.875rem;
                --font-size-base: 1rem;
                --font-size-lg: 1.125rem;
                --font-weight-medium: 500;
                --font-weight-semibold: 600;
                --font-weight-bold: 700;
                --line-height-normal: 1.5;
                --line-height-relaxed: 1.6;
                
                /* Borders */
                --border-radius: 0.375rem;
                --border-width: 1px;
            }
            
            body {
                font-family: var(--font-family);
                background-color: var(--color-bg-primary);
                color: var(--color-text-primary);
                margin: 0;
                padding: var(--spacing-lg);
                line-height: var(--line-height-normal);
            }
            
            .stat-block-container {
                max-width: 600px;
                margin: 0 auto;
            }
            
            /* Hide the window and add buttons in the popup */
            .stat-block-window-btn,
            .stat-block-add-btn {
                display: none !important;
            }
            
            /* Include the stat block styles */
            ${this.getStatBlockCSS()}
        `;
    }

    /**
     * Get the stat block CSS for the popup window
     * @returns {string} CSS for stat blocks
     */
    static getStatBlockCSS() {
        // This is a simplified version of the stat block CSS
        return `
            .stat-block,
            .creature-basic-info {
                background-color: var(--color-bg-card);
                border: var(--border-width) solid var(--color-border-primary);
                border-radius: var(--border-radius);
                padding: var(--spacing-md);
                font-size: var(--font-size-sm);
                line-height: var(--line-height-normal);
            }
            
            .stat-block-header {
                text-align: center;
                border-bottom: 2px solid var(--color-border-primary);
                padding-bottom: var(--spacing-sm);
                margin-bottom: var(--spacing-md);
            }
            
            .stat-block-title-row {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: var(--spacing-sm);
            }
            
            .stat-block-creature-name,
            .creature-basic-info h4 {
                font-size: var(--font-size-lg);
                font-weight: var(--font-weight-bold);
                color: var(--color-warning);
                margin: 0;
            }
            
            .creature-type {
                font-style: italic;
                color: var(--color-text-secondary);
                margin: 0;
                font-size: var(--font-size-xs);
            }
            
            .stat-block-section {
                border-bottom: 1px solid var(--color-border-muted);
                padding: var(--spacing-sm) 0;
                margin-bottom: var(--spacing-sm);
            }
            
            .stat-block-section:last-child {
                border-bottom: none;
                margin-bottom: 0;
            }
            
            .stat-block-row {
                display: flex;
                margin-bottom: var(--spacing-xs);
                align-items: baseline;
            }
            
            .stat-label {
                font-weight: var(--font-weight-semibold);
                color: var(--color-text-primary);
                min-width: 80px;
                flex-shrink: 0;
                margin-right: var(--spacing-sm);
            }
            
            .stat-value {
                color: var(--color-text-secondary);
                flex: 1;
                padding-left: var(--spacing-xs);
            }
            
            .ability-scores {
                display: grid;
                grid-template-columns: repeat(6, 1fr);
                gap: var(--spacing-xs);
                padding: var(--spacing-sm) 0;
                border-bottom: 1px solid var(--color-border-muted);
                margin-bottom: var(--spacing-sm);
            }
            
            .ability {
                text-align: center;
                background-color: var(--color-bg-hover);
                border-radius: var(--border-radius);
                padding: var(--spacing-xs);
            }
            
            .ability-name {
                font-size: var(--font-size-xs);
                font-weight: var(--font-weight-semibold);
                color: var(--color-text-primary);
                margin-bottom: 2px;
            }
            
            .ability-score {
                font-size: var(--font-size-sm);
                font-weight: var(--font-weight-medium);
                color: var(--color-text-secondary);
            }
            
            .stat-block-section-title {
                font-size: var(--font-size-sm);
                font-weight: var(--font-weight-bold);
                color: var(--color-primary);
                margin: 0 0 var(--spacing-xs) 0;
                border-bottom: 1px solid var(--color-border-primary);
                padding-bottom: 2px;
            }
            
            .trait, .action {
                margin-bottom: var(--spacing-sm);
                line-height: var(--line-height-relaxed);
            }
            
            .trait-name, .action-name {
                font-weight: var(--font-weight-semibold);
                color: var(--color-text-primary);
            }
            
            .trait-desc, .action-desc {
                color: var(--color-text-secondary);
            }
        `;
    }

    /**
     * Set up keyboard shortcuts
     */
    static setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Don't trigger shortcuts when typing in inputs
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }

            switch (event.key.toLowerCase()) {
                case 'n':
                    event.preventDefault();
                    this.handleNextTurn();
                    break;
                case 'r':
                    event.preventDefault();
                    this.handleResetCombat();
                    break;
                case 'a':
                    event.preventDefault();
                    this.handleAddCombatant();
                    break;
                case 'escape':
                    // Check if creature database modal is open
                    const activeModal = ModalSystem.getActiveModal();
                    if (activeModal === 'creature-database') {
                        EventHandlers.handleCreatureDatabaseClose();
                    }
                    ModalSystem.hideAll();
                    break;
            }
        });
    }

    // ============================================================================
    // COMBAT CONTROL HANDLERS
    // ============================================================================

    /**
     * Handle Next Turn button
     */
    static handleNextTurn() {
        console.log('⏭️ Next Turn clicked');
        
        // Get all combatants in current order
        const allCombatants = DataServices.combatantManager.getAllCombatants();
        if (allCombatants.length === 0) {
            ToastSystem.show('No combatants in encounter', 'warning', 2000);
            return;
        }
        
        // Sort combatants using the same logic as CombatantManager
        const sortedCombatants = [...allCombatants].sort((a, b) => {
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
        
        // Find current active combatant
        const currentActiveIndex = sortedCombatants.findIndex(c => c.status.isActive);
        let currentActiveCombatant = null;
        
        if (currentActiveIndex !== -1) {
            currentActiveCombatant = sortedCombatants[currentActiveIndex];
            
            // Process end-of-turn effects for current combatant
            this.processTurnEnd(currentActiveCombatant);
            
            // Deactivate current combatant
            DataServices.combatantManager.updateCombatant(currentActiveCombatant.id, 'status.isActive', false);
        }
        
        // Calculate next combatant index
        let nextIndex;
        if (currentActiveIndex === -1) {
            // No active combatant, start at beginning
            nextIndex = 0;
        } else {
            // Move to next combatant
            nextIndex = currentActiveIndex + 1;
            
            // Check if we've completed a round
            if (nextIndex >= sortedCombatants.length) {
                nextIndex = 0;
                const newRound = StateManager.state.combat.round + 1;
                StateManager.setState('combat.round', newRound);
                console.log(`🔄 New round: ${newRound}`);
                ToastSystem.show(`Round ${newRound} begins!`, 'info', 2000);
            }
        }
        
            // Get the next combatant
            let nextCombatant = sortedCombatants[nextIndex];

            // Check if the next combatant is surprised
            if (nextCombatant.status.surprised) {
                // Clear surprised status
                DataServices.combatantManager.updateCombatant(nextCombatant.id, 'status.surprised', false);
                
                // Show notification
                ToastSystem.show(`${nextCombatant.name} was surprised and loses their turn!`, 'warning', 3000);
                
                // Skip to the next combatant by recursively calling handleNextTurn
                // First, we need to temporarily mark this combatant as active to avoid infinite loop
                DataServices.combatantManager.updateCombatant(nextCombatant.id, 'status.isActive', true);
                StateManager.setState('combat.currentTurnIndex', nextIndex);
                
                // Force update the card to show the status change
                const card = DataServices.combatantManager.getCombatant(nextCombatant.id);
                if (card && card.element) {
                    card.update();
                }
                
                // Now immediately advance to the next turn
                setTimeout(() => {
                    this.handleNextTurn();
                }, 100); // Small delay to ensure UI updates
                
                return; // Exit early
            }

            // If not surprised, proceed normally
            DataServices.combatantManager.updateCombatant(nextCombatant.id, 'status.isActive', true);

            // Update StateManager's turn index
            StateManager.setState('combat.currentTurnIndex', nextIndex);

            // Process start-of-turn effects for new active combatant
            this.processTurnStart(nextCombatant);
        
        // Force update the specific cards that changed
        if (currentActiveCombatant) {
            const oldCard = DataServices.combatantManager.getCombatant(currentActiveCombatant.id);
            if (oldCard && oldCard.element) {
                oldCard.update();
            }
        }
        const newCard = DataServices.combatantManager.getCombatant(nextCombatant.id);
        if (newCard && newCard.element) {
            newCard.update();
        }
        
        // Re-render to show the active state change
        DataServices.combatantManager.renderAll();
        
        // Update combat header
        EventHandlers.updateCombatHeader();
        
        console.log(`✅ ${nextCombatant.name}'s turn (Initiative ${nextCombatant.initiative})`);
        ToastSystem.show(`${nextCombatant.name}'s turn`, 'info', 2000);
    }

    /**
     * Handle Reset Combat button
     */
    static handleResetCombat() {
        console.log('🔄 Reset Combat clicked');
        
        // Ask for confirmation
        if (confirm('Are you sure you want to reset combat to Round 1? This will clear all HP history.')) {
            // Reset round counter
            StateManager.setState('combat.round', 1);
            StateManager.setState('combat.currentTurnIndex', 0);
            
            // Get all combatants
            const allCombatants = DataServices.combatantManager.getAllCombatants();
            
            // Clear all combatant states and HP history
            allCombatants.forEach(combatant => {
                // Clear active state
                DataServices.combatantManager.updateCombatant(combatant.id, 'status.isActive', false);
                
                // Clear manual order to return to initiative order
                DataServices.combatantManager.updateCombatant(combatant.id, 'manualOrder', null);
                
                // Clear HP history
                combatant.clearHPHistory();
            });
            
            // Sort combatants by initiative (since we cleared manual order)
            DataServices.combatantManager.sortCombatants();
            
            // Set the first combatant as active
            const sortedCombatants = [...allCombatants].sort((a, b) => {
                // Manual order should all be null now, so this will use initiative
                if (b.initiative !== a.initiative) {
                    return b.initiative - a.initiative;
                }
                return a.name.localeCompare(b.name);
            });
            
            if (sortedCombatants.length > 0) {
                const firstCombatant = sortedCombatants[0];
                DataServices.combatantManager.updateCombatant(firstCombatant.id, 'status.isActive', true);
                
                // Process turn start for the first combatant
                // (though typically you wouldn't decrement on the very first turn of combat)
                // this.processTurnStart(firstCombatant);
            }
            
            // Save the cleared history
            DataServices.combatantManager.saveInstances();
            
            // Re-render everything
            DataServices.combatantManager.renderAll();
            
            // Update combat header
            EventHandlers.updateCombatHeader();
            
            ToastSystem.show('Combat reset to Round 1', 'success', 3000);
            console.log('✅ Combat reset complete');
        }
    }

   /**
     * Process turn start effects (decrement counters that expire at turn start)
     */
    static processTurnStart(combatant) {
        console.log(`🎬 Processing turn start for ${combatant.name}`);
        
        // Clear surprised and hold action states at start of turn
        let statusChanged = false;
// Surprised is now handled in handleNextTurn before the turn starts
// if (combatant.status.surprised) {
//     DataServices.combatantManager.updateCombatant(combatant.id, 'status.surprised', false);
//     statusChanged = true;
//     ToastSystem.show(`${combatant.name} is no longer surprised`, 'info', 2000);
// }
        
        if (combatant.status.holdAction) {
            DataServices.combatantManager.updateCombatant(combatant.id, 'status.holdAction', false);
            statusChanged = true;
            ToastSystem.show(`${combatant.name} is no longer holding action`, 'info', 2000);
        }
        
        // Process conditions
        let conditionsChanged = false;
        combatant.conditions = combatant.conditions.filter(condition => {
            if (condition.duration !== 'infinite' && condition.duration > 0) {
                condition.duration--;
                conditionsChanged = true;
                
                if (condition.duration === 0) {
                    ToastSystem.show(`${condition.name} expired on ${combatant.name}`, 'warning', 2000);
                    return false; // Remove expired condition
                }
            }
            return true;
        });
        
        // Process effects
        let effectsChanged = false;
        combatant.effects = combatant.effects.filter(effect => {
            if (effect.duration !== 'infinite' && effect.duration > 0) {
                effect.duration--;
                effectsChanged = true;
                
                if (effect.duration === 0) {
                    ToastSystem.show(`${effect.name} expired on ${combatant.name}`, 'warning', 2000);
                    return false; // Remove expired effect
                }
            }
            return true;
        });
        
        // Update combatant if anything changed
        if (conditionsChanged) {
            DataServices.combatantManager.updateCombatant(combatant.id, 'conditions', combatant.conditions);
        }
        if (effectsChanged) {
            DataServices.combatantManager.updateCombatant(combatant.id, 'effects', combatant.effects);
        }
        
        // Force visual update if status changed
        if (statusChanged) {
            const card = DataServices.combatantManager.getCombatant(combatant.id);
            if (card && card.element) {
                card.update();
            }
        }
    }

    /**
     * Process turn end effects (currently not used, but available for future features)
     */
    static processTurnEnd(combatant) {
        console.log(`🎬 Processing turn end for ${combatant.name}`);
        // Future: Add turn-end processing if needed
    }

    /**
     * Handle Add Combatant button
     */
    static handleAddCombatant() {
        console.log('➕ Add Combatant clicked');
        
        // Populate the creature dropdown before showing modal
        this.populateCreatureDropdown();
        
        ModalSystem.show('add-combatant');
    }

    /**
     * Populate the creature dropdown with available creatures
     */
    static populateCreatureDropdown() {
        const dropdown = document.getElementById('creature-select');
        if (!dropdown || !DataServices.combatantManager) return;
        
        // Check if creatureDatabase is loaded
        if (!DataServices.combatantManager.creatureDatabase) {
            console.warn('Creature database not loaded yet');
            dropdown.innerHTML = '<option value="" disabled selected>Loading creatures...</option>';
            return;
        }
    
    // Clear existing options (except the placeholder)
    dropdown.innerHTML = '<option value="" disabled selected>Choose a creature...</option>';
    
    // Get available creatures
    const creatures = DataServices.combatantManager.getAvailableCreatures();
        
        // Group creatures by type
        const grouped = {
            player: creatures.filter(c => c.type === 'player'),
            enemy: creatures.filter(c => c.type === 'enemy'),
            npc: creatures.filter(c => c.type === 'npc')
        };
        
        // Add grouped options
        Object.entries(grouped).forEach(([type, creatureList]) => {
            if (creatureList.length > 0) {
        // Add optgroup
        const optgroup = document.createElement('optgroup');
        // Handle proper pluralization
        const pluralLabels = {
            'player': 'Players',
            'enemy': 'Enemies',
            'npc': 'NPCs'
        };
        optgroup.label = pluralLabels[type] || type.charAt(0).toUpperCase() + type.slice(1) + 's';
                
                // Add creatures to optgroup
                creatureList.forEach(creature => {
                    const option = document.createElement('option');
                    option.value = creature.id;
                    option.textContent = creature.name;
                    optgroup.appendChild(option);
                });
                
                dropdown.appendChild(optgroup);
            }
        });
    }

    /**
     * Handle Save Encounter button
     */
    static async handleSaveEncounter() {
        console.log('💾 Save Encounter clicked');
        
        try {
            // Gather all encounter data (same as before)
            const encounterData = {
                version: '1.0.0',
                timestamp: Date.now(),
                encounter: {
                    name: `D&D Encounter - ${new Date().toLocaleDateString()}`,
                    round: StateManager.state.combat.round,
                    currentTurnIndex: StateManager.state.combat.currentTurnIndex,
                    combatants: []
                }
            };
            
            // Get all combatants with their current state
            const allCombatants = DataServices.combatantManager.getAllCombatants();
            
            // Sort them in current display order
            const sortedCombatants = [...allCombatants].sort((a, b) => {
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
            
            // Store each combatant's data
            sortedCombatants.forEach(combatant => {
                encounterData.encounter.combatants.push({
                    creatureId: combatant.creatureId,
                    name: combatant.name,
                    type: combatant.type,
                    instanceData: combatant.getInstanceData()
                });
            });
            
            // Convert to JSON
            const jsonData = JSON.stringify(encounterData, null, 2);
            
            // Try to use File System Access API if available (Chrome, Edge)
            if ('showSaveFilePicker' in window) {
                try {
                    // This will show a save dialog where user can choose location and name
                    const handle = await window.showSaveFilePicker({
                        suggestedName: `dnd-encounter-${new Date().toISOString().split('T')[0]}.json`,
                        types: [{
                            description: 'D&D Encounter File',
                            accept: { 'application/json': ['.json'] }
                        }]
                    });
                    
                    // Create a writable stream
                    const writable = await handle.createWritable();
                    
                    // Write the file
                    await writable.write(jsonData);
                    await writable.close();
                    
                    ToastSystem.show('Encounter saved successfully', 'success', 3000);
                    return;
                    
                } catch (err) {
                    // User cancelled or API failed, fall back to download method
                    if (err.name !== 'AbortError') {
                        console.log('File System Access API failed, using fallback:', err);
                    }
                }
            }
            
            // Fallback to traditional download method
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Create download link
            const a = document.createElement('a');
            a.href = url;
            a.download = `dnd-encounter-${new Date().toISOString().split('T')[0]}.json`;
            
            // Trigger download
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Clean up
            URL.revokeObjectURL(url);
            
            ToastSystem.show('Encounter saved successfully', 'success', 3000);
            
        } catch (error) {
            console.error('Save failed:', error);
            ToastSystem.show('Failed to save encounter', 'error', 4000);
        }
    }

    /**
     * Handle Load Encounter button
     */
    static handleLoadEncounter() {
        console.log('📂 Load Encounter clicked');
        
        // Create file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        
        // Handle file selection
        fileInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            try {
                // Read file content
                const text = await file.text();
                const encounterData = JSON.parse(text);
                
                // Validate file structure
                if (!encounterData.encounter || !encounterData.encounter.combatants) {
                    throw new Error('Invalid encounter file format');
                }
                
                // Confirm loading
                const combatantCount = encounterData.encounter.combatants.length;
                const encounterName = encounterData.encounter.name || 'Unnamed Encounter';
                
                if (!confirm(`Load "${encounterName}" with ${combatantCount} combatants? This will replace the current encounter.`)) {
                    return;
                }
                
                // Clear current encounter
                DataServices.combatantManager.clearAll();
                
                // Load combat state
                StateManager.setState('combat.round', encounterData.encounter.round || 1);
                StateManager.setState('combat.currentTurnIndex', encounterData.encounter.currentTurnIndex || 0);
                
                // Load each combatant
                let activeFound = false;
                encounterData.encounter.combatants.forEach((combatantData, index) => {
                    // Add combatant using the stored creature ID and instance data
                    const newCombatant = DataServices.combatantManager.addCombatant(
                        combatantData.creatureId,
                        combatantData.instanceData
                    );
                    
                    if (newCombatant && combatantData.instanceData.isActive) {
                        activeFound = true;
                    }
                });
                
                // If no active combatant was found, set the first one as active
                if (!activeFound) {
                    const allCombatants = DataServices.combatantManager.getAllCombatants();
                    if (allCombatants.length > 0) {
                        const sortedCombatants = [...allCombatants].sort((a, b) => {
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
                        
                        if (sortedCombatants[0]) {
                            DataServices.combatantManager.updateCombatant(
                                sortedCombatants[0].id,
                                'status.isActive',
                                true
                            );
                        }
                    }
                }
                
                // Re-render everything
                DataServices.combatantManager.renderAll();
                
                // Update combat header
                EventHandlers.updateCombatHeader();
                
                ToastSystem.show(`Loaded "${encounterName}" successfully`, 'success', 4000);
                
            } catch (error) {
                console.error('Load failed:', error);
                ToastSystem.show(`Failed to load encounter: ${error.message}`, 'error', 4000);
            }
        });
        
        // Trigger file selection dialog
        fileInput.click();
    }

    /**
     * Handle Clear Encounter button - removes all combatants and resets combat
     */
    static handleClearEncounter() {
        console.log('🗑️ Clear Encounter clicked');
        
        // Get current combatant count for confirmation message
        const combatantCount = DataServices.combatantManager.getAllCombatants().length;
        
        if (combatantCount === 0) {
            ToastSystem.show('No combatants to clear', 'info', 2000);
            return;
        }
        
        // Ask for confirmation
        const confirmMessage = `Are you sure you want to clear all ${combatantCount} combatant${combatantCount !== 1 ? 's' : ''} and reset combat? This action cannot be undone.`;
        
        if (confirm(confirmMessage)) {
            // Clear all combatants
            DataServices.combatantManager.clearAll();
            
            // Reset combat state
            StateManager.setState('combat.round', 1);
            StateManager.setState('combat.currentTurnIndex', 0);
            
            // Update combat header (will show "No active combatant")
            EventHandlers.updateCombatHeader();
            
            ToastSystem.show('Encounter cleared and combat reset', 'success', 3000);
            console.log('✅ Encounter cleared');
        }
    }

    // ============================================================================
    // COMBATANT CARD HANDLERS
    // ============================================================================

    /**
     * Handle initiative editing
     */
    static handleEditInitiative(target) {
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');
        
        if (!combatantId) {
            console.error('No combatant ID found for initiative edit');
            return;
        }

        // Get the combatant from CombatantManager
        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }

        const currentValue = combatant.initiative;
        
        // Create inline input for editing
        const initiativeCircle = target;
        const initiativeValue = initiativeCircle.querySelector('.initiative-value');
        
        // Create input element
        const input = document.createElement('input');
        input.type = 'number';
        input.value = currentValue;
        input.min = '1';
        input.className = 'initiative-edit-input';
        input.style.width = '100%';
        input.style.height = '100%';
        input.style.textAlign = 'center';
        input.style.fontSize = 'inherit';
        input.style.fontWeight = 'inherit';
        input.style.border = 'none';
        input.style.background = 'transparent';
        input.style.color = 'inherit';
        
        // Replace the span with input
        initiativeValue.style.display = 'none';
        initiativeCircle.appendChild(input);
        
        // Focus and select the input
        input.focus();
        input.select();
        
        // Handle save on blur or enter
        const saveInitiative = () => {
            const newValue = parseInt(input.value);
            
            // Validation
            if (isNaN(newValue) || newValue < 1) {
                ToastSystem.show('Initiative must be 1 or higher', 'error', 2000);
                input.value = currentValue;
                input.focus();
                return false;
            }
            
            // Update only if value changed
            if (newValue !== currentValue) {
                // Update the combatant
                DataServices.combatantManager.updateCombatant(combatantId, 'initiative', newValue);

                // Clear manual order for all combatants when initiative changes
                const allCombatants = DataServices.combatantManager.getAllCombatants();
                allCombatants.forEach(combatant => {
                    if (combatant.manualOrder !== null) {
                        DataServices.combatantManager.updateCombatant(combatant.id, 'manualOrder', null);
                    }
                });

                // Re-sort all combatants
                DataServices.combatantManager.sortCombatants();
                
                // Re-render to show new order
                DataServices.combatantManager.renderAll();
                
                ToastSystem.show(`${combatant.name} initiative set to ${newValue}`, 'success', 2000);
            }
            
            // Clean up
            input.remove();
            initiativeValue.style.display = '';
            return true;
        };
        
        // Event listeners
        input.addEventListener('blur', saveInitiative);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (saveInitiative()) {
                    input.blur();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                input.value = currentValue;
                input.blur();
            }
        });
        
        // Prevent click propagation while editing
        input.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

   /**
     * Handle AC editing
     */
    static handleEditAC(target) {
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');
        
        if (!combatantId) {
            console.error('No combatant ID found for AC edit');
            return;
        }

        // Get the combatant from CombatantManager
        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }

        const currentValue = combatant.ac;
        
        // Get the AC display elements
        const acDisplay = target;
        const acValue = acDisplay.querySelector('.ac-value');
        
        // Create input element
        const input = document.createElement('input');
        input.type = 'number';
        input.value = currentValue;
        input.min = '1';
        input.max = '30';
        input.className = 'ac-edit-input';
        input.style.width = '40px';
        input.style.textAlign = 'center';
        input.style.fontSize = 'inherit';
        input.style.fontWeight = 'inherit';
        input.style.border = '1px solid var(--color-primary)';
        input.style.borderRadius = 'var(--border-radius)';
        input.style.background = 'var(--color-bg-primary)';
        input.style.color = 'inherit';
        input.style.padding = '2px 4px';
        
        // Replace the span with input
        acValue.style.display = 'none';
        acDisplay.appendChild(input);
        
        // Focus and select the input
        input.focus();
        input.select();
        
        // Handle save on blur or enter
        const saveAC = () => {
            const newValue = parseInt(input.value);
            
            // Validation (reasonable AC range in D&D)
            if (isNaN(newValue) || newValue < 1 || newValue > 30) {
                ToastSystem.show('AC must be between 1 and 30', 'error', 2000);
                input.value = currentValue;
                input.focus();
                return false;
            }
            
            // Update only if value changed
            if (newValue !== currentValue) {
                // Update the combatant
                DataServices.combatantManager.updateCombatant(combatantId, 'ac', newValue);
                
                ToastSystem.show(`${combatant.name} AC set to ${newValue}`, 'success', 2000);
            }
            
            // Clean up
            input.remove();
            acValue.style.display = '';
            acValue.textContent = newValue;
            return true;
        };
        
        // Event listeners
        input.addEventListener('blur', saveAC);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (saveAC()) {
                    input.blur();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                input.value = currentValue;
                input.blur();
            }
        });
        
        // Prevent click propagation while editing
        input.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    /**
     * Handle initiative order movement
     */
    static handleMoveInitiative(target, direction) {
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');
        
        if (!combatantId) return;

        // Get all combatants in their current display order
        const allCombatants = DataServices.combatantManager.getAllCombatants();
        const sortedCombatants = [...allCombatants].sort((a, b) => {
            // Use the same sorting logic as CombatantManager
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
        
        // Find the current combatant's position
        const currentIndex = sortedCombatants.findIndex(c => c.id === combatantId);
        if (currentIndex === -1) return;
        
        const currentCombatant = sortedCombatants[currentIndex];
        
        // Determine target index based on direction
        let targetIndex;
        if (direction === 'up') {
            targetIndex = currentIndex - 1;
            if (targetIndex < 0) {
                ToastSystem.show(`${currentCombatant.name} is already at the top`, 'warning', 2000);
                return;
            }
        } else {
            targetIndex = currentIndex + 1;
            if (targetIndex >= sortedCombatants.length) {
                ToastSystem.show(`${currentCombatant.name} is already at the bottom`, 'warning', 2000);
                return;
            }
        }
        
        // We'll assign manual order to all combatants to maintain the new order
        sortedCombatants.forEach((combatant, index) => {
            let newManualOrder;
            
            if (index === currentIndex) {
                // This is the combatant we're moving
                newManualOrder = targetIndex;
            } else if (direction === 'up' && index >= targetIndex && index < currentIndex) {
                // These combatants shift down
                newManualOrder = index + 1;
            } else if (direction === 'down' && index > currentIndex && index <= targetIndex) {
                // These combatants shift up
                newManualOrder = index - 1;
            } else {
                // These combatants stay in their current position
                newManualOrder = index;
            }
            
            // Update the manual order
            DataServices.combatantManager.updateCombatant(combatant.id, 'manualOrder', newManualOrder);
        });
        
        // Re-sort and re-render
        DataServices.combatantManager.sortCombatants();
        DataServices.combatantManager.renderAll();
        
        // Update turn index if we moved the active combatant
        const activeCombatant = sortedCombatants.find(c => c.status.isActive);
        if (activeCombatant) {
            // Find the new position of the active combatant
            const updatedCombatants = DataServices.combatantManager.getAllCombatants();
            const sortedUpdated = [...updatedCombatants].sort((a, b) => {
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
            
            const newActiveIndex = sortedUpdated.findIndex(c => c.status.isActive);
            if (newActiveIndex !== -1) {
                StateManager.setState('combat.currentTurnIndex', newActiveIndex);
            }
        }
        
        // Show success message
        const actionText = direction === 'up' ? 'moved up' : 'moved down';
        ToastSystem.show(`${currentCombatant.name} ${actionText} in initiative order`, 'success', 2000);
    }

    /**
     * Handle hold action toggle
     */
    static handleToggleHoldAction(target) {
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');
        
        if (!combatantId) return;

        const combatant = StateManager.state.combat.combatants.find(c => c.id === combatantId);
        const newHoldAction = !combatant.holdAction;
        
        StateManager.updateCombatant(combatantId, 'holdAction', newHoldAction);
        
        const action = newHoldAction ? 'holding action' : 'no longer holding action';
        ToastSystem.show(`${combatant.name} is ${action}`, 'info', 2000);
    }

    /**
     * Handle combatant removal
     */
    static handleRemoveCombatant(target) {
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');
        
        if (!combatantId) return;

        // Get the combatant from CombatantManager
        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) {
            console.error('Combatant not found:', combatantId);
            return;
        }
        
        if (confirm(`Remove ${combatant.name} from the encounter?`)) {
            // Check if this is the active combatant
            const allCombatants = DataServices.combatantManager.getAllCombatants();
            const sortedCombatants = allCombatants.sort((a, b) => {
                if (b.initiative !== a.initiative) {
                    return b.initiative - a.initiative;
                }
                return a.name.localeCompare(b.name);
            });
            
            const currentIndex = sortedCombatants.findIndex(c => c.status.isActive);
            const removingIndex = sortedCombatants.findIndex(c => c.id === combatantId);
            
            // Remove from CombatantManager
            DataServices.combatantManager.removeCombatant(combatantId);
            
            // Handle turn management if we removed the active combatant
            if (combatant.status.isActive && sortedCombatants.length > 1) {
                // Get the new list after removal
                const remainingCombatants = DataServices.combatantManager.getAllCombatants();
                const sortedRemaining = remainingCombatants.sort((a, b) => {
                    if (b.initiative !== a.initiative) {
                        return b.initiative - a.initiative;
                    }
                    return a.name.localeCompare(b.name);
                });
                
                if (sortedRemaining.length > 0) {
                    // Stay at the same position index (or last if we removed the last combatant)
                    const newActiveIndex = Math.min(removingIndex, sortedRemaining.length - 1);
                    const newActiveCombatant = sortedRemaining[newActiveIndex];
                    
                    if (newActiveCombatant) {
                        // Clear all active states first
                        remainingCombatants.forEach(c => {
                            DataServices.combatantManager.updateCombatant(c.id, 'status.isActive', false);
                        });
                        
                        // Set the new active combatant
                        DataServices.combatantManager.updateCombatant(newActiveCombatant.id, 'status.isActive', true);
                        
                        // Update StateManager's turn index
                        StateManager.setState('combat.currentTurnIndex', newActiveIndex);
                    }
                }
            }
            
            // Re-render all to update the display
            DataServices.combatantManager.renderAll();
            
            // Update the combat header
            EventHandlers.updateCombatHeader();
            
            ToastSystem.show(`${combatant.name} removed from encounter`, 'success', 3000);
        }
    }

   /**
     * Update the combat header display with current combatant info
     */
    static updateCombatHeader() {
        const headerElement = document.getElementById('initiative-header-display');
        if (!headerElement) return;
        
        // Get all combatants
        const allCombatants = DataServices.combatantManager.getAllCombatants();
        
        // Check if there are no combatants at all
        if (allCombatants.length === 0) {
            headerElement.innerHTML = 'When creatures are in the queue, click "Next Turn" to begin or continue the encounter.';
            return;
        }
        
        // Find the active combatant
        const activeCombatant = allCombatants.find(c => c.status.isActive);
        
        if (!activeCombatant) {
            // There are combatants but none are active
            headerElement.innerHTML = `Round ${StateManager.state.combat.round} | No active combatant`;
            return;
        }
        
        // Build health display
        const healthDisplay = activeCombatant.tempHP > 0 
            ? `${activeCombatant.currentHP}+${activeCombatant.tempHP}/${activeCombatant.maxHP}`
            : `${activeCombatant.currentHP}/${activeCombatant.maxHP}`;
        
        // Get cover icon
        const coverIcon = {
            'none': '○',
            'half': '◐',
            'three-quarters': '◕',
            'full': '●'
        }[activeCombatant.status.cover] || '○';
        
        // Get concentration icon
        const concentrationIcon = activeCombatant.status.concentration ? '🧠' : '';
        
        // Get hiding icon
        const hidingIcon = activeCombatant.status.hiding ? '👤' : '';
        
        // Build conditions list (empty string if no conditions)
        const conditionsList = activeCombatant.conditions.map(c => c.name).join(', ');
        
        // Build effects list (empty string if no effects)
        const effectsList = activeCombatant.effects.map(e => e.name).join(', ');
        
        // Build the header HTML - add data-creature-id and make it clickable
        headerElement.innerHTML = `
            Round ${StateManager.state.combat.round} | 
            <span class="current-turn-name clickable-name" 
                data-creature-id="${activeCombatant.creatureId}" 
                title="Click to view stat block">${activeCombatant.name}</span> 
            , 
            <span class="health-status">${healthDisplay}</span>
            , 
            AC ${activeCombatant.ac} 
            <span class="status-separator">|</span> <span class="cover-status">${coverIcon}</span>
            ${concentrationIcon ? `<span class="status-separator">|</span> <span class="cover-status">${concentrationIcon}</span>` : ''}
            ${hidingIcon ? `<span class="status-separator">|</span> <span class="cover-status">${hidingIcon}</span>` : ''}
            ${conditionsList ? `<span class="status-separator">|</span> <span class="conditions-list">${conditionsList}</span>` : ''}
            ${effectsList ? `<span class="status-separator">|</span> <span class="effects-list">${effectsList}</span>` : ''}
        `;
    }

    // ============================================================================
    // STATUS TOGGLE HANDLERS
    // ============================================================================

    /**
     * Handle concentration toggle
     */
    static handleToggleConcentration(target) {
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');
        
        if (!combatantId) return;

        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) return;

        // Toggle concentration
        const newConcentration = !combatant.status.concentration;
        
        // Update the combatant
        DataServices.combatantManager.updateCombatant(combatantId, 'status.concentration', newConcentration);
        
        // Show toast notification
        const status = newConcentration ? 'concentrating' : 'not concentrating';
        ToastSystem.show(`${combatant.name} is ${status}`, 'info', 2000);

        if (combatant.status.isActive) {
            EventHandlers.updateCombatHeader();
        }   
    }

    /**
     * Handle stealth/hiding toggle
     */
    static handleToggleStealth(target) {
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');
        
        if (!combatantId) return;

        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) return;

        // Toggle hiding
        const newHiding = !combatant.status.hiding;
        
        // Update the combatant
        DataServices.combatantManager.updateCombatant(combatantId, 'status.hiding', newHiding);
        
        // Show toast notification
        const status = newHiding ? 'hiding' : 'not hiding';
        ToastSystem.show(`${combatant.name} is ${status}`, 'info', 2000);

        // Update combat header if this is the active combatant
        if (combatant.status.isActive) {
            EventHandlers.updateCombatHeader();
        }
    }

    /**
     * Handle cover cycling
     */
    static handleCycleCover(target) {
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');
        
        if (!combatantId) return;

        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) return;

        // Cover states cycle: none -> half -> three-quarters -> full -> none
        const coverStates = ['none', 'half', 'three-quarters', 'full'];
        const currentIndex = coverStates.indexOf(combatant.status.cover);
        const nextIndex = (currentIndex + 1) % coverStates.length;
        const newCover = coverStates[nextIndex];
        
        // Update the combatant
        DataServices.combatantManager.updateCombatant(combatantId, 'status.cover', newCover);
        
        // Create friendly cover text for toast
        const coverTexts = {
            'none': 'no cover',
            'half': '½ cover',
            'three-quarters': '¾ cover',
            'full': 'full cover'
        };
        
        // Show toast notification
        ToastSystem.show(`${combatant.name} has ${coverTexts[newCover]}`, 'info', 2000);
        if (combatant.status.isActive) {
            EventHandlers.updateCombatHeader();
        }
    }

    /**
     * Handle surprise/hold action toggle
     * Cycles through: Surprised (😲) -> Hold Action (✊) -> Normal (😠)
     */
    static handleToggleSurprise(target) {
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');
        
        if (!combatantId) return;

        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) return;

        // Determine current state and next state
        let newSurprised = false;
        let newHoldAction = false;
        let statusText = '';
        
        if (combatant.status.surprised) {
            // Currently surprised -> move to hold action
            newSurprised = false;
            newHoldAction = true;
            statusText = 'holding action';
        } else if (combatant.status.holdAction) {
            // Currently hold action -> move to normal
            newSurprised = false;
            newHoldAction = false;
            statusText = 'ready for combat';
        } else {
            // Currently normal -> move to surprised
            newSurprised = true;
            newHoldAction = false;
            statusText = 'surprised';
        }
        
        // Update both status properties
        DataServices.combatantManager.updateCombatant(combatantId, 'status.surprised', newSurprised);
        DataServices.combatantManager.updateCombatant(combatantId, 'status.holdAction', newHoldAction);
        
        // Show toast notification
        ToastSystem.show(`${combatant.name} is ${statusText}`, 'info', 2000);
    }

    // ============================================================================
    // BATCH SELECTION HANDLERS
    // ============================================================================

   /**
     * Handle batch selection toggle
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
        const activeModal = ModalSystem.getActiveModal();
        if (activeModal) {
            const modal = document.querySelector(`[data-modal="${activeModal}"]`);
            if (modal) {
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
                }
                
                // Update batch button visibility
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
        }
        
        // Show selection count toast (only if there are selections)
        if (count > 0) {
            ToastSystem.show(`${count} combatant${count !== 1 ? 's' : ''} selected`, 'info', 1500);
        }
    }

    // ============================================================================
    // CONDITION/EFFECT HANDLERS
    // ============================================================================

   /**
     * Handle condition removal
     */
    static handleClearCondition(target) {
        const badge = target.closest('.combatant-condition-badge');
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');

        if (!combatantId || !badge) return;

        // Hide condition tooltip before removing the badge
        this.hideConditionTooltip();

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
        if (combatant.status.isActive) {
            EventHandlers.updateCombatHeader();
        }
    }

    /**
     * Handle effect removal
     */
    static handleClearEffect(target) {
        const badge = target.closest('.combatant-effect-badge');
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');

        if (!combatantId || !badge) return;

        // Hide condition tooltip before removing the badge
        this.hideConditionTooltip();

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
        if (combatant.status.isActive) {
            EventHandlers.updateCombatHeader();
        }
    }

    /**
     * Handle note clearing
     */
    static handleClearNote(target) {
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');
        
        if (!combatantId) return;

        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) return;
        
        // Check if this is clearing a name note or general note
        const noteDisplay = target.closest('.combatant-note-display');
        const isGeneralNote = noteDisplay !== null;
        
        if (isGeneralNote) {
            // Clear the general note
            DataServices.combatantManager.updateCombatant(combatantId, 'notes', '');
            ToastSystem.show(`Note cleared for ${combatant.name}`, 'success', 2000);
        } else {
            // Clear the name note (though this might not be used since name notes don't have a clear button)
            DataServices.combatantManager.updateCombatant(combatantId, 'nameNote', '');
            ToastSystem.show(`Name note cleared for ${combatant.name}`, 'success', 2000);
        }
    }

    /**
     * Handle note form submission
     */
    static handleNoteForm(form) {
        const formData = new FormData(form);
        const noteText = formData.get('noteText')?.trim() || '';
        
        // Get the target combatant ID from the modal
        const modal = form.closest('.modal-overlay');
        const targetId = modal.getAttribute('data-current-target');
        const noteType = modal.getAttribute('data-current-note-type') || 'general';
        const combatant = DataServices.combatantManager.getCombatant(targetId);
        
        if (!combatant) {
            console.error('Target combatant not found:', targetId);
            ToastSystem.show('Error: Combatant not found', 'error', 3000);
            return;
        }
        
        // Update the appropriate note field
        if (noteType === 'name') {
            DataServices.combatantManager.updateCombatant(combatant.id, 'nameNote', noteText);
        } else {
            DataServices.combatantManager.updateCombatant(combatant.id, 'notes', noteText);
        }
        
        // Close modal
        ModalSystem.hideAll();
        
        // Show success message
        const noteTypeText = noteType === 'name' ? 'Name note' : 'Note';
        if (noteText) {
            ToastSystem.show(`${noteTypeText} added to ${combatant.name}`, 'success', 2000);
        } else {
            ToastSystem.show(`${noteTypeText} cleared for ${combatant.name}`, 'success', 2000);
        }
        
        // Reset form
        form.reset();
    }

    // ============================================================================
    // FORM HANDLERS
    // ============================================================================

    /**
     * Handle form submissions
     */
    static handleFormSubmission(formType, form, event) {
        console.log(`📝 Form submission: ${formType}`);
        
        switch (formType) {
            case 'add-combatant':
                this.handleAddCombatantForm(form);
                break;
            case 'condition':
                this.handleConditionForm(form);
                break;
            case 'effect':
                this.handleEffectForm(form);
                break;
            case 'hp-modification':
                this.handleHPModificationForm(form);
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
     * Handle add combatant form submission
     */
    static handleAddCombatantForm(form) {
        const formData = new FormData(form);
        
        // Get form values
        const creatureId = formData.get('creatureId');
        const initiative = parseInt(formData.get('initiative'));
        const currentHP = formData.get('currentHP') ? parseInt(formData.get('currentHP')) : null;
        const nameNote = formData.get('nameNote')?.trim() || ''; // Add this line
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
        
        // Create instance data
        const instanceData = {
            initiative: initiative,
            nameNote: nameNote, // Add this line
            surprised: startingSurprised,
            hiding: startingHiding
        };
        
        // Only set currentHP if it was provided
        if (currentHP !== null && !isNaN(currentHP)) {
            instanceData.currentHP = currentHP;
        }
        
        // Add the combatant using CombatantManager
        if (DataServices.combatantManager) {
            const newCombatant = DataServices.combatantManager.addCombatant(creatureId, instanceData);
            
            if (newCombatant) {
                // Re-render all combatants to show the new one
                DataServices.combatantManager.renderAll();
                
                // Close modal and show success message
                ModalSystem.hideAll();
                ToastSystem.show(`${newCombatant.name} added to encounter!`, 'success', 3000);
                
                // Reset form for next use
                form.reset();
            } else {
                ToastSystem.show('Failed to add combatant', 'error', 3000);
            }
        } else {
            console.error('CombatantManager not initialized');
            ToastSystem.show('System error: Cannot add combatant', 'error', 3000);
        }
    }

    /**
     * Handle condition form submission
     */
    static handleConditionForm(form) {
        const formData = new FormData(form);
        
        // Get form values
        const condition = formData.get('condition');
        const turns = formData.get('turns');
        const note = formData.get('note') || '';
        console.log('Condition form - turns value:', turns, 'type:', typeof turns);
        
        // Validation
        if (!condition) {
            ToastSystem.show('Please select a condition', 'error', 2000);
            return;
        }
        
        if (note.length > 15) {
            ToastSystem.show('Note must be 15 characters or less', 'error', 2000);
            return;
        }
        
        // Get the target combatant ID from the modal
        const modal = form.closest('.modal-overlay');
        const targetId = modal.getAttribute('data-current-target');
        const combatant = DataServices.combatantManager.getCombatant(targetId);
        
        if (!combatant) {
            console.error('Target combatant not found:', targetName);
            ToastSystem.show('Error: Combatant not found', 'error', 3000);
            return;
        }
        
        // Check if condition already exists
        const existingIndex = combatant.conditions.findIndex(c => c.name === condition);
        if (existingIndex !== -1) {
            // Update existing condition
            combatant.conditions[existingIndex] = {
                name: condition,
                duration: turns === 'infinite' ? 'infinite' : parseInt(turns) || 1,
                note: note
            };
            ToastSystem.show(`Updated ${condition} on ${combatant.name}`, 'success', 2000);
        } else {
            // Add new condition
            const newCondition = {
                name: condition,
                duration: turns === 'infinite' ? 'infinite' : parseInt(turns) || 1,
                note: note
            };
            
            combatant.conditions.push(newCondition);
            ToastSystem.show(`${combatant.name} is now ${condition}`, 'success', 3000);
        }
        
        // Update the combatant display
        DataServices.combatantManager.updateCombatant(combatant.id, 'conditions', combatant.conditions);
        
        // Close modal
        ModalSystem.hideAll();

        // Update combat header if this is the active combatant
        if (combatant.status.isActive) {
            EventHandlers.updateCombatHeader();
        }
        
        // Reset form
        form.reset();
    }

    /**
     * Handle effect form submission
     */
    static handleEffectForm(form) {
        const formData = new FormData(form);
        
        // Get form values - check both custom input and dropdown
        const customEffect = formData.get('custom-effect');
        const dropdownEffect = document.getElementById('effect-dropdown')?.value;
        const effectName = customEffect || dropdownEffect;
        
        const turns = formData.get('turns');
        const note = formData.get('note') || '';
        console.log('Effect form - turns value:', turns, 'type:', typeof turns);
        
        // Validation
        if (!effectName || effectName === '') {
            ToastSystem.show('Please enter or select an effect', 'error', 2000);
            return;
        }
        
        if (note.length > 15) {
            ToastSystem.show('Note must be 15 characters or less', 'error', 2000);
            return;
        }
        
        // Get the target combatant ID from the modal
        const modal = form.closest('.modal-overlay');
        const targetId = modal.getAttribute('data-current-target');
        const combatant = DataServices.combatantManager.getCombatant(targetId);
        
        if (!combatant) {
            console.error('Target combatant not found:', targetName);
            ToastSystem.show('Error: Combatant not found', 'error', 3000);
            return;
        }
        
        // Check if effect already exists
        const existingIndex = combatant.effects.findIndex(e => e.name === effectName);
        if (existingIndex !== -1) {
            // Update existing effect
            combatant.effects[existingIndex] = {
                name: effectName,
                duration: turns === 'infinite' ? 'infinite' : parseInt(turns) || 1,
                note: note
            };
            ToastSystem.show(`Updated ${effectName} on ${combatant.name}`, 'success', 2000);
        } else {
            // Add new effect
            const newEffect = {
                name: effectName,
                duration: turns === 'infinite' ? 'infinite' : parseInt(turns) || 1,
                note: note
            };
            
            combatant.effects.push(newEffect);
            ToastSystem.show(`${combatant.name} now has ${effectName}`, 'success', 3000);
        }
        
        // Update the combatant display
        DataServices.combatantManager.updateCombatant(combatant.id, 'effects', combatant.effects);
        
        // Update the combatant display
        DataServices.combatantManager.updateCombatant(combatant.id, 'effects', combatant.effects);

        // Add to recent effects
        this.addToRecentEffects(effectName);

        // Close modal
        ModalSystem.hideAll();

        // Close modal
        ModalSystem.hideAll();

        if (combatant.status.isActive) {
            EventHandlers.updateCombatHeader();
        }
        
        // Reset form
        form.reset();
        // Reset dropdown if it exists
        const dropdown = document.getElementById('effect-dropdown');
        if (dropdown) dropdown.value = '';
    }

    /**
     * Handle batch condition application
    */
    static handleBatchCondition(target) {
        // Get modal and form data
        const modal = target.closest('.modal-overlay');
        if (!modal) return;
        
        const form = modal.querySelector('form');
        const formData = new FormData(form);
        
        // Get form values
        const condition = formData.get('condition');
        const turns = formData.get('turns');
        const note = formData.get('note') || '';
        
        // Validation
        if (!condition) {
            ToastSystem.show('Please select a condition', 'error', 2000);
            return;
        }
        
        if (note.length > 15) {
            ToastSystem.show('Note must be 15 characters or less', 'error', 2000);
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
        let updatedCount = 0;
        
        selectedCombatants.forEach(combatant => {
            // Check if condition already exists
            const existingIndex = combatant.conditions.findIndex(c => c.name === condition);
            
            if (existingIndex !== -1) {
                // Update existing condition
                combatant.conditions[existingIndex] = {
                    name: condition,
                    duration: turns === 'infinite' ? 'infinite' : parseInt(turns) || 1,
                    note: note
                };
                updatedCount++;
            } else {
                // Add new condition
                const newCondition = {
                    name: condition,
                    duration: turns === 'infinite' ? 'infinite' : parseInt(turns) || 1,
                    note: note
                };
                combatant.conditions.push(newCondition);
                successCount++;
            }
            
            // Update the combatant
            DataServices.combatantManager.updateCombatant(combatant.id, 'conditions', combatant.conditions);
        });
        
        // Close modal
        ModalSystem.hideAll();
        
        // Show summary toast
        let message;
        if (successCount > 0 && updatedCount > 0) {
            message = `${condition} applied to ${successCount} and updated on ${updatedCount} combatant(s)`;
        } else if (successCount > 0) {
            message = `${condition} applied to ${successCount} combatant${successCount !== 1 ? 's' : ''}`;
        } else {
            message = `${condition} updated on ${updatedCount} combatant${updatedCount !== 1 ? 's' : ''}`;
        }
        ToastSystem.show(message, 'success', 3000);
        
        // Update combat header if active combatant was affected
        const activeCombatant = selectedCombatants.find(c => c.status.isActive);
        if (activeCombatant) {
            EventHandlers.updateCombatHeader();
        }
        
        // Reset form
        form.reset();
    }
    /**
     * Handle batch effect application
     */
    static handleBatchEffect(target) {
        // Get modal and form data
        const modal = target.closest('.modal-overlay');
        if (!modal) return;
        
        const form = modal.querySelector('form');
        const formData = new FormData(form);
        
        // Get form values - check both custom input and dropdown
        const customEffect = formData.get('custom-effect');
        const dropdownEffect = document.getElementById('effect-dropdown')?.value;
        const effectName = customEffect || dropdownEffect;
        
        const turns = formData.get('turns');
        const note = formData.get('note') || '';
        
        // Validation
        if (!effectName || effectName === '') {
            ToastSystem.show('Please enter or select an effect', 'error', 2000);
            return;
        }
        
        if (note.length > 15) {
            ToastSystem.show('Note must be 15 characters or less', 'error', 2000);
            return;
        }
        
        // Get selected combatants
        const selectedCombatants = this.getSelectedCombatants();
        if (selectedCombatants.length === 0) {
            ToastSystem.show('No combatants selected', 'warning', 2000);
            return;
        }
        
        // Apply effect to all selected combatants
        let successCount = 0;
        let updatedCount = 0;
        
        selectedCombatants.forEach(combatant => {
            // Check if effect already exists
            const existingIndex = combatant.effects.findIndex(e => e.name === effectName);
            
            if (existingIndex !== -1) {
                // Update existing effect
                combatant.effects[existingIndex] = {
                    name: effectName,
                    duration: turns === 'infinite' ? 'infinite' : parseInt(turns) || 1,
                    note: note
                };
                updatedCount++;
            } else {
                // Add new effect
                const newEffect = {
                    name: effectName,
                    duration: turns === 'infinite' ? 'infinite' : parseInt(turns) || 1,
                    note: note
                };
                combatant.effects.push(newEffect);
                successCount++;
            }
            
            // Update the combatant
            DataServices.combatantManager.updateCombatant(combatant.id, 'effects', combatant.effects);
        });
        
        // Close modal
        ModalSystem.hideAll();
        
        // Show summary toast
        let message;
        if (successCount > 0 && updatedCount > 0) {
            message = `${effectName} applied to ${successCount} and updated on ${updatedCount} combatant(s)`;
        } else if (successCount > 0) {
            message = `${effectName} applied to ${successCount} combatant${successCount !== 1 ? 's' : ''}`;
        } else {
            message = `${effectName} updated on ${updatedCount} combatant${updatedCount !== 1 ? 's' : ''}`;
        }
        ToastSystem.show(message, 'success', 3000);
        
        // Update combat header if active combatant was affected
        const activeCombatant = selectedCombatants.find(c => c.status.isActive);
        if (activeCombatant) {
            EventHandlers.updateCombatHeader();
        }
        
        // Reset form
        form.reset();
        // Reset dropdown if it exists
        const dropdown = document.getElementById('effect-dropdown');
        if (dropdown) dropdown.value = '';
    }

    /**
     * Handle batch note application
     */
    static handleBatchNote(target) {
        // Get modal and form data
        const modal = target.closest('.modal-overlay');
        if (!modal) return;
        
        const form = modal.querySelector('form');
        const formData = new FormData(form);
        const noteText = formData.get('noteText')?.trim() || '';
        
        // Get selected combatants
        const selectedCombatants = this.getSelectedCombatants();
        if (selectedCombatants.length === 0) {
            ToastSystem.show('No combatants selected', 'warning', 2000);
            return;
        }
        
        // Apply note to all selected combatants
        let successCount = 0;
        
        selectedCombatants.forEach(combatant => {
            // Update the note
            DataServices.combatantManager.updateCombatant(combatant.id, 'notes', noteText);
            successCount++;
        });
        
        // Close modal
        ModalSystem.hideAll();
        
        // Show summary message
        if (noteText) {
            ToastSystem.show(`Note added to ${successCount} combatant${successCount !== 1 ? 's' : ''}`, 'success', 3000);
        } else {
            ToastSystem.show(`Note cleared for ${successCount} combatant${successCount !== 1 ? 's' : ''}`, 'success', 3000);
        }
        
        // Reset form
        form.reset();
    }

    /**
     * Handle infinity toggle button
     */
    static handleInfinityToggle(target) {
        const button = target;
        const durationInput = document.getElementById(button.getAttribute('data-toggle-target'));
        
        if (!durationInput) return;
        
        const isInfinite = button.getAttribute('data-infinity-state') === 'true';
        
        if (isInfinite) {
            // Currently infinite, switch to finite
            button.setAttribute('data-infinity-state', 'false');
            button.classList.remove('duration-set-permanent');
            durationInput.type = 'number';  // Set back to number
            durationInput.value = '5';
            durationInput.style.display = 'block';
            
            // Hide "forever" text if it exists
            const foreverText = button.parentElement.querySelector('.forever-text');
            if (foreverText) foreverText.style.display = 'none';
        } else {
            // Currently finite, switch to infinite
            button.setAttribute('data-infinity-state', 'true');
            button.classList.add('duration-set-permanent');
            durationInput.type = 'text';  // Change to text to allow 'infinite'
            durationInput.value = 'infinite';
            durationInput.style.display = 'none';
            
            // Show "forever" text if it exists
            const foreverText = button.parentElement.querySelector('.forever-text');
            if (foreverText) foreverText.style.display = 'block';
        }
    }

    /**
     * Handle field changes for real-time updates
     */
    static handleFieldChange(fieldType, target, event) {
        // Handle real-time field updates as needed
        // For example, character counters for notes
        if (fieldType === 'note' && target.hasAttribute('data-char-counter')) {
            const maxLength = target.getAttribute('maxlength');
            const currentLength = target.value.length;
            // Could add character counter display here
        }
    }

    // ============================================================================
    // CREATURE DATABASE HANDLERS
    // ============================================================================

    static selectedDatabaseCreatureId = null;

    /**
     * Handle opening the creature database modal
     */
    static handleOpenCreatureDatabase() {
        console.log('📚 Opening creature database');
        
        // Clear any previous selection
        this.selectedDatabaseCreatureId = null;
        
        // Initialize the creature list if not already done
        if (!this.creatureListInitialized) {
            this.initializeCreatureList();
        }
        
        ModalSystem.show('creature-database');
    }

    /**
     * Initialize the creature list in the database modal
     */
    static async initializeCreatureList() {
        console.log('🔄 Initializing creature list');
        
        try {
            // Get the creature database
            const creatures = DataServices.combatantManager.creatureDatabase || [];
            
            // Update counts
            document.getElementById('total-count').textContent = creatures.length;
            document.getElementById('visible-count').textContent = creatures.length;
            
            // Render the creature list
            this.renderCreatureList(creatures);
            
            this.creatureListInitialized = true;
        } catch (error) {
            console.error('Failed to initialize creature list:', error);
            ToastSystem.show('Failed to load creature database', 'error', 3000);
        }
    }

    /**
     * Render the creature list with virtual scrolling support
     */
    static renderCreatureList(creatures, searchTerm = '', typeFilter = 'all') {
        const listContainer = document.querySelector('.creature-list-viewport');
        if (!listContainer) return;
        
        // Clear existing content
        listContainer.innerHTML = '';
        
        // Filter creatures
        let filteredCreatures = creatures;
        
        // Apply type filter
        if (typeFilter !== 'all') {
            filteredCreatures = filteredCreatures.filter(c => c.type === typeFilter);
        }
        
        // Apply search filter
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filteredCreatures = filteredCreatures.filter(c => 
                c.name.toLowerCase().includes(search) ||
                (c.cr && c.cr.toString().includes(search)) ||
                (c.race && c.race.toLowerCase().includes(search))
            );
        }
        
        // Update visible count
        document.getElementById('visible-count').textContent = filteredCreatures.length;
        
        // Create creature items
        filteredCreatures.forEach(creature => {
            const item = this.createCreatureListItem(creature);
            listContainer.appendChild(item);
        });
        
        // Show empty state if no creatures
        if (filteredCreatures.length === 0) {
            listContainer.innerHTML = '<div class="creature-list-empty">No creatures found</div>';
        }
    }

    /**
     * Create a creature list item element
     */
    static createCreatureListItem(creature) {
        const item = document.createElement('div');
        item.className = 'creature-list-item';
        item.setAttribute('data-creature-id', creature.id);
        
        const typeClass = `creature-name-${creature.type}`;
        const badgeClass = `badge-${creature.type}`;
        
        // Check if this creature is in quick view
        const quickViewCreatures = this.getQuickViewCreatures();
        const isInQuickView = quickViewCreatures.includes(creature.id);
        
        item.innerHTML = `
            <div class="creature-item-header">
                <span class="creature-name ${typeClass}">${creature.name}</span>
                <div class="creature-item-controls">
                    <span class="creature-type-badge ${badgeClass}">${creature.type.charAt(0).toUpperCase() + creature.type.slice(1)}</span>
                    <label class="quick-view-checkbox" title="${isInQuickView ? 'Remove from Quick View' : 'Add to Quick View'}">
                        <input type="checkbox" 
                            class="quick-view-check" 
                            data-creature-id="${creature.id}"
                            ${isInQuickView ? 'checked' : ''}>
                        <span class="quick-view-checkmark"></span>
                    </label>
                </div>
            </div>
            <div class="creature-item-stats">
                <span class="creature-stat">AC: ${creature.ac}</span>
                <span class="creature-stat">HP: ${creature.maxHP}</span>
                ${creature.cr ? `<span class="creature-stat">CR: ${creature.cr}</span>` : ''}
            </div>
        `;
        
        // Add click handler for the main item (not the checkbox)
        item.addEventListener('click', (e) => {
            // Don't trigger if clicking the checkbox
            if (!e.target.closest('.quick-view-checkbox')) {
                this.handleSelectCreature(creature.id);
            }
        });
        
        // Add change handler for the checkbox
        const checkbox = item.querySelector('.quick-view-check');
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            this.handleQuickViewToggle(creature.id, e.target.checked);
        });
        
        return item;
    }

    /**
     * Handle creature selection in the database
     */
    static handleSelectCreature(creatureId) {
        console.log('🎯 Selected creature:', creatureId);
        
        // Store the selected creature ID
        this.selectedDatabaseCreatureId = creatureId;
        
        // Update selected state
        document.querySelectorAll('.creature-list-item').forEach(item => {
            item.classList.toggle('selected', item.getAttribute('data-creature-id') === creatureId);
        });
        
        // Load creature details
        this.loadCreatureDetails(creatureId);
    }

    /**
     * Load and display creature details
     */
    static async loadCreatureDetails(creatureId) {
        const detailsContent = document.getElementById('creature-details-content');
        const detailsName = document.getElementById('detail-creature-name');
        const actionButtons = document.querySelectorAll('.creature-actions button');
        
        try {
            // Find the creature
            const creature = DataServices.combatantManager.creatureDatabase.find(c => c.id === creatureId);
            if (!creature) {
                throw new Error('Creature not found');
            }
            
            // Update header
            detailsName.textContent = creature.name;
            
            // Show action buttons
            actionButtons.forEach(btn => btn.style.display = 'inline-flex');
            
            // Store current creature ID for actions
            document.querySelector('[data-action="edit-creature"]').setAttribute('data-creature-id', creatureId);
            document.querySelector('[data-action="add-to-encounter"]').setAttribute('data-creature-id', creatureId);
            document.querySelector('[data-action="delete-creature"]').setAttribute('data-creature-id', creatureId);
            
            // Check if creature has full stat block
            if (creature.hasFullStatBlock && creature.statBlock) {
                // Render full stat block
                detailsContent.innerHTML = this.renderFullStatBlock(creature);
            } else {
                // Render basic info
                detailsContent.innerHTML = this.renderBasicCreatureInfo(creature);
            }
            
        } catch (error) {
            console.error('Failed to load creature details:', error);
            detailsContent.innerHTML = '<div class="empty-state"><p>Failed to load creature details</p></div>';
        }
    }

    /**
     * Render basic creature information
     */
    static renderBasicCreatureInfo(creature) {
        // Ensure creature object exists
        if (!creature) {
            return '<div class="creature-basic-info"><p>No creature data available</p></div>';
        }
        
        // Safe property access with defaults
        const name = creature.name || 'Unknown Creature';
        const id = creature.id || '';
        const size = creature.size || 'Medium';
        const race = creature.race || 'creature';
        const type = creature.type || 'enemy';
        const ac = creature.ac || 10;
        const maxHP = creature.maxHP || 1;
        const cr = creature.cr || null;
        const description = creature.description || null;
        const source = creature.source || null;
        
        return `
            <div class="creature-basic-info">
                <div class="stat-block-title-row">
                    <button class="stat-block-window-btn" 
                            data-creature-id="${id}"
                            title="Open in new window">⧉</button>
                    <h4>${name}</h4>
                    <button class="stat-block-add-btn" 
                            data-creature-id="${id}"
                            title="Add to encounter"></button>
                </div>
                <p class="creature-type">${size} ${race}</p>
                
                <div class="stat-block-section">
                    <div class="stat-block-row">
                        <span class="stat-label">Type:</span>
                        <span class="stat-value">${type}</span>
                    </div>
                    <div class="stat-block-row">
                        <span class="stat-label">Armor Class:</span>
                        <span class="stat-value">${ac}</span>
                    </div>
                    <div class="stat-block-row">
                        <span class="stat-label">Hit Points:</span>
                        <span class="stat-value">${maxHP}</span>
                    </div>
                    ${cr ? `
                    <div class="stat-block-row">
                        <span class="stat-label">Challenge:</span>
                        <span class="stat-value">${cr}</span>
                    </div>
                    ` : ''}
                </div>
                
                ${description ? `
                <div class="stat-block-section">
                    <p>${description}</p>
                </div>
                ` : ''}
                
                ${source ? `
                <div class="stat-block-section">
                    <div class="stat-block-row">
                        <span class="stat-label">Source:</span>
                        <span class="stat-value">${source}</span>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Handle search input
     */
    static handleSearchCreatures(target) {
        const searchTerm = target.value;
        const typeFilter = document.getElementById('creature-type-filter').value;
        const creatures = DataServices.combatantManager.creatureDatabase || [];
        
        this.renderCreatureList(creatures, searchTerm, typeFilter);
    }

    /**
     * Handle type filter change
     */
    static handleFilterCreatureType(target) {
        const typeFilter = target.value;
        const searchTerm = document.getElementById('creature-search').value;
        const creatures = DataServices.combatantManager.creatureDatabase || [];
        
        this.renderCreatureList(creatures, searchTerm, typeFilter);
    }

    /**
     * Handle adding a new creature
     */
    static handleAddNewCreature() {
        console.log('➕ Adding new creature');
        
        // Reset form
        const form = document.getElementById('creature-form');
        form.reset();
        
        // Update form title and button
        document.getElementById('creature-form-title').textContent = 'Add New Creature';
        document.getElementById('creature-form-submit-text').textContent = 'Add Creature';
        
        // Clear ID field
        document.getElementById('creature-form-id').value = '';
        
        // Show the form modal
        ModalSystem.show('creature-form');
    }

    /**
     * Render full stat block for a creature
     */
    static renderFullStatBlock(creature) {
        const sb = creature.statBlock;
        
        // If no stat block data, fall back to basic info
        if (!sb) {
            return this.renderBasicCreatureInfo(creature);
        }
        
        // Helper function to format modifier
        const formatModifier = (mod) => {
            if (mod === null || mod === undefined) return '';
            return mod >= 0 ? `+${mod}` : `${mod}`;
        };
        
        // Helper function to safely get nested property
        const safeGet = (obj, path, defaultValue = null) => {
            const keys = path.split('.');
            let result = obj;
            for (const key of keys) {
                if (result && typeof result === 'object' && key in result) {
                    result = result[key];
                } else {
                    return defaultValue;
                }
            }
            return result;
        };
        
        // Build the stat block HTML, only including sections with data
        let html = `
            <div class="stat-block">
                <div class="stat-block-header">
                    <div class="stat-block-title-row">
                        <button class="stat-block-window-btn" 
                                data-creature-id="${creature.id}"
                                title="Open in new window">⧉</button>
                        <h3 class="stat-block-creature-name">${creature.name}</h3>
                        <button class="stat-block-add-btn" 
                                data-creature-id="${creature.id}"
                                title="Add to encounter"></button>
                    </div>
                    <p class="creature-type">${sb.fullType || `${creature.size || 'Medium'} ${creature.race || 'creature'}`}</p>
                </div>
        `;
        
        // Basic stats section
        html += '<div class="stat-block-section">';
        
        // Armor Class
        if (sb.armorClass) {
            const acValue = sb.armorClass.value || creature.ac || 10;
            const acType = sb.armorClass.type ? ` (${sb.armorClass.type})` : '';
            html += `
                <div class="stat-block-row">
                    <span class="stat-label">Armor Class:</span>
                    <span class="stat-value">${acValue}${acType}</span>
                </div>
            `;
        } else if (creature.ac) {
            html += `
                <div class="stat-block-row">
                    <span class="stat-label">Armor Class:</span>
                    <span class="stat-value">${creature.ac}</span>
                </div>
            `;
        }
        
        // Hit Points
        if (sb.hitPoints) {
            const hpAverage = sb.hitPoints.average || creature.maxHP || 1;
            const hpFormula = sb.hitPoints.formula ? ` (${sb.hitPoints.formula})` : '';
            html += `
                <div class="stat-block-row">
                    <span class="stat-label">Hit Points:</span>
                    <span class="stat-value">${hpAverage}${hpFormula}</span>
                </div>
            `;
        } else if (creature.maxHP) {
            html += `
                <div class="stat-block-row">
                    <span class="stat-label">Hit Points:</span>
                    <span class="stat-value">${creature.maxHP}</span>
                </div>
            `;
        }
        
        // Speed
        if (sb.speed) {
            const speedStr = this.formatSpeed(sb.speed);
            if (speedStr) {
                html += `
                    <div class="stat-block-row">
                        <span class="stat-label">Speed:</span>
                        <span class="stat-value">${speedStr}</span>
                    </div>
                `;
            }
        }
        
        // Initiative (if present)
        if (sb.initiative) {
            const initMod = formatModifier(sb.initiative.modifier);
            if (initMod) {
                const initTotal = sb.initiative.total ? ` (${sb.initiative.total})` : '';
                html += `
                    <div class="stat-block-row">
                        <span class="stat-label">Initiative:</span>
                        <span class="stat-value">${initMod}${initTotal}</span>
                    </div>
                `;
            }
        }
        
        html += '</div>';
        
        // Ability Scores (only if they exist)
        if (sb.abilities && Object.values(sb.abilities).some(ability => ability && ability.score)) {
            html += `<div class="ability-scores">`;
            
            ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(key => {
                const ability = sb.abilities[key];
                if (ability && ability.score) {
                    const mod = formatModifier(ability.modifier);
                    html += `
                        <div class="ability">
                            <div class="ability-name">${key.toUpperCase()}</div>
                            <div class="ability-score">${ability.score}${mod ? ` (${mod})` : ''}</div>
                        </div>
                    `;
                } else {
                    // Empty placeholder for missing ability
                    html += `
                        <div class="ability">
                            <div class="ability-name">${key.toUpperCase()}</div>
                            <div class="ability-score">—</div>
                        </div>
                    `;
                }
            });
            
            html += `</div>`;
        }
        
        // Add other sections only if they have content
        html += this.renderSavingThrows(sb.savingThrows);
        html += this.renderSkills(sb.skills);
        html += this.renderDamageInfo(sb);
        html += this.renderSenses(sb.senses);
        html += this.renderLanguages(sb.languages);
        html += this.renderChallengeRating(sb.challengeRating || { cr: creature.cr });
        html += this.renderTraits(sb.traits);
        html += this.renderSpellcasting(sb.spellcasting);
        html += this.renderActions(sb.actions);
        html += this.renderLegendaryActions(sb.legendaryActions);
        
        html += '</div>';
        
        return html;
    }

    /**
     * Format speed string
     */
    static formatSpeed(speed) {
        if (!speed || typeof speed !== 'object') return '';
        
        const speeds = [];
        if (speed.walk) speeds.push(`${speed.walk} ft.`);
        if (speed.burrow) speeds.push(`burrow ${speed.burrow} ft.`);
        if (speed.climb) speeds.push(`climb ${speed.climb} ft.`);
        if (speed.fly) speeds.push(`fly ${speed.fly} ft.`);
        if (speed.swim) speeds.push(`swim ${speed.swim} ft.`);
        
        return speeds.join(', ');
    }

    /**
     * Render saving throws section
     */
    static renderSavingThrows(saves) {
        if (!saves || typeof saves !== 'object') return '';
        
        const activeSaves = Object.entries(saves).filter(([key, value]) => 
            value !== null && value !== undefined && value !== ''
        );
        
        if (activeSaves.length === 0) return '';
        
        return `
            <div class="stat-block-section">
                <div class="stat-block-row">
                    <span class="stat-label">Saving Throws:</span>
                    <span class="stat-value">${activeSaves.map(([key, value]) => 
                        `${key.charAt(0).toUpperCase() + key.slice(1)} +${value}`
                    ).join(', ')}</span>
                </div>
            </div>
        `;
    }

    /**
     * Render skills section
     */
    static renderSkills(skills) {
        if (!skills || typeof skills !== 'object') return '';
        
        const skillEntries = Object.entries(skills).filter(([key, value]) => 
            value !== null && value !== undefined && value !== ''
        );
        
        if (skillEntries.length === 0) return '';
        
        return `
            <div class="stat-block-section">
                <div class="stat-block-row">
                    <span class="stat-label">Skills:</span>
                    <span class="stat-value">${skillEntries.map(([skill, bonus]) => 
                        `${skill.charAt(0).toUpperCase() + skill.slice(1)} +${bonus}`
                    ).join(', ')}</span>
                </div>
            </div>
        `;
    }

    /**
     * Render damage resistances/immunities/vulnerabilities
     */
    static renderDamageInfo(sb) {
        if (!sb) return '';
        
        let html = '';
        let hasContent = false;
        
        // Check if any damage info exists
        if ((sb.damageVulnerabilities && sb.damageVulnerabilities.length > 0) ||
            (sb.damageResistances && sb.damageResistances.length > 0) ||
            (sb.damageImmunities && sb.damageImmunities.length > 0) ||
            (sb.conditionImmunities && sb.conditionImmunities.length > 0)) {
            
            html = '<div class="stat-block-section">';
            
            if (sb.damageVulnerabilities && sb.damageVulnerabilities.length > 0) {
                html += `
                    <div class="stat-block-row">
                        <span class="stat-label">Damage Vulnerabilities:</span>
                        <span class="stat-value">${sb.damageVulnerabilities.join(', ')}</span>
                    </div>
                `;
                hasContent = true;
            }
            
            if (sb.damageResistances && sb.damageResistances.length > 0) {
                html += `
                    <div class="stat-block-row">
                        <span class="stat-label">Damage Resistances:</span>
                        <span class="stat-value">${sb.damageResistances.join(', ')}</span>
                    </div>
                `;
                hasContent = true;
            }
            
            if (sb.damageImmunities && sb.damageImmunities.length > 0) {
                html += `
                    <div class="stat-block-row">
                        <span class="stat-label">Damage Immunities:</span>
                        <span class="stat-value">${sb.damageImmunities.join(', ')}</span>
                    </div>
                `;
                hasContent = true;
            }
            
            if (sb.conditionImmunities && sb.conditionImmunities.length > 0) {
                html += `
                    <div class="stat-block-row">
                        <span class="stat-label">Condition Immunities:</span>
                        <span class="stat-value">${sb.conditionImmunities.join(', ')}</span>
                    </div>
                `;
                hasContent = true;
            }
            
            html += '</div>';
        }
        
        return hasContent ? html : '';
    }

    /**
     * Render senses section
     */
    static renderSenses(senses) {
        if (!senses || typeof senses !== 'object') return '';
        
        const senseList = [];
        if (senses.blindsight) senseList.push(`Blindsight ${senses.blindsight} ft.`);
        if (senses.darkvision) senseList.push(`Darkvision ${senses.darkvision} ft.`);
        if (senses.tremorsense) senseList.push(`Tremorsense ${senses.tremorsense} ft.`);
        if (senses.truesight) senseList.push(`Truesight ${senses.truesight} ft.`);
        
        // Passive Perception is usually always present
        if (senses.passivePerception !== null && senses.passivePerception !== undefined) {
            senseList.push(`Passive Perception ${senses.passivePerception}`);
        }
        
        if (senseList.length === 0) return '';
        
        return `
            <div class="stat-block-section">
                <div class="stat-block-row">
                    <span class="stat-label">Senses:</span>
                    <span class="stat-value">${senseList.join(', ')}</span>
                </div>
            </div>
        `;
    }

    /**
     * Render languages section
     */
    static renderLanguages(languages) {
        if (!languages || !Array.isArray(languages) || languages.length === 0) return '';
        
        // Filter out empty strings
        const validLanguages = languages.filter(lang => lang && lang.trim());
        
        if (validLanguages.length === 0) return '';
        
        return `
            <div class="stat-block-section">
                <div class="stat-block-row">
                    <span class="stat-label">Languages:</span>
                    <span class="stat-value">${validLanguages.join(', ')}</span>
                </div>
            </div>
        `;
    }

    /**
     * Render challenge rating
     */
    static renderChallengeRating(cr) {
        if (!cr) return '';
        
        // Check if we have either a CR value or from the creature object
        const crValue = cr.cr || cr;
        if (!crValue && crValue !== 0) return '';
        
        let crText = `${crValue}`;
        
        // Add XP if available
        if (cr.xp) {
            crText += ` (${cr.xp.toLocaleString()} XP`;
            if (cr.xpInLair) {
                crText += `, or ${cr.xpInLair.toLocaleString()} XP in lair`;
            }
            crText += ')';
        }
        
        // Add proficiency bonus if available
        if (cr.proficiencyBonus) {
            crText += `; PB +${cr.proficiencyBonus}`;
        }
        
        return `
            <div class="stat-block-section">
                <div class="stat-block-row">
                    <span class="stat-label">Challenge:</span>
                    <span class="stat-value">${crText}</span>
                </div>
            </div>
        `;
    }

    /**
     * Render traits section
     */
    static renderTraits(traits) {
        if (!traits || !Array.isArray(traits) || traits.length === 0) return '';
        
        // Filter out traits without names
        const validTraits = traits.filter(trait => trait && trait.name);
        
        if (validTraits.length === 0) return '';
        
        return `
            <div class="stat-block-section">
                <h4 class="stat-block-section-title">Traits</h4>
                ${validTraits.map(trait => `
                    <div class="trait">
                        <span class="trait-name">${trait.name}.</span>
                        <span class="trait-desc">${trait.description || ''}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Render spellcasting section
     */
    static renderSpellcasting(spellcasting) {
        if (!spellcasting || !spellcasting.spells) return '';
        
        // Check if there are any spells at all
        const hasAtWill = spellcasting.spells.atWill && spellcasting.spells.atWill.length > 0;
        const hasPerDay = spellcasting.spells.perDay && Object.keys(spellcasting.spells.perDay).length > 0;
        
        if (!hasAtWill && !hasPerDay && !spellcasting.description) return '';
        
        let spellHtml = `
            <div class="stat-block-section">
                <h4 class="stat-block-section-title">Spellcasting</h4>
        `;
        
        if (spellcasting.description) {
            spellHtml += `
                <div class="trait">
                    <span class="trait-desc">${spellcasting.description}</span>
                </div>
            `;
        }
        
        if (hasAtWill) {
            const validSpells = spellcasting.spells.atWill.filter(spell => spell && spell.name);
            if (validSpells.length > 0) {
                spellHtml += `
                    <div class="trait">
                        <span class="trait-name">At Will:</span>
                        <span class="trait-desc">${validSpells.map(spell => 
                            spell.level ? `${spell.name} (level ${spell.level})` : spell.name
                        ).join(', ')}</span>
                    </div>
                `;
            }
        }
        
        if (hasPerDay) {
            Object.entries(spellcasting.spells.perDay).forEach(([uses, spells]) => {
                if (spells && Array.isArray(spells)) {
                    const validSpells = spells.filter(spell => spell && spell.name);
                    if (validSpells.length > 0) {
                        spellHtml += `
                            <div class="trait">
                                <span class="trait-name">${uses}/Day Each:</span>
                                <span class="trait-desc">${validSpells.map(spell => 
                                    spell.level ? `${spell.name} (level ${spell.level})` : spell.name
                                ).join(', ')}</span>
                            </div>
                        `;
                    }
                }
            });
        }
        
        spellHtml += '</div>';
        return spellHtml;
    }

    /**
     * Render actions section
     */
    static renderActions(actions) {
        if (!actions || !Array.isArray(actions) || actions.length === 0) return '';
        
        // Filter out actions without names
        const validActions = actions.filter(action => action && action.name);
        
        if (validActions.length === 0) return '';
        
        return `
            <div class="stat-block-section">
                <h4 class="stat-block-section-title">Actions</h4>
                ${validActions.map(action => `
                    <div class="action">
                        <span class="action-name">${action.name}.</span>
                        <span class="action-desc">${action.description || ''}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Render legendary actions section
     */
    static renderLegendaryActions(legendary) {
        if (!legendary || !legendary.options || legendary.options.length === 0) return '';
        
        // Filter out options without names
        const validOptions = legendary.options.filter(option => option && option.name);
        
        if (validOptions.length === 0) return '';
        
        return `
            <div class="stat-block-section">
                <h4 class="stat-block-section-title">Legendary Actions</h4>
                ${legendary.description ? `
                    <div class="trait">
                        <span class="trait-desc">${legendary.description}</span>
                    </div>
                ` : ''}
                ${validOptions.map(option => `
                    <div class="action">
                        <span class="action-name">${option.name}.</span>
                        <span class="action-desc">${option.description || ''}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
 * Handle edit creature action
 */
    static handleEditCreature(target) {
        const creatureId = target.getAttribute('data-creature-id');
        if (!creatureId) return;
        
        console.log('✏️ Editing creature:', creatureId);
        
        // Find the creature
        const creature = DataServices.combatantManager.creatureDatabase.find(c => c.id === creatureId);
        if (!creature) {
            ToastSystem.show('Creature not found', 'error', 2000);
            return;
        }
        
        // Helper function to safely set field values
        const setFieldValue = (fieldId, value) => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = value || '';
            } else {
                console.error(`Field not found: ${fieldId}`);
            }
        };
        
        // Helper function to safely set field values by name selector
        const setFieldByName = (form, fieldName, value) => {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (field) {
                field.value = value || '';
            } else {
                console.error(`Field not found by name: ${fieldName}`);
            }
        };
        
        // Clear any existing dynamic rows but keep the buttons
        ['skills', 'traits', 'actions', 'legendary-actions', 'spells'].forEach(type => {
            const container = document.getElementById(`${type}-container`);
            if (container) {
                // Remove all rows except the button
                const rows = container.querySelectorAll(`.${type.slice(0, -1)}-row`);
                rows.forEach(row => row.remove());
            } else {
                console.error(`Container not found: ${type}-container`);
            }
        });
        
        // Get the form element
        const form = document.getElementById('creature-form');
        if (!form) {
            console.error('Creature form not found!');
            ToastSystem.show('Form not found', 'error', 2000);
            return;
        }
        
        // Populate basic form fields
        setFieldValue('creature-form-id', creature.id);
        setFieldValue('creature-form-name', creature.name);
        setFieldValue('creature-form-type', creature.type);
        setFieldValue('creature-form-size', creature.size || 'Medium');
        setFieldValue('creature-form-race', creature.race || '');
        setFieldValue('creature-form-subrace', creature.subrace || '');
        setFieldValue('creature-form-alignment', creature.alignment || '');
        setFieldValue('creature-form-ac', creature.ac);
        setFieldValue('creature-form-hp', creature.maxHP);
        setFieldValue('creature-form-cr', creature.cr || '');
        setFieldValue('creature-form-description', creature.description || '');
        setFieldValue('creature-form-source', creature.source || '');
        
        // If creature has full stat block, populate all additional fields
        if (creature.hasFullStatBlock && creature.statBlock) {
            const sb = creature.statBlock;
            
            // Armor Class Type
            setFieldByName(form, 'acType', sb.armorClass?.type || '');
            
            // Hit Points Formula
            setFieldByName(form, 'hpFormula', sb.hitPoints?.formula || '');
            
            // Initiative
            if (sb.initiative) {
                setFieldByName(form, 'initiativeModifier', sb.initiative.modifier || '');
                setFieldByName(form, 'initiativeTotal', sb.initiative.total || '');
            }
            
            // Proficiency Bonus
            setFieldByName(form, 'proficiencyBonus', sb.challengeRating?.proficiencyBonus || '');
            
            // Speed
            if (sb.speed) {
                setFieldByName(form, 'speedWalk', sb.speed.walk || '');
                setFieldByName(form, 'speedFly', sb.speed.fly || '');
                setFieldByName(form, 'speedSwim', sb.speed.swim || '');
                setFieldByName(form, 'speedClimb', sb.speed.climb || '');
                setFieldByName(form, 'speedBurrow', sb.speed.burrow || '');
            }
            
            // Ability Scores
            if (sb.abilities) {
                // STR
                setFieldByName(form, 'strScore', sb.abilities.str?.score || '');
                setFieldByName(form, 'strModifier', sb.abilities.str?.modifier || '');
                // DEX
                setFieldByName(form, 'dexScore', sb.abilities.dex?.score || '');
                setFieldByName(form, 'dexModifier', sb.abilities.dex?.modifier || '');
                // CON
                setFieldByName(form, 'conScore', sb.abilities.con?.score || '');
                setFieldByName(form, 'conModifier', sb.abilities.con?.modifier || '');
                // INT
                setFieldByName(form, 'intScore', sb.abilities.int?.score || '');
                setFieldByName(form, 'intModifier', sb.abilities.int?.modifier || '');
                // WIS
                setFieldByName(form, 'wisScore', sb.abilities.wis?.score || '');
                setFieldByName(form, 'wisModifier', sb.abilities.wis?.modifier || '');
                // CHA
                setFieldByName(form, 'chaScore', sb.abilities.cha?.score || '');
                setFieldByName(form, 'chaModifier', sb.abilities.cha?.modifier || '');
            }
            
            // Saving Throws
            if (sb.savingThrows) {
                setFieldByName(form, 'strSave', sb.savingThrows.str || '');
                setFieldByName(form, 'dexSave', sb.savingThrows.dex || '');
                setFieldByName(form, 'conSave', sb.savingThrows.con || '');
                setFieldByName(form, 'intSave', sb.savingThrows.int || '');
                setFieldByName(form, 'wisSave', sb.savingThrows.wis || '');
                setFieldByName(form, 'chaSave', sb.savingThrows.cha || '');
            }
            
            // Skills - Create rows for each skill
            if (sb.skills && Object.keys(sb.skills).length > 0) {
                Object.entries(sb.skills).forEach(([skillName, bonus]) => {
                    // Check if addSkillRow function exists
                    if (typeof window.addSkillRow === 'function') {
                        window.addSkillRow();
                        // Get the last added row
                        const skillRows = document.querySelectorAll('.skill-row');
                        const lastRow = skillRows[skillRows.length - 1];
                        if (lastRow) {
                            const nameField = lastRow.querySelector('[name="skillName[]"]');
                            const bonusField = lastRow.querySelector('[name="skillBonus[]"]');
                            if (nameField) nameField.value = skillName.charAt(0).toUpperCase() + skillName.slice(1);
                            if (bonusField) bonusField.value = bonus;
                        }
                    } else {
                        console.error('addSkillRow function not found');
                    }
                });
            }
            
            // Damage Vulnerabilities, Resistances, Immunities
            setFieldByName(form, 'damageVulnerabilities', (sb.damageVulnerabilities || []).join(', '));
            setFieldByName(form, 'damageResistances', (sb.damageResistances || []).join(', '));
            setFieldByName(form, 'damageImmunities', (sb.damageImmunities || []).join(', '));
            setFieldByName(form, 'conditionImmunities', (sb.conditionImmunities || []).join(', '));
            
            // Senses
            if (sb.senses) {
                setFieldByName(form, 'blindsight', sb.senses.blindsight || '');
                setFieldByName(form, 'darkvision', sb.senses.darkvision || '');
                setFieldByName(form, 'tremorsense', sb.senses.tremorsense || '');
                setFieldByName(form, 'truesight', sb.senses.truesight || '');
                setFieldByName(form, 'passivePerception', sb.senses.passivePerception || '');
            }
            
            // Languages
            setFieldByName(form, 'languages', (sb.languages || []).join(', '));
            
            // Challenge Rating Details
            if (sb.challengeRating) {
                setFieldByName(form, 'xp', sb.challengeRating.xp || '');
                setFieldByName(form, 'xpInLair', sb.challengeRating.xpInLair || '');
            }
            
            // Traits - Create rows for each trait
            if (sb.traits && sb.traits.length > 0) {
                sb.traits.forEach(trait => {
                    if (typeof window.addTraitRow === 'function') {
                        window.addTraitRow();
                        const traitRows = document.querySelectorAll('.trait-row');
                        const lastRow = traitRows[traitRows.length - 1];
                        if (lastRow) {
                            const nameField = lastRow.querySelector('[name="traitName[]"]');
                            const descField = lastRow.querySelector('[name="traitDescription[]"]');
                            const usageField = lastRow.querySelector('[name="traitUsage[]"]');
                            
                            if (nameField) nameField.value = trait.name;
                            if (descField) descField.value = trait.description;
                            if (usageField && trait.usage) {
                                usageField.value = trait.usage.amount || '';
                            }
                        }
                    } else {
                        console.error('addTraitRow function not found');
                    }
                });
            }
            
            // Actions - Create rows for each action
            if (sb.actions && sb.actions.length > 0) {
                sb.actions.forEach(action => {
                    if (typeof window.addActionRow === 'function') {
                        window.addActionRow();
                        const actionRows = document.querySelectorAll('.action-row');
                        const lastRow = actionRows[actionRows.length - 1];
                        if (lastRow) {
                            const fields = {
                                'actionName[]': action.name,
                                'actionType[]': action.type || '',
                                'actionDescription[]': action.description,
                                'actionAttackBonus[]': action.attackBonus || '',
                                'actionReach[]': action.reach || '',
                                'actionRange[]': action.range || '',
                                'actionDamage[]': action.damage || '',
                                'actionDamageType[]': action.damageType || '',
                                'actionRecharge[]': action.recharge || ''
                            };
                            
                            Object.entries(fields).forEach(([fieldName, value]) => {
                                const field = lastRow.querySelector(`[name="${fieldName}"]`);
                                if (field) field.value = value;
                            });
                        }
                    } else {
                        console.error('addActionRow function not found');
                    }
                });
            }
            
            // Legendary Actions
            if (sb.legendaryActions) {
                setFieldByName(form, 'legendaryUses', sb.legendaryActions.uses || '');
                setFieldByName(form, 'legendaryUsesInLair', sb.legendaryActions.usesInLair || '');
                setFieldByName(form, 'legendaryDescription', sb.legendaryActions.description || '');
                
                // Create rows for each legendary action
                if (sb.legendaryActions.options && sb.legendaryActions.options.length > 0) {
                    sb.legendaryActions.options.forEach(option => {
                        if (typeof window.addLegendaryActionRow === 'function') {
                            window.addLegendaryActionRow();
                            const legendaryRows = document.querySelectorAll('.legendary-action-row');
                            const lastRow = legendaryRows[legendaryRows.length - 1];
                            if (lastRow) {
                                const nameField = lastRow.querySelector('[name="legendaryActionName[]"]');
                                const descField = lastRow.querySelector('[name="legendaryActionDescription[]"]');
                                const costField = lastRow.querySelector('[name="legendaryActionCost[]"]');
                                
                                if (nameField) nameField.value = option.name;
                                if (descField) descField.value = option.description;
                                if (costField) costField.value = option.cost || 1;
                            }
                        } else {
                            console.error('addLegendaryActionRow function not found');
                        }
                    });
                }
            }
            
            // Spellcasting
            if (sb.spellcasting) {
                setFieldByName(form, 'spellcastingDescription', sb.spellcasting.description || '');
                setFieldByName(form, 'spellcastingAbility', sb.spellcasting.ability || '');
                setFieldByName(form, 'spellSaveDC', sb.spellcasting.saveDC || '');
                setFieldByName(form, 'spellAttackBonus', sb.spellcasting.attackBonus || '');
                
                // Create rows for spells
                if (sb.spellcasting.spells) {
                    // At-will spells
                    if (sb.spellcasting.spells.atWill && sb.spellcasting.spells.atWill.length > 0) {
                        sb.spellcasting.spells.atWill.forEach(spell => {
                            if (typeof window.addSpellRow === 'function') {
                                window.addSpellRow();
                                const spellRows = document.querySelectorAll('.spell-row');
                                const lastRow = spellRows[spellRows.length - 1];
                                if (lastRow) {
                                    const nameField = lastRow.querySelector('[name="spellName[]"]');
                                    const levelField = lastRow.querySelector('[name="spellLevel[]"]');
                                    const freqField = lastRow.querySelector('[name="spellFrequency[]"]');
                                    
                                    if (nameField) nameField.value = spell.name;
                                    if (levelField) levelField.value = spell.level || '';
                                    if (freqField) freqField.value = 'at-will';
                                }
                            } else {
                                console.error('addSpellRow function not found');
                            }
                        });
                    }
                    
                    // Per-day spells
                    if (sb.spellcasting.spells.perDay) {
                        Object.entries(sb.spellcasting.spells.perDay).forEach(([uses, spells]) => {
                            spells.forEach(spell => {
                                if (typeof window.addSpellRow === 'function') {
                                    window.addSpellRow();
                                    const spellRows = document.querySelectorAll('.spell-row');
                                    const lastRow = spellRows[spellRows.length - 1];
                                    if (lastRow) {
                                        const nameField = lastRow.querySelector('[name="spellName[]"]');
                                        const levelField = lastRow.querySelector('[name="spellLevel[]"]');
                                        const freqField = lastRow.querySelector('[name="spellFrequency[]"]');
                                        
                                        if (nameField) nameField.value = spell.name;
                                        if (levelField) levelField.value = spell.level || '';
                                        if (freqField) freqField.value = `${uses}/day`;
                                    }
                                } else {
                                    console.error('addSpellRow function not found');
                                }
                            });
                        });
                    }
                }
            }
        }
        
        // Update form title and button
        const formTitle = document.getElementById('creature-form-title');
        const submitText = document.getElementById('creature-form-submit-text');
        
        if (formTitle) formTitle.textContent = 'Edit Creature';
        if (submitText) submitText.textContent = 'Save Changes';
        
        // Show the form modal
        ModalSystem.show('creature-form');
    }

    /**
     * Handle delete creature action
     */
    static handleDeleteCreature(target) {
        const creatureId = target.getAttribute('data-creature-id');
        if (!creatureId) return;
        
        // Find the creature
        const creature = DataServices.combatantManager.creatureDatabase.find(c => c.id === creatureId);
        if (!creature) {
            ToastSystem.show('Creature not found', 'error', 2000);
            return;
        }
        
        // Confirm deletion
        if (!confirm(`Are you sure you want to delete "${creature.name}"? This action cannot be undone.`)) {
            return;
        }
        
        console.log('🗑️ Deleting creature:', creatureId);
        
        try {
            // Remove from database
            const index = DataServices.combatantManager.creatureDatabase.findIndex(c => c.id === creatureId);
            if (index !== -1) {
                DataServices.combatantManager.creatureDatabase.splice(index, 1);
            }
            
            // Save to localStorage
            this.saveCreatureDatabase();
            
            // Update the list
            const creatures = DataServices.combatantManager.creatureDatabase;
            const searchTerm = document.getElementById('creature-search').value;
            const typeFilter = document.getElementById('creature-type-filter').value;
            this.renderCreatureList(creatures, searchTerm, typeFilter);
            
            // Clear details pane
            document.getElementById('creature-details-content').innerHTML = '<div class="empty-state"><p>Select a creature from the list to view details</p></div>';
            document.getElementById('detail-creature-name').textContent = 'Select a creature';
            document.querySelectorAll('.creature-actions button').forEach(btn => btn.style.display = 'none');
            
            ToastSystem.show(`${creature.name} deleted successfully`, 'success', 2000);
            
        } catch (error) {
            console.error('Failed to delete creature:', error);
            ToastSystem.show('Failed to delete creature', 'error', 3000);
        }
    }

    /**
     * Handle add creature to encounter
     */
    static handleAddToEncounter(target) {
        const creatureId = target.getAttribute('data-creature-id');
        if (!creatureId) return;
        
        console.log('➕ Adding creature to encounter:', creatureId);
        
        // Close the database modal
        ModalSystem.hide('creature-database');
        
        // Populate the add combatant form
        const creatureSelect = document.getElementById('creature-select');
        if (creatureSelect) {
            // Make sure the dropdown is populated
            EventHandlers.populateCreatureDropdown();
            
            // Select the creature
            creatureSelect.value = creatureId;
            
            // Show the add combatant modal
            ModalSystem.show('add-combatant');
            
            // Focus on initiative input
            setTimeout(() => {
                const initiativeInput = document.getElementById('combatant-initiative');
                if (initiativeInput) {
                    initiativeInput.focus();
                    initiativeInput.select();
                }
            }, 100);
        }
    }

    /**
     * Handle creature form submission (add/edit)
     */
    static handleCreatureForm(form) {
        const formData = new FormData(form);
        
        // Build the stat block data structure
        const statBlock = {
            fullType: '', // Will be constructed from size, race, alignment
            armorClass: {
                value: parseInt(formData.get('ac')),
                type: formData.get('acType') || null
            },
            hitPoints: {
                average: parseInt(formData.get('maxHP')),
                formula: formData.get('hpFormula') || null
            },
            speed: {
                walk: formData.get('speedWalk') ? parseInt(formData.get('speedWalk')) : null,
                fly: formData.get('speedFly') ? parseInt(formData.get('speedFly')) : null,
                swim: formData.get('speedSwim') ? parseInt(formData.get('speedSwim')) : null,
                climb: formData.get('speedClimb') ? parseInt(formData.get('speedClimb')) : null,
                burrow: formData.get('speedBurrow') ? parseInt(formData.get('speedBurrow')) : null
            },
            abilities: {
                str: {
                    score: formData.get('strScore') ? parseInt(formData.get('strScore')) : null,
                    modifier: formData.get('strModifier') ? parseInt(formData.get('strModifier')) : null
                },
                dex: {
                    score: formData.get('dexScore') ? parseInt(formData.get('dexScore')) : null,
                    modifier: formData.get('dexModifier') ? parseInt(formData.get('dexModifier')) : null
                },
                con: {
                    score: formData.get('conScore') ? parseInt(formData.get('conScore')) : null,
                    modifier: formData.get('conModifier') ? parseInt(formData.get('conModifier')) : null
                },
                int: {
                    score: formData.get('intScore') ? parseInt(formData.get('intScore')) : null,
                    modifier: formData.get('intModifier') ? parseInt(formData.get('intModifier')) : null
                },
                wis: {
                    score: formData.get('wisScore') ? parseInt(formData.get('wisScore')) : null,
                    modifier: formData.get('wisModifier') ? parseInt(formData.get('wisModifier')) : null
                },
                cha: {
                    score: formData.get('chaScore') ? parseInt(formData.get('chaScore')) : null,
                    modifier: formData.get('chaModifier') ? parseInt(formData.get('chaModifier')) : null
                }
            },
            savingThrows: {
                str: formData.get('strSave') ? parseInt(formData.get('strSave')) : null,
                dex: formData.get('dexSave') ? parseInt(formData.get('dexSave')) : null,
                con: formData.get('conSave') ? parseInt(formData.get('conSave')) : null,
                int: formData.get('intSave') ? parseInt(formData.get('intSave')) : null,
                wis: formData.get('wisSave') ? parseInt(formData.get('wisSave')) : null,
                cha: formData.get('chaSave') ? parseInt(formData.get('chaSave')) : null
            },
            skills: {},
            damageVulnerabilities: formData.get('damageVulnerabilities') ? 
                formData.get('damageVulnerabilities').split(',').map(s => s.trim()).filter(s => s) : [],
            damageResistances: formData.get('damageResistances') ? 
                formData.get('damageResistances').split(',').map(s => s.trim()).filter(s => s) : [],
            damageImmunities: formData.get('damageImmunities') ? 
                formData.get('damageImmunities').split(',').map(s => s.trim()).filter(s => s) : [],
            conditionImmunities: formData.get('conditionImmunities') ? 
                formData.get('conditionImmunities').split(',').map(s => s.trim()).filter(s => s) : [],
            senses: {
                blindsight: formData.get('blindsight') ? parseInt(formData.get('blindsight')) : null,
                darkvision: formData.get('darkvision') ? parseInt(formData.get('darkvision')) : null,
                tremorsense: formData.get('tremorsense') ? parseInt(formData.get('tremorsense')) : null,
                truesight: formData.get('truesight') ? parseInt(formData.get('truesight')) : null,
                passivePerception: formData.get('passivePerception') ? parseInt(formData.get('passivePerception')) : 10
            },
            languages: formData.get('languages') ? 
                formData.get('languages').split(',').map(s => s.trim()).filter(s => s) : [],
            challengeRating: {
                cr: formData.get('cr') || null,
                xp: formData.get('xp') ? parseInt(formData.get('xp')) : null,
                xpInLair: formData.get('xpInLair') ? parseInt(formData.get('xpInLair')) : null,
                proficiencyBonus: formData.get('proficiencyBonus') ? parseInt(formData.get('proficiencyBonus')) : 2
            },
            traits: [],
            actions: [],
            reactions: [], // Not in form yet, but structure supports it
            legendaryActions: null,
            lairActions: null, // Not in form yet
            regionalEffects: null, // Not in form yet
            spellcasting: null
        };
        
        // Process skills
        const skillNames = formData.getAll('skillName[]');
        const skillBonuses = formData.getAll('skillBonus[]');
        skillNames.forEach((name, index) => {
            if (name && skillBonuses[index]) {
                statBlock.skills[name.toLowerCase()] = parseInt(skillBonuses[index]);
            }
        });
        
        // Process traits
        const traitNames = formData.getAll('traitName[]');
        const traitDescriptions = formData.getAll('traitDescription[]');
        const traitUsages = formData.getAll('traitUsage[]');
        traitNames.forEach((name, index) => {
            if (name && traitDescriptions[index]) {
                const trait = {
                    name: name,
                    description: traitDescriptions[index]
                };
                if (traitUsages[index]) {
                    trait.usage = {
                        type: 'perDay',
                        amount: traitUsages[index]
                    };
                }
                statBlock.traits.push(trait);
            }
        });
        
        // Process actions
        const actionNames = formData.getAll('actionName[]');
        const actionTypes = formData.getAll('actionType[]');
        const actionDescriptions = formData.getAll('actionDescription[]');
        const actionAttackBonuses = formData.getAll('actionAttackBonus[]');
        const actionReaches = formData.getAll('actionReach[]');
        const actionRanges = formData.getAll('actionRange[]');
        const actionDamages = formData.getAll('actionDamage[]');
        const actionDamageTypes = formData.getAll('actionDamageType[]');
        const actionRecharges = formData.getAll('actionRecharge[]');
        
        actionNames.forEach((name, index) => {
            if (name && actionDescriptions[index]) {
                const action = {
                    name: name,
                    type: actionTypes[index] || 'special',
                    description: actionDescriptions[index]
                };
                
                // Add optional action properties
                if (actionAttackBonuses[index]) action.attackBonus = parseInt(actionAttackBonuses[index]);
                if (actionReaches[index]) action.reach = actionReaches[index];
                if (actionRanges[index]) action.range = actionRanges[index];
                if (actionDamages[index]) action.damage = actionDamages[index];
                if (actionDamageTypes[index]) action.damageType = actionDamageTypes[index];
                if (actionRecharges[index]) action.recharge = actionRecharges[index];
                
                statBlock.actions.push(action);
            }
        });
        
        // Process legendary actions
        const legendaryUses = formData.get('legendaryUses');
        const legendaryUsesInLair = formData.get('legendaryUsesInLair');
        const legendaryDescription = formData.get('legendaryDescription');
        const legendaryActionNames = formData.getAll('legendaryActionName[]');
        const legendaryActionDescriptions = formData.getAll('legendaryActionDescription[]');
        const legendaryActionCosts = formData.getAll('legendaryActionCost[]');
        
        if ((legendaryUses || legendaryDescription) && legendaryActionNames.some(name => name)) {
            statBlock.legendaryActions = {
                description: legendaryDescription || '',
                uses: legendaryUses ? parseInt(legendaryUses) : 3,
                usesInLair: legendaryUsesInLair ? parseInt(legendaryUsesInLair) : null,
                options: []
            };
            
            legendaryActionNames.forEach((name, index) => {
                if (name && legendaryActionDescriptions[index]) {
                    statBlock.legendaryActions.options.push({
                        name: name,
                        description: legendaryActionDescriptions[index],
                        cost: legendaryActionCosts[index] ? parseInt(legendaryActionCosts[index]) : 1
                    });
                }
            });
        }
        
        // Process spellcasting
        const spellcastingDescription = formData.get('spellcastingDescription');
        const spellcastingAbility = formData.get('spellcastingAbility');
        const spellSaveDC = formData.get('spellSaveDC');
        const spellAttackBonus = formData.get('spellAttackBonus');
        const spellNames = formData.getAll('spellName[]');
        const spellLevels = formData.getAll('spellLevel[]');
        const spellFrequencies = formData.getAll('spellFrequency[]');
        
        if ((spellcastingDescription || spellcastingAbility) && spellNames.some(name => name)) {
            statBlock.spellcasting = {
                description: spellcastingDescription || '',
                ability: spellcastingAbility || null,
                saveDC: spellSaveDC ? parseInt(spellSaveDC) : null,
                attackBonus: spellAttackBonus ? parseInt(spellAttackBonus) : null,
                spells: {
                    atWill: [],
                    perDay: {}
                }
            };
            
            spellNames.forEach((name, index) => {
                if (name) {
                    const spell = {
                        name: name,
                        level: spellLevels[index] ? parseInt(spellLevels[index]) : null
                    };
                    
                    const frequency = spellFrequencies[index];
                    if (frequency === 'at-will') {
                        statBlock.spellcasting.spells.atWill.push(spell);
                    } else if (frequency) {
                        // Extract number from frequency (e.g., "3/day" -> "3")
                        const uses = frequency.match(/(\d+)/)?.[1] || '1';
                        if (!statBlock.spellcasting.spells.perDay[uses]) {
                            statBlock.spellcasting.spells.perDay[uses] = [];
                        }
                        statBlock.spellcasting.spells.perDay[uses].push(spell);
                    }
                }
            });
        }
        
        // Construct fullType
        const size = formData.get('size') || 'Medium';
        const race = formData.get('race') || 'creature';
        const subrace = formData.get('subrace');
        const alignment = formData.get('alignment') || '';
        
        let fullType = size + ' ' + race;
        if (subrace) fullType += ` (${subrace})`;
        if (alignment) fullType += ', ' + alignment;
        statBlock.fullType = fullType;
        
        // Build the complete creature data
        const creatureData = {
            id: formData.get('id') || `creature-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: formData.get('name'),
            type: formData.get('type'),
            ac: parseInt(formData.get('ac')),
            maxHP: parseInt(formData.get('maxHP')),
            cr: formData.get('cr') || null,
            size: size,
            race: race,
            subrace: subrace || null,
            alignment: alignment || null,
            description: formData.get('description') || null,
            source: formData.get('source') || 'Custom',
            hasFullStatBlock: true,
            statBlock: statBlock
        };
        
        // Handle initiative if provided
        if (formData.get('initiativeModifier')) {
            statBlock.initiative = {
                modifier: parseInt(formData.get('initiativeModifier')),
                total: formData.get('initiativeTotal') ? parseInt(formData.get('initiativeTotal')) : null
            };
        }
        
        // Validation
        if (!creatureData.name || !creatureData.type || !creatureData.ac || !creatureData.maxHP) {
            ToastSystem.show('Please fill in all required fields', 'error', 2000);
            return;
        }
        
        const isEdit = formData.get('id') ? true : false;
        
        try {
            if (isEdit) {
                // Update existing creature
                const index = DataServices.combatantManager.creatureDatabase.findIndex(c => c.id === creatureData.id);
                if (index !== -1) {
                    DataServices.combatantManager.creatureDatabase[index] = creatureData;
                }
            } else {
                // Add new creature
                DataServices.combatantManager.creatureDatabase.push(creatureData);
            }
            
            // Save to localStorage
            this.saveCreatureDatabase();
            
            // Update the list
            const creatures = DataServices.combatantManager.creatureDatabase;
            const searchTerm = document.getElementById('creature-search').value;
            const typeFilter = document.getElementById('creature-type-filter').value;
            this.renderCreatureList(creatures, searchTerm, typeFilter);
            
            // Close the creature form modal
            ModalSystem.hide('creature-form');

            // Reset form
            form.reset();

            // Show success message
            const message = isEdit ? `${creatureData.name} updated successfully` : `${creatureData.name} added to database`;
            ToastSystem.show(message, 'success', 2000);

            // Re-show the creature database modal if it's not already showing
            setTimeout(() => {
                // Ensure the creature database modal is showing
                if (ModalSystem.getActiveModal() !== 'creature-database') {
                    ModalSystem.show('creature-database');
                }
                
                // Select the newly created/edited creature
                this.handleSelectCreature(creatureData.id);
                
                // Scroll to the selected creature in the list
                setTimeout(() => {
                    const selectedItem = document.querySelector(`.creature-list-item[data-creature-id="${creatureData.id}"]`);
                    if (selectedItem) {
                        selectedItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 100);
            }, 300); // Small delay to ensure modal transition completes
            
        } catch (error) {
            console.error('Failed to save creature:', error);
            ToastSystem.show('Failed to save creature', 'error', 3000);
        }
    }

    /**
     * Save creature database to localStorage
     */
    static saveCreatureDatabase() {
        try {
            const databaseData = {
                creatures: DataServices.combatantManager.creatureDatabase,
                metadata: {
                    version: "2.0.0",
                    lastUpdated: new Date().toISOString(),
                    totalCreatures: DataServices.combatantManager.creatureDatabase.length
                }
            };
            
            localStorage.setItem('dnd-creature-database', JSON.stringify(databaseData));
            console.log('💾 Creature database saved to localStorage');
        } catch (error) {
            console.error('Failed to save creature database:', error);
        }
    }

    /**
     * Load creature database from localStorage
     */
    static loadCreatureDatabase() {
        try {
            const savedData = localStorage.getItem('dnd-creature-database');
            if (savedData) {
                const databaseData = JSON.parse(savedData);
                if (databaseData.creatures) {
                    DataServices.combatantManager.creatureDatabase = databaseData.creatures;
                    console.log('📂 Loaded creature database from localStorage');
                    return true;
                }
            }
        } catch (error) {
            console.error('Failed to load creature database:', error);
        }
        return false;
    }

    /**
     * Handle quick view creature
     */
    static handleQuickViewCreature() {
        console.log('🔍 Quick View Creature');
        
        // Get the button that was clicked
        const button = document.querySelector('[data-action="quick-view-creature"]');
        if (!button) return;
        
        // Show the dropdown
        this.showQuickViewDropdown(button);
    }

    /**
     * Display a creature's stat block in the compendium section
     */
    static displayCreatureStatBlock(creatureId) {
        const statBlockDisplay = document.getElementById('stat-block-display');
        if (!statBlockDisplay) return;
        
        // Add updating animation
        statBlockDisplay.classList.add('stat-block-updating');
        
        // Find the creature in the database
        const creature = DataServices.combatantManager.creatureDatabase.find(c => c.id === creatureId);
        if (!creature) {
            statBlockDisplay.innerHTML = '<div class="empty-state"><p>Creature not found in database</p></div>';
            return;
        }
        
        // Check if creature has full stat block
        if (creature.hasFullStatBlock && creature.statBlock) {
            // Render full stat block
            statBlockDisplay.innerHTML = this.renderFullStatBlock(creature);
        } else {
            // Render basic info
            statBlockDisplay.innerHTML = this.renderBasicCreatureInfo(creature);
        }
        
        // Scroll to the compendium section
        const compendiumSection = document.querySelector('.compendium-section');
        if (compendiumSection) {
            compendiumSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        // Remove animation class after animation completes
        setTimeout(() => {
            statBlockDisplay.classList.remove('stat-block-updating');
        }, 600);
    }

    /**
     * Handle import stat block - opens the parser modal
     */
    static handleImportStatBlock() {
        console.log('📋 Import Stat Block clicked');
        
        // Clear any previous data
        const textArea = document.getElementById('stat-block-text');
        const preview = document.getElementById('stat-block-preview');
        const importBtn = document.getElementById('import-parsed-creature');
        const errorDiv = document.getElementById('stat-block-errors');
        
        if (textArea) textArea.value = '';
        if (preview) preview.innerHTML = '<div class="empty-state" style="text-align: center; color: var(--color-text-muted);"><p>Paste a stat block and click "Parse Stat Block" to see a preview</p></div>';
        if (importBtn) importBtn.style.display = 'none';
        if (errorDiv) errorDiv.style.display = 'none';
        
        // Store parsed data on the modal for later use
        const modal = document.querySelector('[data-modal="stat-block-parser"]');
        if (modal) {
            modal.removeAttribute('data-parsed-creature');
        }
        
        // Show the modal
        ModalSystem.show('stat-block-parser');
    }

    /**
     * Handle import creature database
     */
    static handleImportCreatureDatabase() {
        console.log('📥 Import Creature Database');
        
        // Create file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.csv,.json';
        
        fileInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            try {
                const extension = file.name.split('.').pop().toLowerCase();
                
                if (extension === 'json') {
                    await this.importJSONDatabase(file);
                } else if (extension === 'csv') {
                    await this.importCSVDatabase(file);
                } else {
                    ToastSystem.show('Please select a CSV or JSON file', 'error', 3000);
                }
            } catch (error) {
                console.error('Import failed:', error);
                ToastSystem.show(`Import failed: ${error.message}`, 'error', 4000);
            }
        });
        
        // Trigger file selection
        fileInput.click();
    }

    /**
     * Import JSON database file
     */
    static async importJSONDatabase(file) {
        const text = await file.text();
        const data = JSON.parse(text);
        
        let creatures = [];
        
        // Handle different JSON structures
        if (Array.isArray(data)) {
            creatures = data;
        } else if (data.creatures && Array.isArray(data.creatures)) {
            creatures = data.creatures;
        } else {
            throw new Error('Invalid JSON structure. Expected array of creatures or object with creatures array.');
        }
        
        // Process each creature
        for (const creature of creatures) {
            await this.processImportedCreature(creature);
        }
        
        // Save and refresh
        this.saveCreatureDatabase();
        this.initializeCreatureList();
        
        ToastSystem.show(`Successfully imported ${creatures.length} creatures`, 'success', 3000);
    }

    /**
     * Import CSV database file
     */
    static async importCSVDatabase(file) {
        const text = await file.text();
        
        // Parse CSV - simple implementation
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('CSV file must have headers and at least one data row');
        }
        
        // Get headers
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        // Map common header variations
        const headerMap = {
            'name': ['name', 'creature', 'creature name'],
            'type': ['type', 'creature type'],
            'ac': ['ac', 'armor class', 'armor'],
            'hp': ['hp', 'hit points', 'health', 'maxhp', 'max hp'],
            'cr': ['cr', 'challenge rating', 'challenge'],
            'size': ['size', 'creature size'],
            'race': ['race', 'creature race', 'subtype']
        };
        
        // Find column indices
        const columns = {};
        for (const [key, variations] of Object.entries(headerMap)) {
            const index = headers.findIndex(h => variations.includes(h));
            if (index !== -1) {
                columns[key] = index;
            }
        }
        
        // Validate required columns
        if (columns.name === undefined || columns.ac === undefined || columns.hp === undefined) {
            throw new Error('CSV must have at least Name, AC, and HP columns');
        }
        
        // Process data rows
        let importCount = 0;
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            
            if (values.length < headers.length) continue;
            
            const creature = {
                name: values[columns.name],
                type: columns.type !== undefined ? values[columns.type] : 'enemy',
                ac: parseInt(values[columns.ac]) || 10,
                maxHP: parseInt(values[columns.hp]) || 1,
                cr: columns.cr !== undefined ? values[columns.cr] : null,
                size: columns.size !== undefined ? values[columns.size] : 'Medium',
                race: columns.race !== undefined ? values[columns.race] : null,
                source: 'Imported',
                hasFullStatBlock: false
            };
            
            // Validate creature
            if (creature.name && creature.ac && creature.maxHP) {
                await this.processImportedCreature(creature);
                importCount++;
            }
        }
        
        // Save and refresh
        this.saveCreatureDatabase();
        this.initializeCreatureList();
        
        ToastSystem.show(`Successfully imported ${importCount} creatures`, 'success', 3000);
    }

    /**
     * Process an imported creature
     */
    static async processImportedCreature(creature) {
        // Generate ID if not present
        if (!creature.id) {
            creature.id = `creature-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // Ensure type is valid
        if (!['player', 'enemy', 'npc'].includes(creature.type)) {
            creature.type = 'enemy';
        }
        
        // Check for duplicates
        const existing = DataServices.combatantManager.creatureDatabase.find(c => 
            c.name.toLowerCase() === creature.name.toLowerCase()
        );
        
        if (existing) {
            const replace = confirm(`"${creature.name}" already exists. Replace it?`);
            if (replace) {
                const index = DataServices.combatantManager.creatureDatabase.findIndex(c => c.id === existing.id);
                DataServices.combatantManager.creatureDatabase[index] = creature;
            }
        } else {
            DataServices.combatantManager.creatureDatabase.push(creature);
        }
    }

    /**
     * Handle creature name click to view stat block
     */
    static handleCreatureNameClick(event) {
        const nameElement = event.target;
        if (!nameElement.classList.contains('combatant-name')) return;
        
        // Get the combatant card
        const card = nameElement.closest('[data-combatant-id]');
        if (!card) return;
        
        const combatantId = card.getAttribute('data-combatant-id');
        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        
        if (combatant) {
            // Display the creature's stat block
            this.displayCreatureStatBlock(combatant.creatureId);
        }
    }

    /**
     * Handle creature name click to view stat block
     */
    static handleCreatureNameClick(event) {
        const nameElement = event.target;
        if (!nameElement.classList.contains('combatant-name')) return;
        
        // Get the combatant card
        const card = nameElement.closest('[data-combatant-id]');
        if (!card) return;
        
        const combatantId = card.getAttribute('data-combatant-id');
        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        
        if (combatant) {
            // Display the creature's stat block
            this.displayCreatureStatBlock(combatant.creatureId);
        }
    }

}

// ============================================================================
// DYNAMIC FORM ROW HANDLERS
// ============================================================================

/**
 * Add a new skill row to the creature form
 */
    window.addSkillRow = function() {
        const container = document.getElementById('skills-container');
        
        // Add debugging
        if (!container) {
            console.error('Skills container not found!');
            return;
        }
        
        const skillRow = document.createElement('div');
        skillRow.className = 'form-row skill-row';
        skillRow.innerHTML = `
            <div class="form-group">
                <input type="text" name="skillName[]" placeholder="Skill name (e.g., Perception)">
            </div>
            <div class="form-group">
                <input type="number" name="skillBonus[]" placeholder="Bonus (e.g., +16)">
            </div>
            <div class="form-group">
                <button type="button" class="btn btn-sm btn-danger" onclick="removeRow(this)">Remove</button>
            </div>
        `;
        
        // Find the add button - look for the specific button that adds skills
        const addButton = Array.from(container.children).find(child => 
            child.tagName === 'BUTTON' && child.textContent.includes('Add Skill')
        );
        
        if (addButton && addButton.parentNode === container) {
            container.insertBefore(skillRow, addButton);
        } else {
            // If no button or button is not a direct child, just append
            container.appendChild(skillRow);
        }
    };

/**
 * Add a new trait row to the creature form
 */
window.addTraitRow = function() {
    const container = document.getElementById('traits-container');
    const traitRow = document.createElement('div');
    traitRow.className = 'trait-row';
    traitRow.innerHTML = `
        <div class="form-group">
            <input type="text" name="traitName[]" placeholder="Trait name (e.g., Legendary Resistance)">
        </div>
        <div class="form-group">
            <textarea name="traitDescription[]" rows="2" placeholder="Trait description"></textarea>
        </div>
        <div class="form-group">
            <input type="text" name="traitUsage[]" placeholder="Usage (e.g., 3/Day)">
        </div>
        <div class="form-group">
            <button type="button" class="btn btn-sm btn-danger" onclick="removeRow(this)">Remove</button>
        </div>
    `;
    // Replace the button finding logic with:
    const addButton = Array.from(container.children).find(child => 
        child.tagName === 'BUTTON' && child.textContent.includes('Add Trait')
    );

    if (addButton && addButton.parentNode === container) {
        container.insertBefore(traitRow, addButton);
    } else {
        container.appendChild(traitRow);
    }
};

/**
 * Add a new action row to the creature form
 */
window.addActionRow = function() {
    const container = document.getElementById('actions-container');
    const actionRow = document.createElement('div');
    actionRow.className = 'action-row';
    actionRow.innerHTML = `
        <div class="form-group">
            <input type="text" name="actionName[]" placeholder="Action name (e.g., Multiattack)">
        </div>
        <div class="form-group">
            <select name="actionType[]">
                <option value="">Action Type</option>
                <option value="melee">Melee</option>
                <option value="ranged">Ranged</option>
                <option value="special">Special</option>
                <option value="multiattack">Multiattack</option>
            </select>
        </div>
        <div class="form-group">
            <textarea name="actionDescription[]" rows="2" placeholder="Action description"></textarea>
        </div>
        <div class="form-row">
            <div class="form-group">
                <input type="number" name="actionAttackBonus[]" placeholder="Attack Bonus">
            </div>
            <div class="form-group">
                <input type="text" name="actionReach[]" placeholder="Reach (e.g., 5 ft.)">
            </div>
            <div class="form-group">
                <input type="text" name="actionRange[]" placeholder="Range (e.g., 30/120 ft.)">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <input type="text" name="actionDamage[]" placeholder="Damage (e.g., 2d8 + 10)">
            </div>
            <div class="form-group">
                <input type="text" name="actionDamageType[]" placeholder="Damage Type">
            </div>
            <div class="form-group">
                <input type="text" name="actionRecharge[]" placeholder="Recharge (e.g., 5-6)">
            </div>
        </div>
        <div class="form-group">
            <button type="button" class="btn btn-sm btn-danger" onclick="removeRow(this)">Remove</button>
        </div>
    `;
    // Replace the button finding logic with:
    const addButton = Array.from(container.children).find(child => 
        child.tagName === 'BUTTON' && child.textContent.includes('Add Action')
    );

    if (addButton && addButton.parentNode === container) {
        container.insertBefore(actionRow, addButton);
    } else {
        container.appendChild(actionRow);
    }
};

/**
 * Add a new legendary action row to the creature form
 */
window.addLegendaryActionRow = function() {
    const container = document.getElementById('legendary-actions-container');
    
    // Check if this is the first legendary action being added
    const existingRows = container.querySelectorAll('.legendary-action-row');
    const isFirstRow = existingRows.length === 0;
    
    const legendaryRow = document.createElement('div');
    legendaryRow.className = 'legendary-action-row';
    
    if (isFirstRow) {
        // First row includes the general legendary action settings
        legendaryRow.innerHTML = `
            <div class="legendary-header-section">
                <div class="form-row">
                    <div class="form-group">
                        <label>Legendary Action Uses</label>
                        <input type="number" name="legendaryUses" placeholder="3" value="3">
                    </div>
                    <div class="form-group">
                        <label>Uses in Lair</label>
                        <input type="number" name="legendaryUsesInLair" placeholder="4">
                    </div>
                </div>
                <div class="form-group">
                    <label>Legendary Actions Description</label>
                    <textarea name="legendaryDescription" rows="2" placeholder="Description of how legendary actions work"></textarea>
                </div>
                <hr class="section-divider">
            </div>
            <div class="form-group">
                <label>Action Name</label>
                <input type="text" name="legendaryActionName[]" placeholder="Legendary action name">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea name="legendaryActionDescription[]" rows="2" placeholder="Legendary action description"></textarea>
            </div>
            <div class="form-group">
                <label>Cost</label>
                <input type="number" name="legendaryActionCost[]" placeholder="Cost" min="1" max="3" value="1">
            </div>
            <div class="form-group">
                <button type="button" class="btn btn-sm btn-danger" onclick="removeRow(this)">Remove</button>
            </div>
        `;
    } else {
        // Subsequent rows only have the individual action fields
        legendaryRow.innerHTML = `
            <div class="form-group">
                <input type="text" name="legendaryActionName[]" placeholder="Legendary action name">
            </div>
            <div class="form-group">
                <textarea name="legendaryActionDescription[]" rows="2" placeholder="Legendary action description"></textarea>
            </div>
            <div class="form-group">
                <input type="number" name="legendaryActionCost[]" placeholder="Cost" min="1" max="3" value="1">
            </div>
            <div class="form-group">
                <button type="button" class="btn btn-sm btn-danger" onclick="removeRow(this)">Remove</button>
            </div>
        `;
    }
    
    // Replace the button finding logic with:
    const addButton = Array.from(container.children).find(child => 
        child.tagName === 'BUTTON' && child.textContent.includes('Add Legendary Action')
    );

    if (addButton && addButton.parentNode === container) {
        container.insertBefore(legendaryRow, addButton);
    } else {
        container.appendChild(legendaryRow);
    }
};

/**
 * Add a new spell row to the creature form
 */
window.addSpellRow = function() {
    const container = document.getElementById('spells-container');
    
    // Check if this is the first spell being added
    const existingRows = container.querySelectorAll('.spell-row');
    const isFirstRow = existingRows.length === 0;
    
    const spellRow = document.createElement('div');
    spellRow.className = 'spell-row';
    
   if (isFirstRow) {
        // First row includes the general spellcasting settings
        spellRow.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <label>Spell Name</label>
                    <input type="text" name="spellName[]" placeholder="Spell name">
                </div>
                <div class="form-group">
                    <label>Level</label>
                    <input type="number" name="spellLevel[]" placeholder="Level" min="0" max="9">
                </div>
                <div class="form-group">
                    <label>Frequency</label>
                    <select name="spellFrequency[]">
                        <option value="at-will">At Will</option>
                        <option value="1/day">1/Day</option>
                        <option value="2/day">2/Day</option>
                        <option value="3/day">3/Day</option>
                    </select>
                </div>
                <div class="form-group">
                    <button type="button" class="btn btn-sm btn-danger" onclick="removeRow(this)">Remove</button>
                </div>
            </div>
            <hr class="section-divider">
            <div class="spellcasting-header-section">
                <div class="form-group">
                    <label>Spellcasting Description</label>
                    <textarea name="spellcastingDescription" rows="2" placeholder="Description of spellcasting abilities"></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Spellcasting Ability</label>
                        <select name="spellcastingAbility">
                            <option value="">None</option>
                            <option value="Intelligence">Intelligence</option>
                            <option value="Wisdom">Wisdom</option>
                            <option value="Charisma">Charisma</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Spell Save DC</label>
                        <input type="number" name="spellSaveDC" placeholder="23">
                    </div>
                    <div class="form-group">
                        <label>Spell Attack Bonus</label>
                        <input type="number" name="spellAttackBonus" placeholder="+15">
                    </div>
                </div>
            </div>
        `;
    } else {
        // Subsequent rows only have the spell fields
        spellRow.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <input type="text" name="spellName[]" placeholder="Spell name">
                </div>
                <div class="form-group">
                    <input type="number" name="spellLevel[]" placeholder="Level" min="0" max="9">
                </div>
                <div class="form-group">
                    <select name="spellFrequency[]">
                        <option value="at-will">At Will</option>
                        <option value="1/day">1/Day</option>
                        <option value="2/day">2/Day</option>
                        <option value="3/day">3/Day</option>
                    </select>
                </div>
                <div class="form-group">
                    <button type="button" class="btn btn-sm btn-danger" onclick="removeRow(this)">Remove</button>
                </div>
            </div>
        `;
    }
    
    // Replace the button finding logic with:
    const addButton = Array.from(container.children).find(child => 
        child.tagName === 'BUTTON' && child.textContent.includes('Add Spell')
    );

    if (addButton && addButton.parentNode === container) {
        container.insertBefore(spellRow, addButton);
    } else {
        container.appendChild(spellRow);
    }
};

/**
 * Remove a dynamic row from the form
 */
window.removeRow = function(button) {
    // Find the parent row
    const row = button.closest('.skill-row, .trait-row, .action-row, .legendary-action-row, .spell-row');
    if (row) {
        // Check if this is the first legendary action or spell row being removed
        const container = row.parentElement;
        const isLegendaryFirst = row.classList.contains('legendary-action-row') && 
                                row.querySelector('.legendary-header-section');
        const isSpellFirst = row.classList.contains('spell-row') && 
                            row.querySelector('.spellcasting-header-section');
        
        // Add removing class for animation
        row.classList.add('removing');
        
        // Remove after animation completes
        setTimeout(() => {
            row.remove();
            
            // If we removed the first legendary action or spell row, 
            // and there are other rows, we need to move the header to the next row
            if (isLegendaryFirst || isSpellFirst) {
                const remainingRows = container.querySelectorAll(
                    isLegendaryFirst ? '.legendary-action-row' : '.spell-row'
                );
                
                if (remainingRows.length > 0) {
                    // For now, we'll just remove the header section entirely
                    // In a more complex implementation, you might want to preserve the data
                    console.log('First row with header removed. Header data will be lost.');
                }
            }
        }, 200);
    }
};

// ============================================================================
// STAT BLOCK PARSER FUNCTIONS
// ============================================================================

/**
 * Parse stat block text and convert to creature JSON
 */
    window.parseStatBlock = function() {
        const textArea = document.getElementById('stat-block-text');
        const preview = document.getElementById('stat-block-preview');
        const importBtn = document.getElementById('import-parsed-creature');
        const errorDiv = document.getElementById('stat-block-errors');
        const errorList = document.getElementById('stat-block-error-list');
        
        if (!textArea || !textArea.value.trim()) {
            ToastSystem.show('Please paste a stat block first', 'warning', 2000);  // Changed from EventHandlers.ToastSystem
            return;
        }

    
    const errors = [];
    const warnings = [];
    
    try {
        // Parse the stat block
        const creature = parseStatBlockText(textArea.value.trim(), errors, warnings);
        
        // Store the parsed creature data
        const modal = document.querySelector('[data-modal="stat-block-parser"]');
        if (modal) {
            modal.setAttribute('data-parsed-creature', JSON.stringify(creature));
        }
        
        // Show preview
        preview.innerHTML = renderCreaturePreview(creature);
        
        // Show/hide import button based on success
        if (errors.length === 0) {
            importBtn.style.display = 'inline-flex';
        } else {
            importBtn.style.display = 'none';
        }
        
        // Show errors/warnings
        if (errors.length > 0 || warnings.length > 0) {
            errorDiv.style.display = 'block';
            errorList.innerHTML = [
                ...errors.map(e => `<li style="color: var(--color-danger);">❌ ${e}</li>`),
                ...warnings.map(w => `<li style="color: var(--color-warning);">⚠️ ${w}</li>`)
            ].join('');
        } else {
            errorDiv.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Failed to parse stat block:', error);
        errors.push('Failed to parse stat block: ' + error.message);
        errorDiv.style.display = 'block';
        errorList.innerHTML = `<li style="color: var(--color-danger);">❌ ${error.message}</li>`;
        importBtn.style.display = 'none';
    }
};

/**
 * Parse stat block text into creature object
 */
function parseStatBlockText(text, errors, warnings) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length < 3) {
        errors.push('Stat block is too short. Please paste the complete stat block.');
        return null;
    }
    
    // Initialize creature object
    const creature = {
        id: '',
        name: '',
        type: 'enemy',
        ac: 10,
        maxHP: 1,
        cr: null,
        size: 'Medium',
        race: 'creature',
        subrace: null,
        alignment: null,
        description: null,
        source: 'Imported',
        hasFullStatBlock: true,
        statBlock: {
            fullType: '',
            armorClass: { value: 10, type: null },
            hitPoints: { average: 1, formula: null },
            initiative: { modifier: 0, total: 10 },
            speed: {
                walk: null,
                burrow: null,
                climb: null,
                fly: null,
                swim: null
            },
            abilities: {
                str: { score: 10, modifier: 0 },
                dex: { score: 10, modifier: 0 },
                con: { score: 10, modifier: 0 },
                int: { score: 10, modifier: 0 },
                wis: { score: 10, modifier: 0 },
                cha: { score: 10, modifier: 0 }
            },
            savingThrows: {
                str: null, dex: null, con: null,
                int: null, wis: null, cha: null
            },
            skills: {},
            damageResistances: [],
            damageImmunities: [],
            damageVulnerabilities: [],
            conditionImmunities: [],
            senses: {
                blindsight: null,
                darkvision: null,
                tremorsense: null,
                truesight: null,
                passivePerception: 10
            },
            languages: [],
            challengeRating: {
                cr: null,
                xp: null,
                xpInLair: null,
                proficiencyBonus: 2
            },
            traits: [],
            actions: [],
            reactions: [],
            legendaryActions: null,
            lairActions: null,
            regionalEffects: null,
            spellcasting: null
        }
    };
    
    let currentSection = 'header';
    let currentIndex = 0;
    
    // Parse name (first line)
    creature.name = lines[0];
    creature.id = creature.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    currentIndex++;
    
    // Parse size, type, alignment (second line)
    if (currentIndex < lines.length) {
        const typeLine = lines[currentIndex];
        const typeMatch = typeLine.match(/^(Tiny|Small|Medium|Large|Huge|Gargantuan)\s+(.+?),\s*(.+)$/i);
        if (typeMatch) {
            creature.size = typeMatch[1];
            creature.race = typeMatch[2];
            creature.alignment = typeMatch[3];
            creature.statBlock.fullType = typeLine;
            currentIndex++;
        }
    }
    
    // Continue parsing the rest of the stat block
    while (currentIndex < lines.length) {
        const line = lines[currentIndex];
        
        // Parse AC line
        if (line.startsWith('AC ')) {
            const acMatch = line.match(/AC\s+(\d+)(?:\s*\(([^)]+)\))?.*?Initiative\s+([+-]?\d+)\s*\((\d+)\)?/);
            if (acMatch) {
                creature.ac = parseInt(acMatch[1]);
                creature.statBlock.armorClass.value = creature.ac;
                creature.statBlock.armorClass.type = acMatch[2] || null;
                creature.statBlock.initiative.modifier = parseInt(acMatch[3]);
                creature.statBlock.initiative.total = parseInt(acMatch[4]);
            }
        }
        
        // Parse HP line
        else if (line.startsWith('HP ')) {
            const hpMatch = line.match(/HP\s+(\d+)\s*\(([^)]+)\)/);
            if (hpMatch) {
                creature.maxHP = parseInt(hpMatch[1]);
                creature.statBlock.hitPoints.average = creature.maxHP;
                creature.statBlock.hitPoints.formula = hpMatch[2];
            }
        }
        
        // Parse Speed line
        else if (line.startsWith('Speed ')) {
            parseSpeed(line.substring(6), creature.statBlock.speed);
        }
        
        // Parse ability scores
        else if (line.match(/^(STR|DEX|CON|INT|WIS|CHA)\s+\d+/)) {
            // This is the start of ability scores
            parseAbilityScores(lines, currentIndex, creature.statBlock, errors);
            currentIndex += 5; // Skip the ability score lines we just parsed
        }
        
        // Parse Skills
        else if (line.startsWith('Skills ')) {
            parseSkills(line.substring(7), creature.statBlock.skills);
        }
        
        // Parse Senses
        else if (line.startsWith('Senses ')) {
            parseSenses(line.substring(7), creature.statBlock.senses);
        }
        
        // Parse Languages
        else if (line.startsWith('Languages ')) {
            parseLanguages(line.substring(10), creature.statBlock.languages);
        }
        
        // Parse CR
        else if (line.startsWith('CR ')) {
            parseChallengeRating(line.substring(3), creature, warnings);
        }
        
        // Section headers
        else if (line === 'Traits') {
            currentSection = 'traits';
        }
        else if (line === 'Actions') {
            currentSection = 'actions';
        }
        else if (line === 'Legendary Actions') {
            currentSection = 'legendary';
        }
        else if (line === 'Reactions') {
            currentSection = 'reactions';
        }
        
        // Parse content based on current section
        else if (currentSection === 'traits' && line && !['Actions', 'Legendary Actions', 'Reactions'].includes(line)) {
            parseTrait(lines, currentIndex, creature.statBlock.traits);
        }
        else if (currentSection === 'actions' && line && !['Legendary Actions', 'Reactions'].includes(line)) {
            parseAction(lines, currentIndex, creature.statBlock.actions);
        }
        else if (currentSection === 'legendary' && line) {
            parseLegendaryActions(lines, currentIndex, creature.statBlock);
        }
        
        currentIndex++;
    }
    
    // Validate required fields
    if (!creature.name) errors.push('Creature name is missing');
    if (!creature.ac || creature.ac < 1) errors.push('Armor Class is missing or invalid');
    if (!creature.maxHP || creature.maxHP < 1) errors.push('Hit Points are missing or invalid');
    
    return creature;
};

/**
 * Parse speed from text
 */
function parseSpeed(speedText, speedObj) {
    // Reset all speeds
    speedObj.walk = null;
    speedObj.fly = null;
    speedObj.swim = null;
    speedObj.climb = null;
    speedObj.burrow = null;
    
    // Parse different speed types
    const speedPattern = /(\w+)?\s*(\d+)\s*ft\.?/gi;
    let match;
    
    while ((match = speedPattern.exec(speedText)) !== null) {
        const type = match[1] ? match[1].toLowerCase() : 'walk';
        const value = parseInt(match[2]);
        
        switch (type) {
            case 'fly':
            case 'flying':
                speedObj.fly = value;
                break;
            case 'swim':
            case 'swimming':
                speedObj.swim = value;
                break;
            case 'climb':
            case 'climbing':
                speedObj.climb = value;
                break;
            case 'burrow':
            case 'burrowing':
                speedObj.burrow = value;
                break;
            default:
                speedObj.walk = value;
                break;
        }
    }
    
    // If no specific type was found, assume it's walk speed
    if (!speedText.includes('fly') && !speedText.includes('swim') && 
        !speedText.includes('climb') && !speedText.includes('burrow')) {
        const simpleMatch = speedText.match(/(\d+)\s*ft\.?/);
        if (simpleMatch) {
            speedObj.walk = parseInt(simpleMatch[1]);
        }
    }
}

/**
 * Parse ability scores from stat block lines
 */
function parseAbilityScores(lines, startIndex, statBlock, errors) {
    const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    let currentLine = lines[startIndex];
    
    // Try to parse all abilities from a single line first
    const singleLinePattern = /STR\s+(\d+)\s*\(([+-]?\d+)\)\s*DEX\s+(\d+)\s*\(([+-]?\d+)\)\s*CON\s+(\d+)\s*\(([+-]?\d+)\)\s*INT\s+(\d+)\s*\(([+-]?\d+)\)\s*WIS\s+(\d+)\s*\(([+-]?\d+)\)\s*CHA\s+(\d+)\s*\(([+-]?\d+)\)/i;
    const singleLineMatch = currentLine.match(singleLinePattern);
    
    if (singleLineMatch) {
        // Parse from single line format
        statBlock.abilities.str.score = parseInt(singleLineMatch[1]);
        statBlock.abilities.str.modifier = parseInt(singleLineMatch[2]);
        statBlock.abilities.dex.score = parseInt(singleLineMatch[3]);
        statBlock.abilities.dex.modifier = parseInt(singleLineMatch[4]);
        statBlock.abilities.con.score = parseInt(singleLineMatch[5]);
        statBlock.abilities.con.modifier = parseInt(singleLineMatch[6]);
        statBlock.abilities.int.score = parseInt(singleLineMatch[7]);
        statBlock.abilities.int.modifier = parseInt(singleLineMatch[8]);
        statBlock.abilities.wis.score = parseInt(singleLineMatch[9]);
        statBlock.abilities.wis.modifier = parseInt(singleLineMatch[10]);
        statBlock.abilities.cha.score = parseInt(singleLineMatch[11]);
        statBlock.abilities.cha.modifier = parseInt(singleLineMatch[12]);
    } else {
        // Try to parse from multi-line format
        for (let i = 0; i < 6 && startIndex + i < lines.length; i++) {
            const line = lines[startIndex + i];
            const abilityPattern = /(STR|DEX|CON|INT|WIS|CHA)\s+(\d+)\s*\(([+-]?\d+)\)/gi;
            let abilityMatch;
            
            while ((abilityMatch = abilityPattern.exec(line)) !== null) {
                const ability = abilityMatch[1].toLowerCase();
                const score = parseInt(abilityMatch[2]);
                const modifier = parseInt(abilityMatch[3]);
                
                if (statBlock.abilities[ability]) {
                    statBlock.abilities[ability].score = score;
                    statBlock.abilities[ability].modifier = modifier;
                }
            }
        }
    }
    
    // Validate that we got all abilities
    let missingAbilities = [];
    abilities.forEach(ability => {
        if (!statBlock.abilities[ability].score) {
            missingAbilities.push(ability.toUpperCase());
        }
    });
    
    if (missingAbilities.length > 0) {
        errors.push(`Missing ability scores: ${missingAbilities.join(', ')}`);
    }
}

/**
 * Parse skills from text
 */
function parseSkills(skillsText, skillsObj) {
    // Clear existing skills
    Object.keys(skillsObj).forEach(key => delete skillsObj[key]);
    
    // Match skill name followed by +/- and number
    const skillPattern = /(\w+(?:\s+\w+)?)\s*([+-]\d+)/g;
    let match;
    
    while ((match = skillPattern.exec(skillsText)) !== null) {
        const skillName = match[1].toLowerCase().replace(/\s+/g, '');
        const bonus = parseInt(match[2]);
        skillsObj[skillName] = bonus;
    }
}

/**
 * Parse senses from text
 */
function parseSenses(sensesText, sensesObj) {
    // Parse different sense types
    const blindsightMatch = sensesText.match(/blindsight\s+(\d+)\s*ft\.?/i);
    if (blindsightMatch) sensesObj.blindsight = parseInt(blindsightMatch[1]);
    
    const darkvisionMatch = sensesText.match(/darkvision\s+(\d+)\s*ft\.?/i);
    if (darkvisionMatch) sensesObj.darkvision = parseInt(darkvisionMatch[1]);
    
    const tremorsenseMatch = sensesText.match(/tremorsense\s+(\d+)\s*ft\.?/i);
    if (tremorsenseMatch) sensesObj.tremorsense = parseInt(tremorsenseMatch[1]);
    
    const truesightMatch = sensesText.match(/truesight\s+(\d+)\s*ft\.?/i);
    if (truesightMatch) sensesObj.truesight = parseInt(truesightMatch[1]);
    
    const passiveMatch = sensesText.match(/passive\s+perception\s+(\d+)/i);
    if (passiveMatch) sensesObj.passivePerception = parseInt(passiveMatch[1]);
}

/**
 * Parse languages from text
 */
function parseLanguages(languagesText, languagesArray) {
    // Clear array
    languagesArray.length = 0;
    
    // Split by commas and clean up
    const languages = languagesText.split(',').map(lang => lang.trim()).filter(lang => lang);
    languagesArray.push(...languages);
}

/**
 * Parse challenge rating and XP
 */
function parseChallengeRating(crText, creature, warnings) {
    // Match CR and XP patterns
    const crMatch = crText.match(/^([\d\/]+)\s*(?:\(([0-9,]+)\s*XP\))?/);
    
    if (crMatch) {
        creature.cr = crMatch[1];
        creature.statBlock.challengeRating.cr = crMatch[1];
        
        if (crMatch[2]) {
            const xp = parseInt(crMatch[2].replace(/,/g, ''));
            creature.statBlock.challengeRating.xp = xp;
        } else {
            // Calculate XP from CR if not provided
            const xpByCR = {
                '0': 10, '1/8': 25, '1/4': 50, '1/2': 100,
                '1': 200, '2': 450, '3': 700, '4': 1100,
                '5': 1800, '6': 2300, '7': 2900, '8': 3900,
                '9': 5000, '10': 5900, '11': 7200, '12': 8400,
                '13': 10000, '14': 11500, '15': 13000, '16': 15000,
                '17': 18000, '18': 20000, '19': 22000, '20': 25000,
                '21': 33000, '22': 41000, '23': 50000, '24': 62000,
                '25': 75000, '26': 90000, '27': 105000, '28': 120000,
                '29': 135000, '30': 155000
            };
            
            if (xpByCR[creature.cr]) {
                creature.statBlock.challengeRating.xp = xpByCR[creature.cr];
            } else {
                warnings.push(`Could not determine XP value for CR ${creature.cr}`);
            }
        }
        
        // Calculate proficiency bonus from CR
        const crValue = eval(creature.cr); // Handle fractions like "1/2"
        creature.statBlock.challengeRating.proficiencyBonus = Math.floor((crValue - 1) / 4) + 2;
    } else {
        warnings.push('Could not parse challenge rating');
    }
}

/**
 * Parse a trait from the stat block
 */
function parseTrait(lines, startIndex, traitsArray) {
    const line = lines[startIndex];
    
    // Match trait name (text before period or colon)
    const nameMatch = line.match(/^([^.:]+)[.:]/);
    if (!nameMatch) return;
    
    const traitName = nameMatch[1].trim();
    let description = line.substring(nameMatch[0].length).trim();
    
    // Check if description continues on next lines
    let nextIndex = startIndex + 1;
    while (nextIndex < lines.length) {
        const nextLine = lines[nextIndex];
        
        // Stop if we hit another trait, action, or section header
        if (nextLine.match(/^[A-Z]/) || 
            nextLine === 'Actions' || 
            nextLine === 'Legendary Actions' || 
            nextLine === 'Reactions') {
            break;
        }
        
        description += ' ' + nextLine;
        nextIndex++;
    }
    
    const trait = {
        name: traitName,
        description: description.trim(),
        usage: null
    };
    
    // Check for usage patterns
    const usageMatch = description.match(/\((\d+)\/Day\)/i);
    if (usageMatch) {
        trait.usage = {
            type: 'perDay',
            amount: usageMatch[1]
        };
    }
    
    traitsArray.push(trait);
}

/**
 * Parse an action from the stat block
 */
function parseAction(lines, startIndex, actionsArray) {
    const line = lines[startIndex];
    
    // Match action name
    const nameMatch = line.match(/^([^.:]+)[.:]/);
    if (!nameMatch) return;
    
    const actionName = nameMatch[1].trim();
    let description = line.substring(nameMatch[0].length).trim();
    
    // Collect multi-line descriptions
    let nextIndex = startIndex + 1;
    while (nextIndex < lines.length) {
        const nextLine = lines[nextIndex];
        
        // Stop if we hit another action or section
        if (nextLine.match(/^[A-Z]/) || 
            nextLine === 'Legendary Actions' || 
            nextLine === 'Reactions') {
            break;
        }
        
        description += ' ' + nextLine;
        nextIndex++;
    }
    
    const action = {
        name: actionName,
        type: 'special',
        description: description.trim()
    };
    
    // Determine action type and parse details
    if (description.includes('Melee Weapon Attack') || description.includes('Melee Attack')) {
        action.type = 'melee';
    } else if (description.includes('Ranged Weapon Attack') || description.includes('Ranged Attack')) {
        action.type = 'ranged';
    }
    
    // Parse attack bonus
    const attackBonusMatch = description.match(/([+-]\d+)\s+to\s+hit/i);
    if (attackBonusMatch) {
        action.attackBonus = parseInt(attackBonusMatch[1]);
    }
    
    // Parse reach/range
    const reachMatch = description.match(/reach\s+(\d+\s*ft\.?)/i);
    if (reachMatch) {
        action.reach = reachMatch[1];
    }
    
    const rangeMatch = description.match(/range\s+(\d+\/\d+\s*ft\.?)/i);
    if (rangeMatch) {
        action.range = rangeMatch[1];
    }
    
    // Parse damage
    const damageMatch = description.match(/(\d+\s*\([^)]+\)|^\d+)\s+(\w+)\s+damage/i);
    if (damageMatch) {
        action.damage = damageMatch[1];
        action.damageType = damageMatch[2].toLowerCase();
    }
    
    // Parse recharge
    const rechargeMatch = description.match(/\(Recharge\s+(\d+(?:-\d+)?)\)/i);
    if (rechargeMatch) {
        action.recharge = rechargeMatch[1];
    }
    
    actionsArray.push(action);
}

/**
 * Parse legendary actions section
 */
function parseLegendaryActions(lines, startIndex, statBlock) {
    statBlock.legendaryActions = {
        description: '',
        uses: 3,
        usesInLair: null,
        options: []
    };
    
    // Parse the description line
    let currentIndex = startIndex + 1;
    if (currentIndex < lines.length) {
        const descLine = lines[currentIndex];
        
        // Check for uses in description
        const usesMatch = descLine.match(/can take (\d+) legendary actions/i);
        if (usesMatch) {
            statBlock.legendaryActions.uses = parseInt(usesMatch[1]);
        }
        
        // Check for lair uses
        const lairMatch = descLine.match(/or (\d+) while in its lair/i);
        if (lairMatch) {
            statBlock.legendaryActions.usesInLair = parseInt(lairMatch[1]);
        }
        
        statBlock.legendaryActions.description = descLine;
        currentIndex++;
    }
    
    // Parse legendary action options
    while (currentIndex < lines.length) {
        const line = lines[currentIndex];
        
        // Stop if we hit another section
        if (line === 'Reactions' || line === 'Lair Actions') {
            break;
        }
        
        // Parse legendary action
        const nameMatch = line.match(/^([^.:]+)[.:]/);
        if (nameMatch) {
            const actionName = nameMatch[1].trim();
            let description = line.substring(nameMatch[0].length).trim();
            
            // Collect multi-line descriptions
            let nextIndex = currentIndex + 1;
            while (nextIndex < lines.length && !lines[nextIndex].match(/^[A-Z]/)) {
                description += ' ' + lines[nextIndex];
                nextIndex++;
            }
            
            const option = {
                name: actionName,
                description: description.trim(),
                cost: 1
            };
            
            // Check for cost in name or description
            const costMatch = actionName.match(/\(Costs (\d+) Actions?\)/i) || 
                             description.match(/\(Costs (\d+) Actions?\)/i);
            if (costMatch) {
                option.cost = parseInt(costMatch[1]);
            }
            
            statBlock.legendaryActions.options.push(option);
        }
        
        currentIndex++;
    }
}

/**
 * Render creature preview HTML
 */
function renderCreaturePreview(creature) {
    if (!creature) {
        return '<div class="empty-state"><p>Unable to parse stat block</p></div>';
    }
    
    const html = `
        <div class="stat-block">
            <div class="stat-block-header">
                <h3 class="stat-block-creature-name">${creature.name}</h3>
                <p class="creature-type">${creature.statBlock.fullType}</p>
            </div>
            
            <div class="stat-block-section">
                <div class="stat-block-row">
                    <span class="stat-label">Armor Class:</span>
                    <span class="stat-value">${creature.ac}${creature.statBlock.armorClass.type ? ` (${creature.statBlock.armorClass.type})` : ''}</span>
                </div>
                <div class="stat-block-row">
                    <span class="stat-label">Hit Points:</span>
                    <span class="stat-value">${creature.maxHP}${creature.statBlock.hitPoints.formula ? ` (${creature.statBlock.hitPoints.formula})` : ''}</span>
                </div>
                <div class="stat-block-row">
                    <span class="stat-label">Speed:</span>
                    <span class="stat-value">${formatSpeed(creature.statBlock.speed)}</span>
                </div>
            </div>
            
            <div class="ability-scores">
                ${['str', 'dex', 'con', 'int', 'wis', 'cha'].map(ability => `
                    <div class="ability">
                        <div class="ability-name">${ability.toUpperCase()}</div>
                        <div class="ability-score">${creature.statBlock.abilities[ability].score} (${formatModifier(creature.statBlock.abilities[ability].modifier)})</div>
                    </div>
                `).join('')}
            </div>
            
            ${renderSkills(creature.statBlock.skills)}
            ${renderSenses(creature.statBlock.senses)}
            ${renderLanguages(creature.statBlock.languages)}
            ${renderCR(creature.statBlock.challengeRating)}
            ${renderTraits(creature.statBlock.traits)}
            ${renderActions(creature.statBlock.actions)}
            ${creature.statBlock.legendaryActions ? renderLegendaryActions(creature.statBlock.legendaryActions) : ''}
        </div>
    `;
    
    return html;
}

// Helper functions for rendering
function formatSpeed(speed) {
    const speeds = [];
    if (speed.walk) speeds.push(`${speed.walk} ft.`);
    if (speed.burrow) speeds.push(`burrow ${speed.burrow} ft.`);
    if (speed.climb) speeds.push(`climb ${speed.climb} ft.`);
    if (speed.fly) speeds.push(`fly ${speed.fly} ft.`);
    if (speed.swim) speeds.push(`swim ${speed.swim} ft.`);
    return speeds.join(', ') || '0 ft.';
}

function formatModifier(mod) {
    return mod >= 0 ? `+${mod}` : `${mod}`;
}

function renderSkills(skills) {
    if (!skills || Object.keys(skills).length === 0) return '';
    
    return `
        <div class="stat-block-section">
            <div class="stat-block-row">
                <span class="stat-label">Skills:</span>
                <span class="stat-value">${Object.entries(skills).map(([skill, bonus]) => 
                    `${skill.charAt(0).toUpperCase() + skill.slice(1)} +${bonus}`
                ).join(', ')}</span>
            </div>
        </div>
    `;
}

function renderSenses(senses) {
    const senseList = [];
    if (senses.blindsight) senseList.push(`blindsight ${senses.blindsight} ft.`);
    if (senses.darkvision) senseList.push(`darkvision ${senses.darkvision} ft.`);
    if (senses.tremorsense) senseList.push(`tremorsense ${senses.tremorsense} ft.`);
    if (senses.truesight) senseList.push(`truesight ${senses.truesight} ft.`);
    if (senses.passivePerception) senseList.push(`passive Perception ${senses.passivePerception}`);
    
    if (senseList.length === 0) return '';
    
    return `
        <div class="stat-block-section">
            <div class="stat-block-row">
                <span class="stat-label">Senses:</span>
                <span class="stat-value">${senseList.join(', ')}</span>
            </div>
        </div>
    `;
}

function renderLanguages(languages) {
    if (!languages || languages.length === 0) return '';
    
    return `
        <div class="stat-block-section">
            <div class="stat-block-row">
                <span class="stat-label">Languages:</span>
                <span class="stat-value">${languages.join(', ')}</span>
            </div>
        </div>
    `;
}

function renderCR(cr) {
    return `
        <div class="stat-block-section">
            <div class="stat-block-row">
                <span class="stat-label">Challenge:</span>
                <span class="stat-value">${cr.cr} (${cr.xp ? cr.xp.toLocaleString() : '0'} XP)</span>
            </div>
        </div>
    `;
}

function renderTraits(traits) {
    if (!traits || traits.length === 0) return '';
    
    return `
        <div class="stat-block-section">
            <h4 class="stat-block-section-title">Traits</h4>
            ${traits.map(trait => `
                <div class="trait">
                    <span class="trait-name">${trait.name}.</span>
                    <span class="trait-desc">${trait.description}</span>
                </div>
            `).join('')}
        </div>
    `;
}

function renderActions(actions) {
    if (!actions || actions.length === 0) return '';
    
    return `
        <div class="stat-block-section">
            <h4 class="stat-block-section-title">Actions</h4>
            ${actions.map(action => `
                <div class="action">
                    <span class="action-name">${action.name}.</span>
                    <span class="action-desc">${action.description}</span>
                </div>
            `).join('')}
        </div>
    `;
}

function renderLegendaryActions(legendary) {
    return `
        <div class="stat-block-section">
            <h4 class="stat-block-section-title">Legendary Actions</h4>
            ${legendary.description ? `
                <div class="trait">
                    <span class="trait-desc">${legendary.description}</span>
                </div>
            ` : ''}
            ${legendary.options.map(option => `
                <div class="action">
                    <span class="action-name">${option.name}.</span>
                    <span class="action-desc">${option.description}</span>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Import the parsed creature to the database
 */
    window.importParsedCreature = function() {
        const modal = document.querySelector('[data-modal="stat-block-parser"]');
        if (!modal) return;
        
        const parsedData = modal.getAttribute('data-parsed-creature');
        if (!parsedData) {
            ToastSystem.show('No parsed creature data found', 'error', 2000);  // Changed from EventHandlers.ToastSystem
            return;
        }
        
        try {
            const creature = JSON.parse(parsedData);
            
            // Add to the creature database
            DataServices.combatantManager.creatureDatabase.push(creature);
            
            // Save to localStorage
            EventHandlers.saveCreatureDatabase();
            
            // Close the parser modal
            ModalSystem.hide('stat-block-parser');  // Changed from EventHandlers.ModalSystem
            
            // Show success message
            ToastSystem.show(`${creature.name} imported successfully!`, 'success', 3000);  // Changed from EventHandlers.ToastSystem
            
            // If the creature database modal is open, refresh it
            if (ModalSystem.getActiveModal() === 'creature-database') {  // Changed from EventHandlers.ModalSystem
                EventHandlers.initializeCreatureList();
            }
            
        } catch (error) {
            console.error('Failed to import creature:', error);
            ToastSystem.show('Failed to import creature', 'error', 3000);  // Changed from EventHandlers.ToastSystem
        }
    };