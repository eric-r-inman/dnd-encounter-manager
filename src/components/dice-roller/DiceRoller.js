/**
 * DiceRoller - Standalone dice roller in separate browser window
 *
 * This component manages opening and closing a dice roller in its own
 * browser window. The dice roller runs independently from the main app
 * using a standalone HTML file (dice-roller.html) with inline styles.
 *
 * Features:
 * - Opens in minimal browser window (no menubar/toolbar)
 * - Rainbow-colored dice buttons (d4-d100)
 * - Number inputs for multiplier and modifier
 * - Roll history with timestamps (max 30 rolls)
 * - LocalStorage persistence (history survives window close/reopen)
 * - Auto-roll support for stat block dice notation
 *
 * Integration:
 * - Called via EventCoordinator when "open-dice-roller" action triggered
 * - See: dice-roller-events.js for event handling
 * - See: dice-roller.html for standalone implementation
 *
 * @component DiceRoller
 * @version 2.2.0
 * @example
 * // Open dice roller window
 * DiceRoller.show();
 *
 * // Open and auto-roll
 * DiceRoller.showAndRoll({ multiplier: 2, diceType: 8, modifier: 3, damageType: 'piercing' });
 *
 * // Close dice roller window
 * DiceRoller.hide();
 *
 * // Toggle dice roller window
 * DiceRoller.toggle();
 */

export class DiceRoller {
    /** @type {Window|null} Reference to the dice roller window */
    static diceRollerWindow = null;

    /** @type {boolean} Initialization state */
    static initialized = false;

    /** @type {Object|null} Pending roll data to execute when window loads */
    static pendingRoll = null;

    /**
     * Initialize the dice roller system
     * Called automatically on first use
     * @returns {void}
     */
    static init() {
        if (this.initialized) return;

        console.log('🎲 Dice Roller initializing...');
        this.initialized = true;
        console.log('✅ Dice Roller initialized');
    }

    /**
     * Open the dice roller in a new browser window
     * If window is already open, focuses it instead of creating a new one
     * Window opens centered on parent with dimensions 560x700
     * @returns {Promise<void>} Promise that resolves when window is ready
     */
    static show() {
        if (!this.initialized) {
            this.init();
        }

        // Check if window is already open
        if (this.diceRollerWindow && !this.diceRollerWindow.closed) {
            // Focus existing window
            this.diceRollerWindow.focus();
            return Promise.resolve();
        }

        // Open new window with dice roller
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const features = `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`;

        this.diceRollerWindow = window.open('/dice-roller.html', 'DiceRoller', features);

        if (this.diceRollerWindow) {
            this.diceRollerWindow.focus();

            // Return a promise that resolves when the window is loaded
            return new Promise((resolve) => {
                // Set up a message listener for the ready signal
                const readyListener = (event) => {
                    if (event.origin !== window.location.origin) return;
                    if (event.data && event.data.type === 'DICE_ROLLER_READY') {
                        console.log('✅ Dice roller window is ready');
                        window.removeEventListener('message', readyListener);
                        resolve();
                    }
                };
                window.addEventListener('message', readyListener);

                // Fallback timeout in case ready message doesn't arrive
                setTimeout(() => {
                    console.log('⏱️ Dice roller ready timeout - proceeding anyway');
                    window.removeEventListener('message', readyListener);
                    resolve();
                }, 1000);
            });
        }

        return Promise.resolve();
    }

    /**
     * Close the dice roller window if it's currently open
     * Clears the window reference after closing
     * @returns {void}
     */
    static hide() {
        if (this.diceRollerWindow && !this.diceRollerWindow.closed) {
            this.diceRollerWindow.close();
            this.diceRollerWindow = null;
        }
    }

    /**
     * Toggle the dice roller window open/closed
     * Opens window if closed, closes if open
     * @returns {void}
     */
    static toggle() {
        if (!this.initialized) {
            this.init();
        }

        if (this.diceRollerWindow && !this.diceRollerWindow.closed) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Open dice roller and automatically roll with specified parameters
     * @param {Object} rollData - Roll parameters
     * @param {number} rollData.multiplier - Number of dice to roll
     * @param {number} rollData.diceType - Type of dice (4, 6, 8, 10, 12, 20, 100)
     * @param {number} rollData.modifier - Modifier to add to roll
     * @param {string} rollData.damageType - Damage type label (optional)
     * @param {string} rollData.formula - Formula string for display (optional)
     * @returns {void}
     */
    static async showAndRoll(rollData) {
        console.log('🎲 DiceRoller.showAndRoll called with:', rollData);

        // Store roll data to be executed when window loads
        this.pendingRoll = rollData;

        // If window is already open, send the roll command immediately
        if (this.diceRollerWindow && !this.diceRollerWindow.closed) {
            console.log('📝 Window already open, focusing and sending command');
            this.diceRollerWindow.focus();
            // Add a small delay to ensure window is ready
            setTimeout(() => this.sendRollCommand(rollData), 50);
        } else {
            console.log('🪟 Opening new dice roller window');
            // Open window and wait for it to be ready
            await this.show();
            console.log('🎯 Window ready, sending roll command');
            // Send the roll command after window is ready
            this.sendRollCommand(rollData);
        }
    }

    /**
     * Send a roll command to the dice roller window
     * @param {Object} rollData - Roll parameters
     * @returns {void}
     */
    static sendRollCommand(rollData) {
        if (!this.diceRollerWindow || this.diceRollerWindow.closed) {
            console.warn('⚠️ Cannot send roll command: window not available');
            return;
        }

        try {
            console.log('📤 Sending postMessage to dice roller window:', rollData);
            // Post message to dice roller window
            this.diceRollerWindow.postMessage({
                type: 'EXECUTE_ROLL',
                data: rollData
            }, window.location.origin);
            console.log('✅ PostMessage sent successfully');
        } catch (error) {
            console.error('❌ Failed to send roll command to dice roller:', error);
        }
    }

    /**
     * Get pending roll data and clear it
     * Called by dice roller window when it loads
     * @returns {Object|null} Pending roll data or null
     */
    static getPendingRoll() {
        const roll = this.pendingRoll;
        this.pendingRoll = null;
        return roll;
    }
}
