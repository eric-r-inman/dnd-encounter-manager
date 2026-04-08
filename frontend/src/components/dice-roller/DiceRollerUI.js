/**
 * DiceRollerUI - UI rendering component for dice roller
 *
 * Handles rendering the dice roller interface including:
 * - Dice selection buttons
 * - Multiplier and modifier inputs
 * - Roll buttons (normal, advantage, disadvantage)
 * - Roll history display
 *
 * Separation of concerns:
 * - This component handles UI rendering only
 * - State management is handled by DiceRollerState
 * - Event handling is handled by DiceRollerEvents
 *
 * @component DiceRollerUI
 * @version 2.0.0
 */

export class DiceRollerUI {
    /** @type {Array<number>} Available dice types */
    static DICE_TYPES = [4, 6, 8, 10, 12, 20, 100];

    /**
     * Render the complete dice roller interface
     * @param {Object} state - Current dice roller state
     * @returns {string} HTML string for dice roller
     */
    static render(state) {
        return `
            <div class="dice-roller-container">
                ${this.renderDiceOptions(state.selectedDiceType)}
                ${this.renderInputRow(state.multiplier, state.modifier)}
                ${this.renderRollButtons(state.selectedDiceType, state.multiplier)}
                ${this.renderHistory(state.rollHistory)}
            </div>
        `;
    }

    /**
     * Render dice selection buttons
     * @param {number|null} selectedDiceType - Currently selected dice type
     * @returns {string} HTML string for dice options
     */
    static renderDiceOptions(selectedDiceType) {
        const buttons = this.DICE_TYPES.map(diceType => {
            const selectedClass = diceType === selectedDiceType ? 'selected' : '';
            return `
                <button
                    class="dice-button ${selectedClass}"
                    data-dice-type="${diceType}"
                    data-action="select-dice">
                    d${diceType}
                </button>
            `;
        }).join('');

        return `
            <div class="dice-options" id="diceOptions">
                <button
                    class="coin-flip-button"
                    data-action="flip-coin"
                    title="Flip a coin">
                    🪙
                </button>
                ${buttons}
            </div>
        `;
    }

    /**
     * Render multiplier and modifier input fields
     * @param {number} multiplier - Current multiplier value
     * @param {number} modifier - Current modifier value
     * @returns {string} HTML string for input row
     */
    static renderInputRow(multiplier, modifier) {
        return `
            <div class="input-row">
                <div class="input-group">
                    <label for="multiplier">×</label>
                    <input
                        type="number"
                        id="multiplier"
                        class="dice-input"
                        min="1"
                        max="99"
                        value="${multiplier}"
                        data-action="update-multiplier">
                </div>

                <div class="input-group">
                    <label for="modifier">+</label>
                    <input
                        type="number"
                        id="modifier"
                        class="dice-input"
                        min="-99"
                        max="99"
                        value="${modifier}"
                        data-action="update-modifier">
                </div>
            </div>
        `;
    }

    /**
     * Render roll buttons (including conditional advantage/disadvantage)
     * @param {number|null} selectedDiceType - Currently selected dice type
     * @param {number} multiplier - Current multiplier value
     * @returns {string} HTML string for roll buttons
     */
    static renderRollButtons(selectedDiceType, multiplier) {
        // Show advantage/disadvantage buttons only for 1d20
        const showAdvDisadv = selectedDiceType === 20 && multiplier === 1;

        return `
            <div class="roll-button-row">
                <button
                    class="disadvantage-button ${showAdvDisadv ? '' : 'hidden'}"
                    id="disadvantageButton"
                    data-action="roll-disadvantage">
                    Disadvantage &lt;&lt;
                </button>
                <button
                    class="roll-button"
                    id="rollButton"
                    data-action="roll-dice">
                    Roll
                </button>
                <button
                    class="advantage-button ${showAdvDisadv ? '' : 'hidden'}"
                    id="advantageButton"
                    data-action="roll-advantage">
                    &gt;&gt; Advantage
                </button>
            </div>
        `;
    }

