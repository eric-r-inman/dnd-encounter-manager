/**
 * CombatEvents - Combat flow control and management
 *
 * Handles combat-specific functionality including:
 * - Turn progression and initiative order
 * - Combat round tracking
 * - Combat header updates
 * - Combat state management (start, reset, clear)
 * - Initiative order manipulation
 *
 * @version 1.0.0
 */

import { StateManager } from '../state-manager.js';
import { ToastSystem } from '../../components/toast/ToastSystem.js';
import { DataServices } from '../data-services.js';

export class CombatEvents {
    /**
     * Initialize combat control handlers
     */
    static init() {
        this.setupCombatControls();
    }

    /**
     * Set up combat control event handlers
     */
    static setupCombatControls() {
        // Combat controls are handled through main event delegation in EventCoordinator
        console.log('🎲 Combat controls initialized');
    }

    /**
     * Handle next turn advancement
     */
    static handleNextTurn() {
        const allCombatants = DataServices.combatantManager.getAllCombatants();
        if (allCombatants.length === 0) {
            ToastSystem.show('No combatants in encounter', 'warning', 2000);
            return;
        }

        // Sort combatants by initiative (descending) and name (ascending for ties)
        const sortedCombatants = allCombatants.sort((a, b) => {
            if (b.initiative !== a.initiative) {
                return b.initiative - a.initiative;
            }
            return a.name.localeCompare(b.name);
        });

        // Find current active combatant index
        let currentIndex = sortedCombatants.findIndex(c => c.status.isActive);

        // If no active combatant, start with first
        if (currentIndex === -1) {
            currentIndex = 0;
        } else {
            // Move to next combatant
            currentIndex++;

            // If we've reached the end, go to first and increment round
            if (currentIndex >= sortedCombatants.length) {
                currentIndex = 0;
                this.incrementRound();
            }
        }

        // Clear all active states
        allCombatants.forEach(combatant => {
            DataServices.combatantManager.updateCombatant(combatant.id, 'status.isActive', false);
        });

        // Set new active combatant
        const newActiveCombatant = sortedCombatants[currentIndex];
        DataServices.combatantManager.updateCombatant(newActiveCombatant.id, 'status.isActive', true);

        // Process turn-based effects
        this.processTurnEffects(newActiveCombatant);

        // Update combat header
        this.updateCombatHeader();

        ToastSystem.show(`${newActiveCombatant.name}'s turn`, 'info', 2000);
    }

    /**
     * Handle combat reset
     */
    static handleResetCombat() {
        if (!confirm('Reset combat? This will clear initiative order and reset all combatants.')) {
            return;
        }

        // Reset all combatants
        const allCombatants = DataServices.combatantManager.getAllCombatants();
        allCombatants.forEach(combatant => {
            // Clear active status
            DataServices.combatantManager.updateCombatant(combatant.id, 'status.isActive', false);

            // Clear hold action
            DataServices.combatantManager.updateCombatant(combatant.id, 'status.holdAction', false);

            // Clear surprised status
            DataServices.combatantManager.updateCombatant(combatant.id, 'status.surprised', false);
        });

        // Reset combat state
        StateManager.state.combat.isActive = false;
        StateManager.state.combat.round = 1;
        StateManager.state.combat.currentTurnIndex = 0;

        // Update combat header
        this.updateCombatHeader();

        ToastSystem.show('Combat reset', 'success', 2000);
    }

    /**
     * Handle clear encounter (remove all combatants)
     */
    static handleClearEncounter() {
        const allCombatants = DataServices.combatantManager.getAllCombatants();
        if (allCombatants.length === 0) {
            ToastSystem.show('No combatants to clear', 'info', 2000);
            return;
        }

        if (!confirm(`Remove all ${allCombatants.length} combatants from the encounter?`)) {
            return;
        }

        // Remove all combatants
        allCombatants.forEach(combatant => {
            DataServices.combatantManager.removeCombatant(combatant.id);
        });

        // Reset combat state
        StateManager.state.combat.isActive = false;
        StateManager.state.combat.round = 1;
        StateManager.state.combat.currentTurnIndex = 0;

        // Update combat header
        this.updateCombatHeader();

        ToastSystem.show('Encounter cleared', 'success', 2000);
    }

    /**
     * Increment combat round
     */
    static incrementRound() {
        StateManager.state.combat.round++;

        // Process round-based effects (conditions/effects that decrease each round)
        this.processRoundEffects();

        ToastSystem.show(`Round ${StateManager.state.combat.round}`, 'info', 1500);
    }

    /**
     * Update combat header display
     */
    static updateCombatHeader() {
        const headerElement = document.getElementById('initiative-header-display');
        if (!headerElement) return;

        const allCombatants = DataServices.combatantManager.getAllCombatants();
        const activeCombatant = allCombatants.find(c => c.status.isActive);
        const round = StateManager.state.combat.round;

        if (!activeCombatant || allCombatants.length === 0) {
            headerElement.innerHTML = `
                <span class="combat-round">Round ${round}</span>
                <span class="combat-status">No active combatant</span>
            `;
            return;
        }

        // Build conditions list for active combatant
        const conditionsList = activeCombatant.conditions.map(c => {
            const duration = c.duration === 'infinite' ? '∞' : c.duration;
            return `${c.name} (${duration})`;
        }).join(', ');

        // Build effects list for active combatant
        const effectsList = activeCombatant.effects.map(e => {
            const duration = e.duration === 'infinite' ? '∞' : e.duration;
            return `${e.name} (${duration})`;
        }).join(', ');

        // Combine conditions and effects
        const statusList = [conditionsList, effectsList].filter(s => s).join(', ');

        headerElement.innerHTML = `
            <span class="combat-round">Round ${round}</span>
            <span class="current-turn-name clickable-name">${activeCombatant.name}</span>
            <span class="current-turn-hp">${activeCombatant.currentHP}/${activeCombatant.maxHP} HP</span>
            ${statusList ? `<span class="conditions-list">${statusList}</span>` : ''}
        `;
    }

