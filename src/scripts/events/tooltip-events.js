/**
 * TooltipEvents - Tooltip and hover interaction handlers
 *
 * Handles all tooltip-related functionality including:
 * - Condition tooltip display with D&D 5e rule details
 * - Batch operation tooltips showing selected combatants
 * - Tooltip positioning and auto-adjustment for viewport
 *
 * @version 1.0.0
 */

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
            { title: "Crawling", desc: "Your only movement option is to crawl, unless you stand up." },
            { title: "Attacks Affected", desc: "You have Disadvantage on attack rolls." },
            { title: "Incoming Attacks", desc: "An attack roll against you has Advantage if the attacker is within 5 feet of you. Otherwise, the attack roll has Disadvantage." }
        ]
    },
    'Restrained': {
        effects: [
            { title: "Speed 0", desc: "Your Speed is 0 and can't increase." },
            { title: "Attacks Affected", desc: "You have Disadvantage on attack rolls, and attack rolls against you have Advantage." },
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
            { title: "Incapacitated and Prone", desc: "You have the Incapacitated and Prone conditions." },
            { title: "Speed 0", desc: "Your Speed is 0 and can't increase." },
            { title: "Saving Throws Affected", desc: "You automatically fail Strength and Dexterity saving throws." },
            { title: "Attacks Affected", desc: "Attack rolls against you have Advantage." },
            { title: "Automatic Critical Hits", desc: "Any attack roll that hits you is a Critical Hit if the attacker is within 5 feet of you." },
            { title: "Unaware", desc: "You're unaware of your surroundings." }
        ]
    }
};

export class TooltipEvents {
    /**
     * Initialize tooltip event handlers
     */
    static init() {
        this.setupBatchTooltips();
        this.setupConditionTooltips();
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
     * @param {HTMLElement} element - The element containing the text
     * @param {Event} event - Mouse event for position
     * @returns {string|null} - Condition name if found
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
     * Show condition tooltip with D&D 5e rule details
     * @param {string} conditionName - Name of the condition
     * @param {Event} event - Mouse event for positioning
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
     * Update condition tooltip position to follow cursor
     * @param {Event} event - Mouse event with coordinates
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
     * @param {HTMLElement} button - The batch button being hovered
     * @param {Event} event - Mouse event for positioning
     */
    static showBatchTooltip(button, event) {
        const tooltip = document.getElementById('batch-tooltip');
        if (!tooltip) return;

        // Get selected combatants from the EventCoordinator
        const selectedCombatants = window.EventCoordinator?.getSelectedCombatants() || [];
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
     * Update batch tooltip position to follow cursor
     * @param {Event} event - Mouse event with coordinates
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
}