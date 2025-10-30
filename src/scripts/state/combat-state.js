/**
 * CombatState - Combat round/turn state management
 *
 * Handles combat-specific state including:
 * - Round tracking and progression
 * - Turn order and current active combatant
 * - Combat phase management (start, active, end)
 * - Turn-based effect processing
 * - Initiative order management
 *
 * @version 1.0.0
 */

export class CombatState {
    /**
     * Initialize combat state with default values
     */
    static init() {
        return {
            isActive: false,
            round: 1,
            currentTurnIndex: 0,
            phase: 'inactive' // inactive, active, paused
        };
    }

    /**
     * Start combat with given combatants
     * @param {Array} combatants - Array of combatant objects
     * @returns {Object} Updated combat state
     */
    static startCombat(combatants) {
        if (!combatants || combatants.length === 0) {
            throw new Error('Cannot start combat without combatants');
        }

        // Sort combatants by initiative (descending)
        const sortedCombatants = [...combatants].sort((a, b) => {
            if (b.initiative !== a.initiative) {
                return b.initiative - a.initiative;
            }
            return a.name.localeCompare(b.name);
        });

        return {
            isActive: true,
            round: 1,
            currentTurnIndex: 0,
            phase: 'active',
            initiativeOrder: sortedCombatants.map(c => c.id)
        };
    }

    /**
     * Advance to next turn in initiative order
     * @param {Object} currentState - Current combat state
     * @param {Array} combatants - Array of all combatants
     * @returns {Object} Updated combat state with turn advancement
     */
    static advanceTurn(currentState, combatants) {
        if (!currentState.isActive) {
            throw new Error('Cannot advance turn when combat is not active');
        }

        let newTurnIndex = currentState.currentTurnIndex + 1;
        let newRound = currentState.round;

        // Check if we've completed a round
        if (newTurnIndex >= combatants.length) {
            newTurnIndex = 0;
            newRound = currentState.round + 1;
        }

        return {
            ...currentState,
            currentTurnIndex: newTurnIndex,
            round: newRound
        };
    }

    /**
     * Reset combat to initial state
     * @returns {Object} Reset combat state
     */
    static resetCombat() {
        return {
            isActive: false,
            round: 1,
            currentTurnIndex: 0,
            phase: 'inactive',
            initiativeOrder: []
        };
    }

    /**
     * Pause combat (maintain state but stop progression)
     * @param {Object} currentState - Current combat state
     * @returns {Object} Paused combat state
     */
    static pauseCombat(currentState) {
        return {
            ...currentState,
            phase: 'paused'
        };
    }

    /**
     * Resume combat from paused state
     * @param {Object} currentState - Current combat state
     * @returns {Object} Resumed combat state
     */
    static resumeCombat(currentState) {
        return {
            ...currentState,
            phase: 'active'
        };
    }

    /**
     * Get the currently active combatant ID
     * @param {Object} combatState - Current combat state
     * @param {Array} combatants - Array of all combatants
     * @returns {string|null} Active combatant ID or null
     */
    static getActiveCombatantId(combatState, combatants) {
        if (!combatState.isActive || !combatants || combatants.length === 0) {
            return null;
        }

        const activeCombatant = combatants[combatState.currentTurnIndex];
        return activeCombatant ? activeCombatant.id : null;
    }

    /**
     * Check if combat is ready to start
     * @param {Array} combatants - Array of combatants
     * @returns {boolean} True if combat can start
     */
    static canStartCombat(combatants) {
        return combatants && combatants.length > 0;
    }

    /**
     * Get turn statistics
     * @param {Object} combatState - Current combat state
     * @param {Array} combatants - Array of all combatants
     * @returns {Object} Turn statistics
     */
    static getTurnStats(combatState, combatants) {
        if (!combatState.isActive || !combatants) {
            return {
                round: 0,
                turn: 0,
                totalTurns: 0,
                activeCombatantName: null
            };
        }

        const activeCombatant = combatants[combatState.currentTurnIndex];
        const totalTurnsInRound = (combatState.round - 1) * combatants.length + combatState.currentTurnIndex + 1;

        return {
            round: combatState.round,
            turn: combatState.currentTurnIndex + 1,
            totalTurns: totalTurnsInRound,
            activeCombatantName: activeCombatant ? activeCombatant.name : null,
            totalCombatants: combatants.length
        };
    }

    /**
     * Validate combat state integrity
     * @param {Object} combatState - Combat state to validate
     * @param {Array} combatants - Array of combatants
     * @returns {Object} Validation result with isValid and errors
     */
    static validateState(combatState, combatants) {
        const errors = [];

        if (!combatState) {
            errors.push('Combat state is null or undefined');
            return { isValid: false, errors };
        }

        if (typeof combatState.round !== 'number' || combatState.round < 1) {
            errors.push('Invalid round number');
        }

        if (typeof combatState.currentTurnIndex !== 'number' || combatState.currentTurnIndex < 0) {
            errors.push('Invalid turn index');
        }

        if (combatState.isActive && combatants) {
            if (combatState.currentTurnIndex >= combatants.length) {
                errors.push('Turn index exceeds combatant count');
            }
        }

        if (combatState.phase && !['inactive', 'active', 'paused'].includes(combatState.phase)) {
            errors.push('Invalid combat phase');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Get next combatant in initiative order
     * @param {Object} combatState - Current combat state
     * @param {Array} combatants - Array of combatants
     * @returns {Object|null} Next combatant or null
     */
    static getNextCombatant(combatState, combatants) {
        if (!combatState.isActive || !combatants || combatants.length === 0) {
            return null;
        }

        let nextIndex = combatState.currentTurnIndex + 1;
        if (nextIndex >= combatants.length) {
            nextIndex = 0;
        }

        return combatants[nextIndex] || null;
    }

    /**
     * Get previous combatant in initiative order
     * @param {Object} combatState - Current combat state
     * @param {Array} combatants - Array of combatants
     * @returns {Object|null} Previous combatant or null
     */
    static getPreviousCombatant(combatState, combatants) {
        if (!combatState.isActive || !combatants || combatants.length === 0) {
            return null;
        }

        let previousIndex = combatState.currentTurnIndex - 1;
        if (previousIndex < 0) {
            previousIndex = combatants.length - 1;
        }

        return combatants[previousIndex] || null;
    }
}