    /**
     * Process turn-based effects (called when a combatant's turn starts)
     * @param {Object} combatant - The combatant whose turn is starting
     */
    static processTurnEffects(combatant) {
        let hasChanges = false;

        // Process conditions that decrement on turn start
        combatant.conditions = combatant.conditions.filter(condition => {
            if (condition.duration !== 'infinite' && condition.duration > 0) {
                condition.duration--;
                hasChanges = true;

                // Remove if duration reaches 0
                if (condition.duration === 0) {
                    ToastSystem.show(`${condition.name} ended on ${combatant.name}`, 'info', 2000);
                    return false;
                }
            }
            return true;
        });

        // Process effects that decrement on turn start
        combatant.effects = combatant.effects.filter(effect => {
            if (effect.duration !== 'infinite' && effect.duration > 0) {
                effect.duration--;
                hasChanges = true;

                // Remove if duration reaches 0
                if (effect.duration === 0) {
                    ToastSystem.show(`${effect.name} ended on ${combatant.name}`, 'info', 2000);
                    return false;
                }
            }
            return true;
        });

        // Update combatant if there were changes
        if (hasChanges) {
            DataServices.combatantManager.updateCombatant(combatant.id, 'conditions', combatant.conditions);
            DataServices.combatantManager.updateCombatant(combatant.id, 'effects', combatant.effects);
        }
    }

    /**
     * Process round-based effects (called at the start of each round)
     */
    static processRoundEffects() {
        const allCombatants = DataServices.combatantManager.getAllCombatants();

        allCombatants.forEach(combatant => {
            let hasChanges = false;

            // Process conditions that might have round-based effects
            // (Most D&D conditions are turn-based, but some house rules might use round-based)

            // Example: Ongoing damage effects that trigger each round
            combatant.effects.forEach(effect => {
                if (effect.name.toLowerCase().includes('ongoing') && effect.duration !== 'infinite') {
                    // TODO: Implement ongoing damage/healing effects
                    console.log(`Processing ongoing effect: ${effect.name} on ${combatant.name}`);
                }
            });
        });
    }

    /**
     * Handle initiative order changes
     * @param {HTMLElement} target - The element that triggered the change
     * @param {string} direction - 'up' or 'down'
     */
    static handleInitiativeReorder(target, direction) {
        const combatantCard = target.closest('[data-combatant-id]');
        const combatantId = combatantCard?.getAttribute('data-combatant-id');

        if (!combatantId) return;

        const combatant = DataServices.combatantManager.getCombatant(combatantId);
        if (!combatant) return;

        // Get all combatants sorted by initiative
        const allCombatants = DataServices.combatantManager.getAllCombatants();
        const sortedCombatants = allCombatants.sort((a, b) => {
            if (b.initiative !== a.initiative) {
                return b.initiative - a.initiative;
            }
            return a.name.localeCompare(b.name);
        });

        const currentIndex = sortedCombatants.findIndex(c => c.id === combatantId);
        if (currentIndex === -1) return;

        let targetIndex;
        if (direction === 'up' && currentIndex > 0) {
            targetIndex = currentIndex - 1;
        } else if (direction === 'down' && currentIndex < sortedCombatants.length - 1) {
            targetIndex = currentIndex + 1;
        } else {
            return; // Can't move further in that direction
        }

        // Swap initiative values
        const targetCombatant = sortedCombatants[targetIndex];
        const tempInitiative = combatant.initiative;

        DataServices.combatantManager.updateCombatant(combatantId, 'initiative', targetCombatant.initiative);
        DataServices.combatantManager.updateCombatant(targetCombatant.id, 'initiative', tempInitiative);

        ToastSystem.show(`Moved ${combatant.name} ${direction} in initiative order`, 'success', 2000);
    }

    /**
     * Start combat (activate first combatant)
     */
    static startCombat() {
        const allCombatants = DataServices.combatantManager.getAllCombatants();
        if (allCombatants.length === 0) {
            ToastSystem.show('Add combatants to start combat', 'warning', 2000);
            return;
        }

        // Sort by initiative
        const sortedCombatants = allCombatants.sort((a, b) => {
            if (b.initiative !== a.initiative) {
                return b.initiative - a.initiative;
            }
            return a.name.localeCompare(b.name);
        });

        // Clear all active states
        allCombatants.forEach(combatant => {
            DataServices.combatantManager.updateCombatant(combatant.id, 'status.isActive', false);
        });

        // Activate first combatant
        const firstCombatant = sortedCombatants[0];
        DataServices.combatantManager.updateCombatant(firstCombatant.id, 'status.isActive', true);

        // Set combat state
        StateManager.state.combat.isActive = true;
        StateManager.state.combat.round = 1;
        StateManager.state.combat.currentTurnIndex = 0;

        // Update header
        this.updateCombatHeader();

        ToastSystem.show(`Combat started! ${firstCombatant.name}'s turn`, 'success', 3000);
    }
}