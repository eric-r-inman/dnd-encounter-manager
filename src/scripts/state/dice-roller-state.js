/**
 * DiceRollerState - State management for dice roller
 *
 * Handles dice roller state including:
 * - Selected dice type and multiplier/modifier
 * - Roll history with session storage persistence
 * - Roll calculations for normal, advantage, and disadvantage
 *
 * State structure:
 * - selectedDiceType: number | null - Currently selected dice (d4, d6, etc.)
 * - multiplier: number - Number of dice to roll (1-20)
 * - modifier: number - Modifier to add to roll total (-20 to +20)
 * - rollHistory: Array - List of previous rolls (max 25)
 *
 * @module DiceRollerState
 * @version 2.0.0
 */

export class DiceRollerState {
    /** @type {number} Maximum number of history items to keep */
    static MAX_HISTORY = 25;

    /** @type {string} SessionStorage key for roll history */
    static STORAGE_KEY = 'diceRollerHistory';

    /**
     * Initialize dice roller state with default values
     * @returns {Object} Initial state object
     */
    static init() {
        return {
            selectedDiceType: null,
            multiplier: 1,
            modifier: 0,
            rollHistory: this.loadHistory()
        };
    }

    /**
     * Update selected dice type
     * @param {Object} currentState - Current state object
     * @param {number} diceType - Dice type to select (4, 6, 8, 10, 12, 20, 100)
     * @returns {Object} Updated state object
     */
    static selectDice(currentState, diceType) {
        return {
            ...currentState,
            selectedDiceType: diceType
        };
    }

    /**
     * Update multiplier (number of dice to roll)
     * @param {Object} currentState - Current state object
     * @param {number} multiplier - New multiplier value (1-20)
     * @returns {Object} Updated state object
     */
    static updateMultiplier(currentState, multiplier) {
        const validMultiplier = Math.max(1, Math.min(20, multiplier));
        return {
            ...currentState,
            multiplier: validMultiplier
        };
    }

    /**
     * Update modifier (bonus/penalty to add)
     * @param {Object} currentState - Current state object
     * @param {number} modifier - New modifier value (-999 to +999)
     * @returns {Object} Updated state object
     */
    static updateModifier(currentState, modifier) {
        const validModifier = Math.max(-999, Math.min(999, modifier));
        return {
            ...currentState,
            modifier: validModifier
        };
    }

    /**
     * Perform a normal dice roll
     * @param {Object} currentState - Current state object
     * @returns {Object} Updated state with new roll in history
     */
    static rollDice(currentState) {
        const { selectedDiceType, multiplier, modifier } = currentState;

        if (selectedDiceType === null) {
            return currentState;
        }

        // Roll the dice
        const rolls = [];
        for (let i = 0; i < multiplier; i++) {
            rolls.push(Math.floor(Math.random() * selectedDiceType) + 1);
        }

        const sum = rolls.reduce((a, b) => a + b, 0);
        const total = sum + modifier;

        const result = {
            formula: modifier !== 0
                ? `${multiplier}d${selectedDiceType}${modifier >= 0 ? '+' : ''}${modifier}`
                : `${multiplier}d${selectedDiceType}`,
            rolls: rolls,
            modifier: modifier,
            total: total,
            timestamp: new Date().toLocaleTimeString()
        };

        return this.addToHistory(currentState, result);
    }

    /**
     * Perform an advantage roll (2d20, keep highest)
     * @param {Object} currentState - Current state object
     * @returns {Object} Updated state with new roll in history
     */
    static rollWithAdvantage(currentState) {
        const { selectedDiceType, modifier } = currentState;

        if (selectedDiceType !== 20) {
            return currentState;
        }

        const roll1 = Math.floor(Math.random() * 20) + 1;
        const roll2 = Math.floor(Math.random() * 20) + 1;

        const total1 = roll1 + modifier;
        const total2 = roll2 + modifier;
        const finalTotal = Math.max(total1, total2);
        const keptRollIndex = total1 >= total2 ? 0 : 1;

        const result = {
            formula: modifier !== 0
                ? `1d20${modifier >= 0 ? '+' : ''}${modifier} (Advantage)`
                : `1d20 (Advantage)`,
            rolls: [roll1, roll2],
            modifier: modifier,
            total: finalTotal,
            timestamp: new Date().toLocaleTimeString(),
            isAdvantage: true,
            keptRollIndex: keptRollIndex
        };

        return this.addToHistory(currentState, result);
    }

    /**
     * Perform a disadvantage roll (2d20, keep lowest)
     * @param {Object} currentState - Current state object
     * @returns {Object} Updated state with new roll in history
     */
    static rollWithDisadvantage(currentState) {
        const { selectedDiceType, modifier } = currentState;

        if (selectedDiceType !== 20) {
            return currentState;
        }

        const roll1 = Math.floor(Math.random() * 20) + 1;
        const roll2 = Math.floor(Math.random() * 20) + 1;

        const total1 = roll1 + modifier;
        const total2 = roll2 + modifier;
        const finalTotal = Math.min(total1, total2);
        const keptRollIndex = total1 <= total2 ? 0 : 1;

        const result = {
            formula: modifier !== 0
                ? `1d20${modifier >= 0 ? '+' : ''}${modifier} (Disadvantage)`
                : `1d20 (Disadvantage)`,
            rolls: [roll1, roll2],
            modifier: modifier,
            total: finalTotal,
            timestamp: new Date().toLocaleTimeString(),
            isDisadvantage: true,
            keptRollIndex: keptRollIndex
        };

        return this.addToHistory(currentState, result);
    }

    /**
     * Add a roll result to history
     * @param {Object} currentState - Current state object
     * @param {Object} result - Roll result to add
     * @returns {Object} Updated state with new roll in history
     */
    static addToHistory(currentState, result) {
        const newHistory = [result, ...currentState.rollHistory];

        // Limit to MAX_HISTORY
        if (newHistory.length > this.MAX_HISTORY) {
            newHistory.length = this.MAX_HISTORY;
        }

        const newState = {
            ...currentState,
            rollHistory: newHistory
        };

        // Save to session storage
        this.saveHistory(newHistory);

        return newState;
    }

    /**
     * Flip a coin (50/50 heads or tails)
     * @param {Object} currentState - Current state object
     * @returns {Object} Updated state with coin flip in history
     */
    static flipCoin(currentState) {
        const isHeads = Math.random() < 0.5;
        const result = isHeads ? 'Heads' : 'Tails';

        const coinFlip = {
            formula: 'Coin Flip',
            rolls: [result],
            modifier: 0,
            total: result,
            timestamp: new Date().toLocaleTimeString(),
            isCoinFlip: true
        };

        return this.addToHistory(currentState, coinFlip);
    }

    /**
     * Clear all roll history
     * @param {Object} currentState - Current state object
     * @returns {Object} Updated state with empty history
     */
    static clearHistory(currentState) {
        const newState = {
            ...currentState,
            rollHistory: []
        };

        this.saveHistory([]);

        return newState;
    }

    /**
     * Save roll history to session storage
     * @param {Array} history - Roll history array
     */
    static saveHistory(history) {
        try {
            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
        } catch (error) {
            console.error('Failed to save dice roller history:', error);
        }
    }

    /**
     * Load roll history from session storage
     * @returns {Array} Loaded roll history or empty array
     */
    static loadHistory() {
        try {
            const saved = sessionStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('Failed to load dice roller history:', error);
        }
        return [];
    }
}
