/**
 * CombatService - Combat management and flow control
 *
 * Handles high-level combat operations including:
 * - Combat lifecycle (start, pause, resume, end)
 * - Turn progression and initiative management
 * - Round tracking and combat phases
 * - Combat state validation and integrity
 * - Initiative order manipulation
 * - Combat statistics and reporting
 *
 * @version 1.0.0
 */

import { StateManager } from '../state-manager.js';
import { CombatState } from '../state/combat-state.js';
import { CombatantState } from '../state/combatant-state.js';
import { CombatantService } from './combatant-service.js';
import { ToastSystem } from '../../components/toast/ToastSystem.js';

export class CombatService {
    /**
     * Start combat with current combatants
     * @returns {Promise<boolean>} Success status
     * @throws {Error} If combat cannot start
     */
    static async startCombat() {
        try {
            const allCombatants = CombatantService.getAllCombatants();

            if (!CombatState.canStartCombat(allCombatants)) {
                throw new Error('Cannot start combat without combatants');
            }

            console.log('🎲 Starting combat...');

            // Sort combatants by initiative
            const sortedCombatants = [...allCombatants].sort(CombatantState.compareInitiative);

            // Update initiative order in state
            for (let i = 0; i < sortedCombatants.length; i++) {
                const combatant = sortedCombatants[i];
                const index = allCombatants.findIndex(c => c.id === combatant.id);
                if (index !== i) {
                    // Reorder in state manager
                    StateManager.updateCombatant(combatant.id, combatant);
                }
            }

            // Start combat through state manager
            StateManager.startCombat();

            const firstCombatant = CombatantService.getActiveCombatant();
            console.log(`✅ Combat started! ${firstCombatant.name} goes first`);
            ToastSystem.show(`Combat started! ${firstCombatant.name}'s turn`, 'success', 3000);

            return true;
        } catch (error) {
            console.error('Failed to start combat:', error);
            ToastSystem.show(`Failed to start combat: ${error.message}`, 'error', 3000);
            throw error;
        }
    }

    /**
     * End/reset combat
     * @param {boolean} confirm - Whether to show confirmation (default: true)
     * @returns {Promise<boolean>} Success status
     */
    static async endCombat(confirm = true) {
        try {
            if (confirm && !window.confirm('End combat? This will reset all combat progress.')) {
                return false;
            }

            console.log('🔄 Ending combat...');

            // Reset combat through state manager
            StateManager.resetCombat();

            console.log('✅ Combat ended');
            ToastSystem.show('Combat ended', 'info', 2000);

            return true;
        } catch (error) {
            console.error('Failed to end combat:', error);
            ToastSystem.show(`Failed to end combat: ${error.message}`, 'error', 3000);
            throw error;
        }
    }

    /**
     * Advance to next turn
     * @returns {Promise<boolean>} Success status
     */
    static async nextTurn() {
        try {
            const combatState = StateManager.getStateSlice('combat');
            if (!combatState.isActive) {
                throw new Error('Combat is not active');
            }

            console.log('⏭️ Advancing to next turn...');

            // Advance turn through state manager
            StateManager.nextTurn();

            const newActiveCombatant = CombatantService.getActiveCombatant();
            const stats = this.getCombatStats();

            console.log(`✅ ${newActiveCombatant.name}'s turn (Round ${stats.round})`);
            ToastSystem.show(`${newActiveCombatant.name}'s turn (Round ${stats.round})`, 'info', 2000);

            return true;
        } catch (error) {
            console.error('Failed to advance turn:', error);
            ToastSystem.show(`Failed to advance turn: ${error.message}`, 'error', 3000);
            throw error;
        }
    }

    /**
     * Pause combat
     * @returns {Promise<boolean>} Success status
     */
    static async pauseCombat() {
        try {
            const combatState = StateManager.getStateSlice('combat');
            if (!combatState.isActive) {
                throw new Error('Combat is not active');
            }

            const pausedState = CombatState.pauseCombat(combatState);
            StateManager.updateCombat(pausedState);

            console.log('⏸️ Combat paused');
            ToastSystem.show('Combat paused', 'info', 2000);

            return true;
        } catch (error) {
            console.error('Failed to pause combat:', error);
            ToastSystem.show(`Failed to pause combat: ${error.message}`, 'error', 3000);
            throw error;
        }
    }

