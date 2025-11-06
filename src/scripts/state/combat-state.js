/**
 * CombatState - Combat round/turn state management
 *
 * Handles combat-specific state including:
 * - Round tracking and progression
 * - Turn order and current active combatant
 * - Combat phase management (start, active, end)
 * - Turn-based effect processing
 * - Initiative order management
 * - Encounter filename tracking for save/load operations
 *
 * State Properties:
 * - encounterFileName: {string|null} - Name of the currently saved/loaded encounter file
 *   Updated by EncounterEvents on save/load operations
 *   Displayed in combat header via info icon tooltip
 *
 * @version 1.1.0
 */

export class CombatState {
    /**
     * Initialize combat state with default values
     */
    static init() {
        // Initialize clean combat state
        // Used when app first loads or after clearing encounter
        return {
            isActive: false,           // Combat hasn't started yet
            round: 1,                  // Start at round 1 (not 0, for user friendliness)
            currentTurnIndex: 0,       // First combatant in initiative order
            phase: 'inactive',         // inactive = not started, active = running, paused = temporarily stopped
            encounterFileName: null    // Name of saved/loaded encounter file (null if unsaved)
        };
    }

    /**
     * Start combat with given combatants
     * @param {Array} combatants - Array of combatant objects
     * @returns {Object} Updated combat state
     */
    static startCombat(combatants) {
        // Validation: need at least one combatant to start combat
        if (!combatants || combatants.length === 0) {
            throw new Error('Cannot start combat without combatants');
        }

        // Sort combatants by initiative (highest goes first)
        // D&D 5e rule: higher initiative = earlier in turn order
        // Ties are broken alphabetically for consistency
        const sortedCombatants = [...combatants].sort((a, b) => {
            // Primary sort: initiative (descending - highest first)
            if (b.initiative !== a.initiative) {
                return b.initiative - a.initiative;
            }
            // Tiebreaker: alphabetical by name
            return a.name.localeCompare(b.name);
        });

        return {
            isActive: true,                                     // Combat is now running
            round: 1,                                           // Start at round 1
            currentTurnIndex: 0,                                // First combatant's turn
            phase: 'active',                                    // Set to active (not paused)
            initiativeOrder: sortedCombatants.map(c => c.id)  // Store IDs for reference
        };
    }

    /**
     * Advance to next turn in initiative order
     * @param {Object} currentState - Current combat state
     * @param {Array} combatants - Array of all combatants
     * @returns {Object} Updated combat state with turn advancement
     */
    static advanceTurn(currentState, combatants) {
        // Safety check: can't advance turns if combat isn't active
        if (!currentState.isActive) {
            throw new Error('Cannot advance turn when combat is not active');
        }

        // Move to next combatant in initiative order
        let newTurnIndex = currentState.currentTurnIndex + 1;
        let newRound = currentState.round;

        // Check if we've reached the end of the round
        // When turnIndex exceeds combatants, we loop back to 0 and increment round
        // Example: 4 combatants, currently on index 3 (4th combatant)
        //          Next turn: index would be 4, which is >= 4, so reset to 0 and increment round
        if (newTurnIndex >= combatants.length) {
            newTurnIndex = 0;                    // Back to first combatant
            newRound = currentState.round + 1;   // Increment round counter
        }

        // Return updated state (immutable pattern)
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
        // Return empty stats if combat isn't active
        if (!combatState.isActive || !combatants) {
            return {
                round: 0,
                turn: 0,
                totalTurns: 0,
                activeCombatantName: null
            };
        }

        const activeCombatant = combatants[combatState.currentTurnIndex];

        // Calculate total turns since combat start
        // Formula: (completed rounds × combatants per round) + current turn in this round
        // Example: Round 3, turn 2 of 4 combatants = (2 × 4) + 2 = 10 total turns
        const totalTurnsInRound = (combatState.round - 1) * combatants.length + combatState.currentTurnIndex + 1;

        return {
            round: combatState.round,                                      // Current round number
            turn: combatState.currentTurnIndex + 1,                        // Turn in this round (1-indexed for display)
            totalTurns: totalTurnsInRound,                                 // Total turns since combat start
            activeCombatantName: activeCombatant ? activeCombatant.name : null,  // Who's turn it is
            totalCombatants: combatants.length                             // How many combatants total
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

        // Check for null/undefined state
        if (!combatState) {
            errors.push('Combat state is null or undefined');
            return { isValid: false, errors };
        }

        // Round must be a positive number (rounds start at 1, not 0)
        if (typeof combatState.round !== 'number' || combatState.round < 1) {
            errors.push('Invalid round number');
        }

        // Turn index must be a non-negative number (0-indexed array)
        if (typeof combatState.currentTurnIndex !== 'number' || combatState.currentTurnIndex < 0) {
            errors.push('Invalid turn index');
        }

        // If combat is active, turn index must be within bounds
        // Example: 4 combatants means valid indices are 0, 1, 2, 3 (not 4)
        if (combatState.isActive && combatants) {
            if (combatState.currentTurnIndex >= combatants.length) {
                errors.push('Turn index exceeds combatant count');
            }
        }

        // Phase must be one of the three valid values
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
        // Can't get next combatant if combat isn't active
        if (!combatState.isActive || !combatants || combatants.length === 0) {
            return null;
        }

        // Calculate next combatant index with wraparound
        // If at the end of the list, wrap back to the beginning
        let nextIndex = combatState.currentTurnIndex + 1;
        if (nextIndex >= combatants.length) {
            nextIndex = 0;  // Wrap to first combatant
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
        // Can't get previous combatant if combat isn't active
        if (!combatState.isActive || !combatants || combatants.length === 0) {
            return null;
        }

        // Calculate previous combatant index with wraparound
        // If at the beginning of the list, wrap to the end
        let previousIndex = combatState.currentTurnIndex - 1;
        if (previousIndex < 0) {
            previousIndex = combatants.length - 1;  // Wrap to last combatant
        }

        return combatants[previousIndex] || null;
    }
}