/**
 * Dice Roller Events Module
 *
 * Handles all dice roller related events and interactions.
 * This module serves as the event handler layer between the EventCoordinator
 * and the DiceRoller component.
 *
 * Event Actions Handled:
 * - 'open-dice-roller': Opens/toggles the dice roller window
 * - 'select-dice': Selects a dice type (d4, d6, etc.)
 * - 'update-multiplier': Updates number of dice to roll
 * - 'update-modifier': Updates modifier to add to roll
 * - 'roll-dice': Performs a normal dice roll
 * - 'roll-advantage': Performs advantage roll (2d20, keep highest)
 * - 'roll-disadvantage': Performs disadvantage roll (2d20, keep lowest)
 * - 'clear-history': Clears all roll history
 *
 * Integration:
 * - Registered in EventCoordinator (events/index.js)
 * - Delegates to DiceRoller component (components/dice-roller/DiceRoller.js)
 * - Uses DiceRollerState for state management
 * - Uses DiceRollerUI for rendering
 * - Triggered by "Roll" button in Encounter Controls (templates/index.html)
 *
 * @module DiceRollerEvents
 * @version 2.0.0
 */

import { DiceRoller } from '../../components/dice-roller/DiceRoller.js';

export class DiceRollerEvents {
    /** @type {boolean} Initialization state */
    static initialized = false;

    /**
     * Initialize dice roller event handling
     * Initializes the underlying DiceRoller component
     * @returns {void}
     */
    static init() {
        if (this.initialized) return;

        console.log('🎲 Dice Roller Events initializing...');

        // Initialize the DiceRoller component
        DiceRoller.init();

        this.initialized = true;
        console.log('✅ Dice Roller Events initialized');
    }

    /**
     * Handle opening/toggling the dice roller window
     * Called when user clicks "Roll" button in Encounter Controls
     * @returns {void}
     */
    static handleOpenDiceRoller() {
        DiceRoller.toggle();
    }

    /**
     * Handle closing the dice roller window
     * Currently unused but available for future use
     * @returns {void}
     */
    static handleCloseDiceRoller() {
        DiceRoller.hide();
    }

    /**
     * Handle dice type selection
     * @param {HTMLElement} target - The clicked dice button
     * @returns {void}
     */
    static handleSelectDice(target) {
        const diceType = parseInt(target.dataset.diceType);
        // This will be called from the standalone dice roller window
        // The window's own event handler will manage this
        console.log('Dice selected:', diceType);
    }

    /**
     * Handle multiplier update
     * @param {HTMLElement} target - The multiplier input element
     * @returns {void}
     */
    static handleUpdateMultiplier(target) {
        const multiplier = parseInt(target.value) || 1;
        // This will be called from the standalone dice roller window
        // The window's own event handler will manage this
        console.log('Multiplier updated:', multiplier);
    }

    /**
     * Handle modifier update
     * @param {HTMLElement} target - The modifier input element
     * @returns {void}
     */
    static handleUpdateModifier(target) {
        const modifier = parseInt(target.value) || 0;
        // This will be called from the standalone dice roller window
        // The window's own event handler will manage this
        console.log('Modifier updated:', modifier);
    }

    /**
     * Handle normal dice roll
     * @returns {void}
     */
    static handleRollDice() {
        // This will be called from the standalone dice roller window
        // The window's own event handler will manage this
        console.log('Rolling dice...');
    }

    /**
     * Handle advantage roll
     * @returns {void}
     */
    static handleRollAdvantage() {
        // This will be called from the standalone dice roller window
        // The window's own event handler will manage this
        console.log('Rolling with advantage...');
    }

    /**
     * Handle disadvantage roll
     * @returns {void}
     */
    static handleRollDisadvantage() {
        // This will be called from the standalone dice roller window
        // The window's own event handler will manage this
        console.log('Rolling with disadvantage...');
    }

    /**
     * Handle clear history
     * @returns {void}
     */
    static handleClearHistory() {
        // This will be called from the standalone dice roller window
        // The window's own event handler will manage this
        console.log('Clearing history...');
    }
}