    /**
     * Resume paused combat
     * @returns {Promise<boolean>} Success status
     */
    static async resumeCombat() {
        try {
            const combatState = StateManager.getStateSlice('combat');
            if (combatState.phase !== 'paused') {
                throw new Error('Combat is not paused');
            }

            const resumedState = CombatState.resumeCombat(combatState);
            StateManager.updateCombat(resumedState);

            console.log('▶️ Combat resumed');
            ToastSystem.show('Combat resumed', 'info', 2000);

            return true;
        } catch (error) {
            console.error('Failed to resume combat:', error);
            ToastSystem.show(`Failed to resume combat: ${error.message}`, 'error', 3000);
            throw error;
        }
    }

    /**
     * Move combatant in initiative order
     * @param {string} combatantId - ID of combatant to move
     * @param {string} direction - 'up' or 'down'
     * @returns {Promise<boolean>} Success status
     */
    static async moveInInitiativeOrder(combatantId, direction) {
        try {
            const combatant = CombatantService.getCombatant(combatantId);
            if (!combatant) {
                throw new Error(`Combatant not found: ${combatantId}`);
            }

            const allCombatants = CombatantService.getCombatantsByInitiative();
            const currentIndex = allCombatants.findIndex(c => c.id === combatantId);

            if (currentIndex === -1) {
                throw new Error('Combatant not found in initiative order');
            }

            let targetIndex;
            if (direction === 'up' && currentIndex > 0) {
                targetIndex = currentIndex - 1;
            } else if (direction === 'down' && currentIndex < allCombatants.length - 1) {
                targetIndex = currentIndex + 1;
            } else {
                throw new Error(`Cannot move ${direction} - already at ${direction === 'up' ? 'top' : 'bottom'}`);
            }

            // Swap initiative values
            const targetCombatant = allCombatants[targetIndex];
            const tempInitiative = combatant.initiative;

            await CombatantService.updateCombatant(combatantId, 'initiative', targetCombatant.initiative);
            await CombatantService.updateCombatant(targetCombatant.id, 'initiative', tempInitiative);

            console.log(`✅ Moved ${combatant.name} ${direction} in initiative order`);
            ToastSystem.show(`Moved ${combatant.name} ${direction} in initiative`, 'success', 2000);

            return true;
        } catch (error) {
            console.error('Failed to move in initiative order:', error);
            ToastSystem.show(`Failed to reorder: ${error.message}`, 'error', 3000);
            throw error;
        }
    }

    /**
     * Set combatant initiative
     * @param {string} combatantId - Combatant ID
     * @param {number} initiative - New initiative value
     * @returns {Promise<boolean>} Success status
     */
    static async setInitiative(combatantId, initiative) {
        try {
            if (typeof initiative !== 'number') {
                throw new Error('Initiative must be a number');
            }

            const combatant = CombatantService.getCombatant(combatantId);
            if (!combatant) {
                throw new Error(`Combatant not found: ${combatantId}`);
            }

            await CombatantService.updateCombatant(combatantId, 'initiative', initiative);

            console.log(`✅ Set ${combatant.name} initiative to ${initiative}`);
            ToastSystem.show(`${combatant.name} initiative set to ${initiative}`, 'success', 2000);

            return true;
        } catch (error) {
            console.error('Failed to set initiative:', error);
            ToastSystem.show(`Failed to set initiative: ${error.message}`, 'error', 3000);
            throw error;
        }
    }

    /**
     * Get current combat statistics
     * @returns {Object} Combat statistics
     */
    static getCombatStats() {
        const combatState = StateManager.getStateSlice('combat');
        const allCombatants = CombatantService.getAllCombatants();

        if (!combatState.isActive) {
            return {
                isActive: false,
                round: 0,
                turn: 0,
                totalCombatants: allCombatants.length,
                activeCombatant: null
            };
        }

        const stats = CombatState.getTurnStats(combatState, allCombatants);
        const activeCombatant = CombatantService.getActiveCombatant();

        return {
            isActive: combatState.isActive,
            phase: combatState.phase,
            round: stats.round,
            turn: stats.turn,
            totalTurns: stats.totalTurns,
            totalCombatants: stats.totalCombatants,
            activeCombatant: activeCombatant,
            activeCombatantName: stats.activeCombatantName,
            unconsciousCount: allCombatants.filter(c => c.currentHP === 0).length,
            averageHP: allCombatants.reduce((sum, c) => sum + c.currentHP, 0) / allCombatants.length || 0
        };
    }

