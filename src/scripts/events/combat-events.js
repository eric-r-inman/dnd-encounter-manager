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
     *
     * WHY: This method manages the D&D 5e turn order system. In D&D, turns progress
     * in initiative order (highest to lowest), with ties broken alphabetically.
     * When combat reaches the last combatant, it loops back to the first and
     * increments the round counter.
     *
     * WHY: We use the same sorting logic as renderAll() to ensure the turn order
     * matches what the user sees visually. This prevents confusion where clicking
     * "Next Turn" jumps to an unexpected combatant.
     */
    static handleNextTurn() {
        const allCombatants = DataServices.combatantManager.getAllCombatants();
        if (allCombatants.length === 0) {
            ToastSystem.show('No combatants in encounter', 'warning', 2000);
            return;
        }

        // Sort combatants using the same logic as CombatantManager.renderAll()
        // This ensures turn order matches visual order
        const sortedCombatants = allCombatants.sort((a, b) => {
            // WHY: Manual order takes highest priority - allows DMs to override initiative
            // for special situations (legendary actions, lair actions, etc.)
            if (a.manualOrder !== null && b.manualOrder !== null) {
                return a.manualOrder - b.manualOrder;
            }

            // WHY: Manually ordered combatants always come first, regardless of initiative
            if (a.manualOrder !== null) return -1;
            if (b.manualOrder !== null) return 1;

            // WHY: Standard D&D 5e rule - higher initiative goes first
            if (b.initiative !== a.initiative) {
                return b.initiative - a.initiative;
            }

            // WHY: D&D 5e rule - when initiative is tied, use alphabetical order
            // (some DMs prefer DEX tiebreaker, but alphabetical is simpler and avoids edge cases)
            return a.name.localeCompare(b.name);
        });

        // Find current active combatant index
        let currentIndex = sortedCombatants.findIndex(c => c.status.isActive);

        // WHY: If no combatant is active yet (combat just started or was reset),
        // we need to start with the first combatant in initiative order
        if (currentIndex === -1) {
            currentIndex = 0;
        } else {
            // Move to next combatant in initiative order
            currentIndex++;

            // WHY: In D&D 5e, when everyone has taken their turn, a new round begins
            // and we loop back to the top of the initiative order
            if (currentIndex >= sortedCombatants.length) {
                currentIndex = 0;
                this.incrementRound();
            }
        }

        // WHY: Process end-of-turn effects BEFORE switching to the next combatant
        // Some D&D effects expire "at the end of your turn" (e.g., Shield spell)
        const currentActiveCombatant = allCombatants.find(c => c.status.isActive);
        if (currentActiveCombatant) {
            this.processEndOfTurnEffects(currentActiveCombatant);

            // Trigger end-of-turn auto-roll if configured
            if (currentActiveCombatant.autoRoll && currentActiveCombatant.autoRoll.trigger === 'end') {
                import('./auto-roll-events.js').then(module => {
                    module.AutoRollEvents.triggerAutoRoll(currentActiveCombatant, 'end');
                });
            }

            // WHY: D&D 5e rule - Surprised condition lasts until the end of the creature's first turn
            if (currentActiveCombatant.status.surprised) {
                DataServices.combatantManager.updateCombatant(currentActiveCombatant.id, 'status.surprised', false);
                ToastSystem.show(`${currentActiveCombatant.name} is no longer surprised`, 'info', 2000);
            }
        }

        // WHY: Clear all active states before setting the new one to ensure
        // only one combatant is marked as active at a time
        allCombatants.forEach(combatant => {
            DataServices.combatantManager.updateCombatant(combatant.id, 'status.isActive', false);
        });

        // Set new active combatant
        const newActiveCombatant = sortedCombatants[currentIndex];
        DataServices.combatantManager.updateCombatant(newActiveCombatant.id, 'status.isActive', true);

        // WHY: Process turn-based effects AFTER setting the new active combatant
        // Some D&D effects expire "at the start of your turn" (e.g., Hunter's Mark concentration check)
        this.processTurnEffects(newActiveCombatant);

        // Trigger start-of-turn auto-roll if configured
        if (newActiveCombatant.autoRoll && newActiveCombatant.autoRoll.trigger === 'start') {
            import('./auto-roll-events.js').then(module => {
                module.AutoRollEvents.triggerAutoRoll(newActiveCombatant, 'start');
            });
        }

        // Update combat header
        this.updateCombatHeader();

        ToastSystem.show(`${newActiveCombatant.name}'s turn`, 'info', 2000);
    }

    /**
     * Handle combat reset - restore all combatants to default stats
     */
    static handleResetCombat() {
        if (!confirm('Reset combat? This will restore all combatants to full HP and clear all conditions, effects, auto-rolls, and status flags.')) {
            return;
        }

        // Reset all combatants to default stats
        const allCombatants = DataServices.combatantManager.getAllCombatants();
        allCombatants.forEach(combatant => {
            // Restore HP to maximum
            DataServices.combatantManager.updateCombatant(combatant.id, 'currentHP', combatant.maxHP);

            // Clear temporary HP
            DataServices.combatantManager.updateCombatant(combatant.id, 'tempHP', 0);

            // Clear all status flags
            DataServices.combatantManager.updateCombatant(combatant.id, 'status.isActive', false);
            DataServices.combatantManager.updateCombatant(combatant.id, 'status.holdAction', false);
            DataServices.combatantManager.updateCombatant(combatant.id, 'status.surprised', false);
            DataServices.combatantManager.updateCombatant(combatant.id, 'status.concentration', false);
            DataServices.combatantManager.updateCombatant(combatant.id, 'status.concentrationSpell', '');
            DataServices.combatantManager.updateCombatant(combatant.id, 'status.hiding', false);
            DataServices.combatantManager.updateCombatant(combatant.id, 'status.cover', 'none');

            // Clear all conditions
            DataServices.combatantManager.updateCombatant(combatant.id, 'conditions', []);

            // Clear all effects
            DataServices.combatantManager.updateCombatant(combatant.id, 'effects', []);

            // Clear auto-roll (turn-based dice roller)
            DataServices.combatantManager.updateCombatant(combatant.id, 'autoRoll', null);

            // Clear HP history
            DataServices.combatantManager.updateCombatant(combatant.id, 'damageHistory', []);
            DataServices.combatantManager.updateCombatant(combatant.id, 'healHistory', []);
            DataServices.combatantManager.updateCombatant(combatant.id, 'tempHPHistory', []);

            // Clear death saves
            DataServices.combatantManager.updateCombatant(combatant.id, 'deathSaves', [false, false, false]);
        });

        // Reset combat state to inactive
        StateManager.state.combat.isActive = false;
        StateManager.state.combat.round = 1;
        StateManager.state.combat.currentTurnIndex = 0;

        // Update combat header
        this.updateCombatHeader();

        // Re-render all combatants to show updated stats
        DataServices.combatantManager.renderAll();

        ToastSystem.show('Combat reset - all combatants restored to default stats', 'success', 3000);
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
        StateManager.state.combat.encounterFileName = null;

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
     *
     * Displays combat information including:
     * - Encounter file info icon with filename tooltip
     * - Current round number
     * - Active combatant info (name, HP, conditions)
     * - XP tracker with filter options
     */
    static updateCombatHeader() {
        const headerElement = document.getElementById('initiative-header-display');
        if (!headerElement) return;

        const allCombatants = DataServices.combatantManager.getAllCombatants();
        const activeCombatant = allCombatants.find(c => c.status.isActive);
        const round = StateManager.state.combat.round;
        // Get encounter filename from state (shows 'none' if not saved/loaded)
        const fileName = StateManager.state.combat.encounterFileName || 'none';

        // Calculate XP total (works regardless of active combatant)
        const xpDisplay = this.calculateXPDisplay();

        if (!activeCombatant || allCombatants.length === 0) {
            const xpText = xpDisplay.hasLairXP
                ? `${xpDisplay.regularTotal.toLocaleString()} XP (${xpDisplay.lairTotal.toLocaleString()} w/ Lair)`
                : `${xpDisplay.regularTotal.toLocaleString()} XP`;

            headerElement.innerHTML = `
                <span class="encounter-file-info">
                    ⓘ
                    <span class="encounter-file-tooltip">from file: ${fileName}</span>
                </span>
                <span class="combat-round">Round ${round}</span>
                <span class="combat-status">No active combatant</span>
                <div class="xp-tracker" data-action="toggle-xp-filter">
                    <span class="xp-value">${xpText}</span>
                    <span class="xp-filter-indicator">▼</span>
                    <div class="xp-filter-dropdown" style="display: none;">
                        <div class="xp-filter-option ${xpDisplay.filter === 'enemies-npcs' ? 'selected' : ''}" data-filter="enemies-npcs">
                            <span>Enemies & NPCs</span>
                        </div>
                        <div class="xp-filter-option ${xpDisplay.filter === 'enemies' ? 'selected' : ''}" data-filter="enemies">
                            <span>Enemies Only</span>
                        </div>
                        <div class="xp-filter-option ${xpDisplay.filter === 'npcs' ? 'selected' : ''}" data-filter="npcs">
                            <span>NPCs Only</span>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        // Build conditions/effects list and status icons
        const statusList = this.buildConditionsEffectsList(activeCombatant);
        const statusIcons = this.buildStatusIcons(activeCombatant);

        const xpText = xpDisplay.hasLairXP
            ? `${xpDisplay.regularTotal.toLocaleString()} XP (${xpDisplay.lairTotal.toLocaleString()} w/ Lair)`
            : `${xpDisplay.regularTotal.toLocaleString()} XP`;

        // HP text style - red if at 0
        const hpStyle = activeCombatant.currentHP === 0 ? 'color: var(--color-danger);' : '';

        headerElement.innerHTML = `
            <span class="encounter-file-info">
                ⓘ
                <span class="encounter-file-tooltip">from file: ${fileName}</span>
            </span>
            <span class="combat-round">Round ${round}</span>
            <span class="status-separator">|</span>
            <span class="current-turn-name clickable-name" data-combatant-id="${activeCombatant.id}">${activeCombatant.name}</span>
            <span class="current-turn-hp" style="${hpStyle}">${activeCombatant.currentHP}/${activeCombatant.maxHP} HP</span>
            ${statusIcons.length > 0 ? `<span class="status-icons">${statusIcons.join(' ')}</span>` : ''}
            ${statusList ? `<span class="conditions-list">${statusList}</span>` : ''}
            <div class="xp-tracker" data-action="toggle-xp-filter">
                <span class="xp-value">${xpText}</span>
                <span class="xp-filter-indicator">▼</span>
                <div class="xp-filter-dropdown" style="display: none;">
                    <div class="xp-filter-option ${xpDisplay.filter === 'enemies-npcs' ? 'selected' : ''}" data-filter="enemies-npcs">
                        <span>Enemies & NPCs</span>
                    </div>
                    <div class="xp-filter-option ${xpDisplay.filter === 'enemies' ? 'selected' : ''}" data-filter="enemies">
                        <span>Enemies Only</span>
                    </div>
                    <div class="xp-filter-option ${xpDisplay.filter === 'npcs' ? 'selected' : ''}" data-filter="npcs">
                        <span>NPCs Only</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Build conditions and effects list for display
     * @param {Object} combatant - The combatant to build list for
     * @returns {string} Formatted conditions/effects string
     */
    static buildConditionsEffectsList(combatant) {
        const conditionsList = combatant.conditions.map(c => {
            const duration = c.duration === 'infinite' ? '∞' : c.duration;
            return `${c.name} (${duration})`;
        }).join(', ');

        const effectsList = combatant.effects.map(e => {
            const duration = e.duration === 'infinite' ? '∞' : e.duration;
            return `${e.name} (${duration})`;
        }).join(', ');

        // Add timer for placeholders
        let timerText = '';
        if (combatant.isPlaceholder && combatant.timer) {
            const duration = combatant.timer.duration === 'infinite' ? '∞' : combatant.timer.duration;
            const note = combatant.timer.note ? ` - ${combatant.timer.note}` : '';
            timerText = `<span class="timer-display">Timer (${duration}${note})</span>`;
        }

        return [conditionsList, effectsList, timerText].filter(s => s).join(', ');
    }

    /**
     * Build status icons array for combat header
     * @param {Object} combatant - The combatant to build icons for
     * @returns {Array<string>} Array of status icon emojis
     */
    static buildStatusIcons(combatant) {
        const icons = [];

        // Dead icon (skull) if HP = 0
        if (combatant.currentHP === 0) {
            icons.push('💀');
        }

        // Bloodied icon if bloodied (HP > 0 and HP <= maxHP / 2)
        if (combatant.currentHP > 0 && combatant.currentHP <= combatant.maxHP / 2) {
            icons.push('🩸');
        }

        // Surprised icon
        if (combatant.status.surprised) {
            icons.push('😲');
        }

        // Holding icon
        if (combatant.status.holdAction) {
            icons.push('✊');
        }

        // Cover icon (only show if not 'none')
        if (combatant.status.cover && combatant.status.cover !== 'none') {
            const coverIcon = this.COVER_ICONS[combatant.status.cover];
            if (coverIcon) {
                icons.push(coverIcon);
            }
        }

        // Concentrating icon
        if (combatant.status.concentration) {
            icons.push('🧠');
        }

        // Hiding icon
        if (combatant.status.hiding) {
            icons.push('👤');
        }

        // Flying icon
        if (combatant.status.flying) {
            icons.push('🪽');
        }

        return icons;
    }

    /**
     * Cover level to icon mapping
     */
    static COVER_ICONS = {
        'half': '◐',
        'three-quarters': '◕',
        'full': '●'
    };

    /**
     * CR to XP mapping based on D&D 5e rules
     */
    static CR_TO_XP = {
        '0': 0,
        '1/8': 25,
        '0.125': 25,
        '1/4': 50,
        '0.25': 50,
        '1/2': 100,
        '0.5': 100,
        '1': 200,
        '2': 450,
        '3': 700,
        '4': 1100,
        '5': 1800,
        '6': 2300,
        '7': 2900,
        '8': 3900,
        '9': 5000,
        '10': 5900,
        '11': 7200,
        '12': 8400,
        '13': 10000,
        '14': 11500,
        '15': 13000,
        '16': 15000,
        '17': 18000,
        '18': 20000,
        '19': 22000,
        '20': 25000,
        '21': 33000,
        '22': 41000,
        '23': 50000,
        '24': 62000,
        '25': 75000,
        '26': 90000,
        '27': 105000,
        '28': 120000,
        '29': 135000,
        '30': 155000
    };

    /**
     * Calculate XP display based on current filter
     * @returns {Object} { regularTotal: number, lairTotal: number, hasLairXP: boolean, filter: string }
     */
    static calculateXPDisplay() {
        // Get filter from localStorage (default to 'enemies-npcs')
        const filter = localStorage.getItem('xp-filter') || 'enemies-npcs';

        // Get all combatants
        const allCombatants = DataServices.combatantManager?.getAllCombatants() || [];
        const creatureDatabase = DataServices.combatantManager?.creatureDatabase || [];

        // Filter combatants based on type
        let filteredCombatants = allCombatants;
        if (filter === 'enemies') {
            filteredCombatants = allCombatants.filter(c => c.type === 'enemy');
        } else if (filter === 'npcs') {
            filteredCombatants = allCombatants.filter(c => c.type === 'npc');
        } else {
            // enemies-npcs
            filteredCombatants = allCombatants.filter(c => c.type === 'enemy' || c.type === 'npc');
        }

        // Calculate both regular and lair XP totals
        let regularTotal = 0;
        let lairTotal = 0;
        let hasLairXP = false;

        filteredCombatants.forEach(combatant => {
            // Find the creature in the database to get XP values
            const creature = creatureDatabase.find(c => c.id === combatant.creatureId);

            if (!creature) {
                return;
            }

            // Check if creature has direct XP values in statBlock
            if (creature.statBlock?.challengeRating?.xp) {
                regularTotal += creature.statBlock.challengeRating.xp;

                // Add lair XP if available (lair XP only, not regular + lair)
                if (creature.statBlock.challengeRating.xpInLair) {
                    lairTotal += creature.statBlock.challengeRating.xpInLair;
                    hasLairXP = true;
                }
            } else {
                // Fall back to CR-to-XP conversion
                const cr = creature.cr || '0';
                const xpValue = this.CR_TO_XP[String(cr)] || 0;
                regularTotal += xpValue;
            }
        });

        return { regularTotal, lairTotal, hasLairXP, filter };
    }

    /**
     * Process turn-based effects (called when a combatant's turn starts)
     * @param {Object} combatant - The combatant whose turn is starting
     */
    static processTurnEffects(combatant) {
        let hasChanges = false;

        // Process conditions that decrement on turn start
        combatant.conditions = combatant.conditions.filter(condition => {
            // Only decrement conditions that expire at start of turn (or legacy conditions without expiresAt)
            const expiresAtStart = !condition.expiresAt || condition.expiresAt === 'start';

            if (expiresAtStart && condition.duration !== 'infinite' && condition.duration > 0) {
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
            // Only decrement effects that expire at start of turn (or legacy effects without expiresAt)
            const expiresAtStart = !effect.expiresAt || effect.expiresAt === 'start';

            if (expiresAtStart && effect.duration !== 'infinite' && effect.duration > 0) {
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

        // Process timer for placeholders (decrement on turn start)
        if (combatant.isPlaceholder && combatant.timer) {
            if (combatant.timer.duration !== 'infinite' && combatant.timer.duration > 0) {
                combatant.timer.duration--;
                hasChanges = true;

                // Remove timer if duration reaches 0
                if (combatant.timer.duration === 0) {
                    ToastSystem.show(`Timer ended on ${combatant.name}`, 'info', 2000);
                    combatant.timer = null;
                }
            }
        }

        // Update combatant if there were changes
        if (hasChanges) {
            DataServices.combatantManager.updateCombatant(combatant.id, 'conditions', combatant.conditions);
            DataServices.combatantManager.updateCombatant(combatant.id, 'effects', combatant.effects);
            if (combatant.isPlaceholder) {
                DataServices.combatantManager.updateCombatant(combatant.id, 'timer', combatant.timer);
            }
        }
    }

    /**
     * Process end-of-turn effects (called when a combatant's turn ends)
     * @param {Object} combatant - The combatant whose turn is ending
     */
    static processEndOfTurnEffects(combatant) {
        let hasChanges = false;

        // Process conditions that decrement at end of turn
        combatant.conditions = combatant.conditions.filter(condition => {
            // Only process conditions that expire at end of turn
            const expiresAtEnd = condition.expiresAt === 'end';

            if (expiresAtEnd) {
                // Check if this condition should skip decrement this time
                if (condition.skipNextEndDecrement) {
                    // Remove the flag and skip decrement
                    delete condition.skipNextEndDecrement;
                    hasChanges = true;
                    return true;
                }

                if (condition.duration !== 'infinite' && condition.duration > 0) {
                    condition.duration--;
                    hasChanges = true;

                    // Remove if duration reaches 0
                    if (condition.duration === 0) {
                        ToastSystem.show(`${condition.name} ended on ${combatant.name}`, 'info', 2000);
                        return false;
                    }
                }
            }
            return true;
        });

        // Process effects that decrement at end of turn
        combatant.effects = combatant.effects.filter(effect => {
            // Only process effects that expire at end of turn
            const expiresAtEnd = effect.expiresAt === 'end';

            if (expiresAtEnd) {
                // Check if this effect should skip decrement this time
                if (effect.skipNextEndDecrement) {
                    // Remove the flag and skip decrement
                    delete effect.skipNextEndDecrement;
                    hasChanges = true;
                    return true;
                }

                if (effect.duration !== 'infinite' && effect.duration > 0) {
                    effect.duration--;
                    hasChanges = true;

                    // Remove if duration reaches 0
                    if (effect.duration === 0) {
                        ToastSystem.show(`${effect.name} ended on ${combatant.name}`, 'info', 2000);
                        return false;
                    }
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

            // Process ongoing damage/healing effects
            combatant.effects.forEach(effect => {
                if (effect.duration === 'infinite') return;

                const effectName = effect.name.toLowerCase();

                // Check for ongoing damage keywords
                const damageKeywords = ['poison', 'burning', 'bleeding', 'acid', 'ongoing damage'];
                const healingKeywords = ['regeneration', 'healing', 'ongoing healing'];

                const isOngoingDamage = damageKeywords.some(keyword => effectName.includes(keyword));
                const isOngoingHealing = healingKeywords.some(keyword => effectName.includes(keyword));

                if (isOngoingDamage || isOngoingHealing) {
                    // Extract damage/healing amount from effect name (e.g., "Poison (5 damage)")
                    const amountMatch = effect.name.match(/\((\d+)\s*(damage|healing|hp)\)/i);
                    const amount = amountMatch ? parseInt(amountMatch[1]) : 0;

                    if (amount > 0) {
                        if (isOngoingDamage) {
                            // Apply ongoing damage
                            combatant.currentHP = Math.max(0, combatant.currentHP - amount);
                            ToastSystem.show(`${combatant.name} takes ${amount} ${effectName} damage`, 'warning', 2000);
                            hasChanges = true;
                        } else if (isOngoingHealing) {
                            // Apply ongoing healing
                            const healAmount = Math.min(amount, combatant.maxHP - combatant.currentHP);
                            combatant.currentHP = Math.min(combatant.maxHP, combatant.currentHP + healAmount);
                            if (healAmount > 0) {
                                ToastSystem.show(`${combatant.name} heals ${healAmount} HP from ${effect.name}`, 'success', 2000);
                                hasChanges = true;
                            }
                        }
                    } else {
                        // Just log the effect without amount
                        console.log(`Processing ongoing effect: ${effect.name} on ${combatant.name} (no amount specified)`);
                    }
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

        // Get all combatants in their current display order (same logic as CombatantManager.renderAll)
        const allCombatants = DataServices.combatantManager.getAllCombatants();
        const sortedCombatants = allCombatants.sort((a, b) => {
            // Use the same sorting logic as CombatantManager.renderAll
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

        // Remember if this combatant was the active combatant
        const wasActiveCombatant = combatant.status.isActive;
        const targetCombatant = sortedCombatants[targetIndex];

        // Assign manual order values to all combatants to preserve current order
        // then swap the two positions
        const newManualOrders = new Map();
        sortedCombatants.forEach((c, index) => {
            newManualOrders.set(c.id, index);
        });

        // Swap the manual order positions
        const currentManualOrder = newManualOrders.get(combatantId);
        const targetManualOrder = newManualOrders.get(targetCombatant.id);
        newManualOrders.set(combatantId, targetManualOrder);
        newManualOrders.set(targetCombatant.id, currentManualOrder);

        // Apply the new manual orders
        for (const [id, manualOrder] of newManualOrders) {
            DataServices.combatantManager.updateCombatant(id, 'manualOrder', manualOrder);
        }

        // Force a re-render to show the new order
        DataServices.combatantManager.renderAll();

        ToastSystem.show(`Moved ${combatant.name} ${direction} in initiative order`, 'success', 2000);

        console.log(`✅ Moved ${combatant.name} ${direction} in combat order${wasActiveCombatant ? ' (active turn preserved)' : ''}`);
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

        // Sort using the same logic as CombatantManager.renderAll()
        // This ensures turn order matches visual order
        const sortedCombatants = allCombatants.sort((a, b) => {
            // If both have manual order, sort by that
            if (a.manualOrder !== null && b.manualOrder !== null) {
                return a.manualOrder - b.manualOrder;
            }

            // If only one has manual order, it comes first
            if (a.manualOrder !== null) return -1;
            if (b.manualOrder !== null) return 1;

            // Otherwise sort by initiative (higher first)
            if (b.initiative !== a.initiative) {
                return b.initiative - a.initiative;
            }

            // If initiative is tied, sort alphabetically by name
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