    /**
     * Render roll history section
     * @param {Array} rollHistory - Array of roll result objects
     * @returns {string} HTML string for history section
     */
    static renderHistory(rollHistory) {
        const historyItems = rollHistory.length === 0
            ? '<li class="empty-history">No rolls yet. Start rolling!</li>'
            : rollHistory.map((result, index) => this.renderHistoryItem(result, index)).join('');

        return `
            <div class="history-section">
                <div class="history-header">
                    <h2>Roll History</h2>
                    <button class="clear-button" id="clearButton" data-action="clear-history">Clear</button>
                </div>
                <ul class="history-list" id="historyList">
                    ${historyItems}
                </ul>
            </div>
        `;
    }

    /**
     * Render a single history item
     * @param {Object} result - Roll result object
     * @param {number} index - Index of this item in the history
     * @returns {string} HTML string for history item
     */
    static renderHistoryItem(result, index) {
        // Handle coin flip display
        if (result.isCoinFlip) {
            return `
                <li class="history-item">
                    <div class="history-item-header">
                        <span class="history-item-timestamp">${result.timestamp}</span>
                        <button class="reroll-button"
                                data-action="flip-coin"
                                title="Flip again">⟳</button>
                    </div>
                    <div>
                        <span class="roll-formula">${result.formula}:</span>
                        <span class="roll-total coin-result">${result.total}</span>
                    </div>
                </li>
            `;
        }

        const modifierStr = result.modifier !== 0
            ? (result.modifier >= 0 ? ` +${result.modifier}` : ` ${result.modifier}`)
            : '';

        let rollsDisplay;

        // Handle advantage/disadvantage display with highlighting
        if (result.isAdvantage || result.isDisadvantage) {
            const highlightClass = result.isAdvantage
                ? 'roll-highlighted'
                : 'roll-highlighted roll-highlighted-disadvantage';

            rollsDisplay = '[';
            result.rolls.forEach((roll, idx) => {
                const rollWithModifier = roll + result.modifier;
                if (idx === result.keptRollIndex) {
                    rollsDisplay += `<span class="${highlightClass}">${roll}${modifierStr} = ${rollWithModifier}</span>`;
                } else {
                    rollsDisplay += `${roll}${modifierStr} = ${rollWithModifier}`;
                }
                if (idx < result.rolls.length - 1) {
                    rollsDisplay += ', ';
                }
            });
            rollsDisplay += ']';
        } else {
            // Regular roll display
            rollsDisplay = `[${result.rolls.join(', ')}]${modifierStr}`;
        }

        // Encode roll data for re-roll button
        const rerollData = JSON.stringify({
            diceType: this.extractDiceTypeFromFormula(result.formula),
            multiplier: this.extractMultiplierFromFormula(result.formula),
            modifier: result.modifier,
            isAdvantage: result.isAdvantage || false,
            isDisadvantage: result.isDisadvantage || false
        }).replace(/"/g, '&quot;');

        // Format damage type if present
        const damageTypeDisplay = result.damageType
            ? `<span class="damage-type">${result.damageType}</span>`
            : '';

        return `
            <li class="history-item">
                <div class="history-item-header">
                    <span class="history-item-timestamp">${result.timestamp}</span>
                    <button class="reroll-button"
                            data-action="reroll"
                            data-history-index="${index}"
                            data-reroll-data="${rerollData}"
                            title="Re-roll this">⟳</button>
                </div>
                <div>
                    <span class="roll-formula">${result.formula}:</span>
                    <span class="roll-details">${rollsDisplay}</span>
                    <span class="roll-total">= ${result.total}</span>
                    ${damageTypeDisplay}
                </div>
            </li>
        `;
    }

    /**
     * Extract dice type from formula string
     * @param {string} formula - Formula string like "2d8+3" or "1d20 (Advantage)"
     * @returns {number} Dice type
     */
    static extractDiceTypeFromFormula(formula) {
        const match = formula.match(/d(\d+)/);
        return match ? parseInt(match[1]) : 20;
    }

    /**
     * Extract multiplier from formula string
     * @param {string} formula - Formula string like "2d8+3" or "1d20 (Advantage)"
     * @returns {number} Multiplier
     */
    static extractMultiplierFromFormula(formula) {
        const match = formula.match(/(\d+)d\d+/);
        return match ? parseInt(match[1]) : 1;
    }

    /**
     * Update the entire dice roller UI
     * @param {HTMLElement} container - Container element to render into
     * @param {Object} state - Current dice roller state
     */
    static update(container, state) {
        container.innerHTML = this.render(state);
    }
}