    /**
     * Get initiative order
     * @returns {Array} Combatants in initiative order
     */
    static getInitiativeOrder() {
        return CombatantService.getCombatantsByInitiative();
    }

    /**
     * Check if combat is active
     * @returns {boolean} True if combat is active
     */
    static isCombatActive() {
        const combatState = StateManager.getStateSlice('combat');
        return combatState.isActive;
    }

    /**
     * Check if combat is paused
     * @returns {boolean} True if combat is paused
     */
    static isCombatPaused() {
        const combatState = StateManager.getStateSlice('combat');
        return combatState.phase === 'paused';
    }

    /**
     * Get turn order for display
     * @returns {Array} Combatants with turn order information
     */
    static getTurnOrder() {
        const initiativeOrder = this.getInitiativeOrder();
        const combatState = StateManager.getStateSlice('combat');

        return initiativeOrder.map((combatant, index) => ({
            ...combatant,
            turnOrder: index + 1,
            isActiveTurn: combatState.isActive && combatant.isActive,
            isUpcoming: combatState.isActive && index > combatState.currentTurnIndex,
            hasActed: combatState.isActive && index < combatState.currentTurnIndex
        }));
    }

    /**
     * Clear all combatants from encounter
     * @param {boolean} confirm - Whether to show confirmation (default: true)
     * @returns {Promise<boolean>} Success status
     */
    static async clearEncounter(confirm = true) {
        try {
            const allCombatants = CombatantService.getAllCombatants();
            if (allCombatants.length === 0) {
                ToastSystem.show('No combatants to clear', 'info', 2000);
                return true;
            }

            if (confirm && !window.confirm(`Remove all ${allCombatants.length} combatants from the encounter?`)) {
                return false;
            }

            console.log('🗑️ Clearing encounter...');

            // Remove all combatants
            for (const combatant of allCombatants) {
                await CombatantService.removeCombatant(combatant.id);
            }

            // Reset combat state
            StateManager.resetCombat();

            console.log('✅ Encounter cleared');
            ToastSystem.show('Encounter cleared', 'success', 2000);

            return true;
        } catch (error) {
            console.error('Failed to clear encounter:', error);
            ToastSystem.show(`Failed to clear encounter: ${error.message}`, 'error', 3000);
            throw error;
        }
    }

    /**
     * Validate combat state integrity
     * @returns {Object} Validation result
     */
    static validateCombatState() {
        const combatState = StateManager.getStateSlice('combat');
        const allCombatants = CombatantService.getAllCombatants();

        // Validate combat state
        const combatValidation = CombatState.validateState(combatState, allCombatants);
        if (!combatValidation.isValid) {
            return combatValidation;
        }

        // Validate combatants
        const combatantErrors = [];
        for (const combatant of allCombatants) {
            const validation = CombatantState.validateCombatant(combatant);
            if (!validation.isValid) {
                combatantErrors.push(`${combatant.name}: ${validation.errors.join(', ')}`);
            }
        }

        // Check for exactly one active combatant during active combat
        if (combatState.isActive) {
            const activeCombatants = allCombatants.filter(c => c.isActive);
            if (activeCombatants.length !== 1) {
                combatantErrors.push(`Expected exactly 1 active combatant, found ${activeCombatants.length}`);
            }
        }

        return {
            isValid: combatantErrors.length === 0,
            errors: combatantErrors
        };
    }

    /**
     * Get combat summary for reporting
     * @returns {Object} Combat summary
     */
    static getCombatSummary() {
        const stats = this.getCombatStats();
        const allCombatants = CombatantService.getAllCombatants();
        const validation = this.validateCombatState();

        return {
            timestamp: new Date().toISOString(),
            combatStats: stats,
            combatants: allCombatants.map(c => ({
                id: c.id,
                name: c.name,
                type: c.type,
                initiative: c.initiative,
                currentHP: c.currentHP,
                maxHP: c.maxHP,
                tempHP: c.tempHP,
                isActive: c.isActive,
                conditions: c.conditions.length,
                effects: c.effects.length,
                healthState: CombatantState.getHealthState(c)
            })),
            validation: validation
        };
    }

    /**
     * Export combat data for external use
     * @returns {Object} Exportable combat data
     */
    static exportCombatData() {
        return {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            combat: StateManager.getStateSlice('combat'),
            combatants: StateManager.getStateSlice('combatants'),
            summary: this.getCombatSummary()
        };
    }
}