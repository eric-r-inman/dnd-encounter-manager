/**
 * CalculationService - HP, initiative, and mathematical calculations
 *
 * Provides calculation utilities including:
 * - HP damage and healing calculations
 * - Initiative ordering and ties
 * - Statistical calculations
 * - D&D 5e specific formulas
 * - Resistance and immunity calculations
 * - Advantage/disadvantage mechanics
 *
 * @version 1.0.0
 */

export class CalculationService {
    /**
     * Calculate damage application with temp HP priority
     * @param {Object} combatant - Combatant receiving damage
     * @param {number} damage - Damage amount
     * @param {Object} options - Additional options
     * @returns {Object} Damage calculation result
     */
    static calculateDamage(combatant, damage, options = {}) {
        const {
            damageType = 'untyped',
            ignoreResistance = false,
            ignoreImmunity = false
        } = options;

        let effectiveDamage = damage;

        // Apply resistances and immunities according to D&D 5e rules
        // Resistance halves damage, immunity negates it completely
        if (!ignoreResistance && !ignoreImmunity) {
            effectiveDamage = this.applyDamageResistances(effectiveDamage, damageType, combatant);
        }

        // WHY: D&D 5e Rule - Temporary HP is always lost BEFORE regular HP
        // Think of temp HP like a shield or buffer that absorbs damage first.
        // Temp HP doesn't stack (can only have one source at a time) and doesn't
        // contribute to healing - it's purely a damage absorber.
        let newTempHP = combatant.tempHP;
        let newCurrentHP = combatant.currentHP;
        let damageToTempHP = 0;
        let damageToCurrentHP = 0;

        // WHY: First, apply damage to temporary HP (if any exists)
        // Example: Creature has 10 temp HP, takes 15 damage → temp HP absorbs 10,
        // leaving 5 damage to apply to regular HP
        if (newTempHP > 0) {
            damageToTempHP = Math.min(effectiveDamage, newTempHP);
            newTempHP -= damageToTempHP;
            effectiveDamage -= damageToTempHP; // Reduce remaining damage
        }

        // WHY: Then apply any remaining damage to current HP
        // HP can't go below 0 in this system (death happens at 0 HP)
        if (effectiveDamage > 0) {
            damageToCurrentHP = Math.min(effectiveDamage, newCurrentHP);
            newCurrentHP -= damageToCurrentHP;
        }

        return {
            originalDamage: damage,
            effectiveDamage: damageToTempHP + damageToCurrentHP,
            damageToTempHP,
            damageToCurrentHP,
            newCurrentHP: Math.max(0, newCurrentHP),
            newTempHP: Math.max(0, newTempHP),
            wasReduced: damage !== (damageToTempHP + damageToCurrentHP),
            overkill: Math.max(0, damage - combatant.currentHP - combatant.tempHP)
        };
    }

    /**
     * Calculate healing application with max HP cap
     * @param {Object} combatant - Combatant receiving healing
     * @param {number} healing - Healing amount
     * @param {Object} options - Additional options
     * @returns {Object} Healing calculation result
     */
    static calculateHealing(combatant, healing, options = {}) {
        const {
            allowOverheal = false,
            healingType = 'magical'
        } = options;

        // D&D 5e Rule: Healing cannot exceed maximum HP unless specifically allowed
        // This prevents accidental HP inflation from healing spells/potions
        const maxPossibleHP = allowOverheal ? healing : combatant.maxHP;
        const newCurrentHP = Math.min(maxPossibleHP, combatant.currentHP + healing);
        const actualHealing = newCurrentHP - combatant.currentHP;
        const overheal = healing - actualHealing; // Track "wasted" healing for feedback

        return {
            originalHealing: healing,
            actualHealing,
            newCurrentHP,
            overheal,
            wasReduced: overheal > 0,
            healthPercentage: (newCurrentHP / combatant.maxHP) * 100
        };
    }

    /**
     * Calculate temporary HP application (doesn't stack)
     * @param {Object} combatant - Combatant receiving temp HP
     * @param {number} tempHP - Temporary HP amount
     * @returns {Object} Temp HP calculation result
     */
    static calculateTempHP(combatant, tempHP) {
        // D&D 5e Rule: Temporary HP does NOT stack
        // When gaining new temp HP, you choose which to keep (usually the higher amount)
        // This implementation always keeps the higher value
        const newTempHP = Math.max(combatant.tempHP, tempHP);
        const actualGain = newTempHP - combatant.tempHP;

        return {
            originalTempHP: tempHP,
            newTempHP,
            actualGain,
            wasReplaced: combatant.tempHP > 0 && tempHP > combatant.tempHP,  // Had temp HP and new is better
            wasIgnored: tempHP <= combatant.tempHP  // New temp HP is worse, keep current
        };
    }

    /**
     * Apply damage resistances and immunities
     * @param {number} damage - Original damage amount
     * @param {string} damageType - Type of damage
     * @param {Object} combatant - Combatant data
     * @returns {number} Modified damage amount
     */
    static applyDamageResistances(damage, damageType, combatant) {
        // Quick exit if creature has no special damage modifiers
        if (!combatant.resistances && !combatant.immunities && !combatant.vulnerabilities) {
            return damage;
        }

        // D&D 5e damage modification priority:
        // 1. Immunity (damage = 0) - checked first
        // 2. Resistance (damage / 2, rounded down)
        // 3. Vulnerability (damage × 2)

        // Immunity completely negates damage of that type
        if (combatant.immunities && combatant.immunities.includes(damageType)) {
            return 0;
        }

        // Resistance halves damage (round down per D&D 5e rules)
        // Example: 7 fire damage with fire resistance = 3 damage
        if (combatant.resistances && combatant.resistances.includes(damageType)) {
            return Math.floor(damage / 2);
        }

        // Vulnerability doubles damage (relatively rare in 5e)
        // Example: 5 cold damage to creature vulnerable to cold = 10 damage
        if (combatant.vulnerabilities && combatant.vulnerabilities.includes(damageType)) {
            return damage * 2;
        }

        // No modifications apply
        return damage;
    }

    /**
     * Calculate initiative order with tie-breaking
     * @param {Array} combatants - Array of combatants
     * @param {Object} options - Tie-breaking options
     * @returns {Array} Sorted combatants by initiative
     */
    static calculateInitiativeOrder(combatants, options = {}) {
        const {
            tieBreaker = 'alphabetical', // alphabetical, dexterity, random
            playerAdvantage = false // Players win ties
        } = options;

        // Create new array to avoid mutating original
        return [...combatants].sort((a, b) => {
            // Primary sort: initiative rolls (highest first)
            // In D&D 5e, higher initiative goes first
            if (b.initiative !== a.initiative) {
                return b.initiative - a.initiative;
            }

            // Initiative tie - apply tiebreaker rules
            // Optional house rule: players automatically win ties
            if (playerAdvantage) {
                if (a.type === 'player' && b.type !== 'player') return -1;  // Player goes first
                if (b.type === 'player' && a.type !== 'player') return 1;   // Player goes first
            }

            // Apply selected tiebreaker method
            switch (tieBreaker) {
                case 'dexterity':
                    // D&D 5e official tiebreaker: higher DEX wins
                    // Check both full score and modifier for flexibility
                    const aDex = a.dexterity || a.dexterityModifier || 0;
                    const bDex = b.dexterity || b.dexterityModifier || 0;
                    if (bDex !== aDex) return bDex - aDex;
                    break;

                case 'random':
                    // House rule: random resolution (like rolling d20)
                    // Math.random() - 0.5 gives random negative/positive
                    return Math.random() - 0.5;

                case 'alphabetical':
                default:
                    // Default: alphabetical by name (predictable, fair)
                    // Uses localeCompare for proper string sorting
                    return a.name.localeCompare(b.name);
            }

            // Final fallback if all else is equal
            return a.name.localeCompare(b.name);
        });
    }

    /**
     * Calculate health state category
     * @param {Object} combatant - Combatant data
     * @returns {Object} Health state information
     */
    static calculateHealthState(combatant) {
        const currentHP = combatant.currentHP;
        const maxHP = combatant.maxHP;
        const tempHP = combatant.tempHP;

        // Effective HP includes temp HP for display purposes
        // But health state is based on actual HP only (per D&D 5e)
        const effectiveHP = currentHP + tempHP;
        const healthPercentage = maxHP > 0 ? (currentHP / maxHP) * 100 : 0;

        let state, description, severity;

        // D&D 5e states: 0 HP = unconscious (death saves begin)
        if (currentHP <= 0) {
            state = 'unconscious';
            description = 'Unconscious';
            severity = 'critical';
        }
        // Critically wounded: <= 25% HP (near death)
        else if (healthPercentage <= 25) {
            state = 'critical';
            description = 'Critically wounded';
            severity = 'high';
        }
        // Bloodied: <= 50% HP (D&D 4e concept, popular house rule)
        // Visual indicator to players that enemy is weakened
        else if (healthPercentage <= 50) {
            state = 'bloodied';
            description = 'Bloodied';
            severity = 'medium';
        }
        // Wounded: <= 75% HP (noticeable damage)
        else if (healthPercentage <= 75) {
            state = 'wounded';
            description = 'Wounded';
            severity = 'low';
        }
        // Healthy: > 75% HP
        else {
            state = 'healthy';
            description = 'Healthy';
            severity = 'none';
        }

        return {
            state,
            description,
            severity,
            healthPercentage: Math.round(healthPercentage),
            effectiveHP,
            hasTemporaryHP: tempHP > 0
        };
    }

    /**
     * Calculate encounter difficulty (rough estimation)
     * @param {Array} combatants - All combatants
     * @returns {Object} Encounter difficulty assessment
     */
    static calculateEncounterDifficulty(combatants) {
        const players = combatants.filter(c => c.type === 'player');
        const enemies = combatants.filter(c => c.type === 'enemy');

        // Can't calculate difficulty without players
        if (players.length === 0) {
            return { difficulty: 'unknown', reason: 'No players in encounter' };
        }

        // Calculate total HP pools for each side
        // Higher total HP generally means stronger side
        const playerHP = players.reduce((sum, p) => sum + p.maxHP, 0);
        const enemyHP = enemies.reduce((sum, e) => sum + e.maxHP, 0);
        const playerCount = players.length;
        const enemyCount = enemies.length;

        // Calculate ratios for difficulty assessment
        // HP Ratio: enemy HP / player HP (higher = harder encounter)
        // Number Ratio: enemies / players (higher = action economy disadvantage)
        const hpRatio = enemyHP / playerHP;
        const numberRatio = enemyCount / playerCount;

        let difficulty, color, description;

        // NOTE: This is a ROUGH estimate, not CR-accurate
        // True D&D 5e difficulty requires CR calculations (see DMG p. 82)
        // This gives a quick visual indicator based on HP and numbers

        // Trivial: Enemy HP < 50% of player HP AND outnumbered
        if (hpRatio < 0.5 && numberRatio < 1) {
            difficulty = 'trivial';
            color = '#28a745';  // Green
            description = 'Very easy encounter';
        }
        // Easy: Enemy HP roughly equal, slightly outnumbered
        else if (hpRatio < 1 && numberRatio < 1.5) {
            difficulty = 'easy';
            color = '#17a2b8';  // Light blue
            description = 'Easy encounter';
        }
        // Medium: Balanced HP, balanced numbers
        else if (hpRatio < 1.5 && numberRatio < 2) {
            difficulty = 'medium';
            color = '#ffc107';  // Yellow/orange
            description = 'Balanced encounter';
        }
        // Hard: Enemy HP 1.5-2.5x player HP
        else if (hpRatio < 2.5 && numberRatio < 3) {
            difficulty = 'hard';
            color = '#fd7e14';  // Orange
            description = 'Challenging encounter';
        }
        // Deadly: Overwhelming enemy forces
        else {
            difficulty = 'deadly';
            color = '#dc3545';  // Red
            description = 'Very dangerous encounter';
        }

        return {
            difficulty,
            color,
            description,
            playerCount,
            enemyCount,
            playerHP,
            enemyHP,
            hpRatio: Math.round(hpRatio * 100) / 100,
            numberRatio: Math.round(numberRatio * 100) / 100
        };
    }

    /**
     * Calculate combat statistics
     * @param {Array} combatants - All combatants
     * @param {Object} combatState - Current combat state
     * @returns {Object} Combat statistics
     */
    static calculateCombatStatistics(combatants, combatState) {
        const totalHP = combatants.reduce((sum, c) => sum + c.currentHP, 0);
        const totalMaxHP = combatants.reduce((sum, c) => sum + c.maxHP, 0);
        const totalTempHP = combatants.reduce((sum, c) => sum + c.tempHP, 0);

        const healthStates = combatants.reduce((acc, c) => {
            const state = this.calculateHealthState(c);
            acc[state.state] = (acc[state.state] || 0) + 1;
            return acc;
        }, {});

        const averageInitiative = combatants.length > 0
            ? combatants.reduce((sum, c) => sum + c.initiative, 0) / combatants.length
            : 0;

        return {
            totalCombatants: combatants.length,
            currentHP: totalHP,
            maxHP: totalMaxHP,
            tempHP: totalTempHP,
            effectiveHP: totalHP + totalTempHP,
            healthPercentage: totalMaxHP > 0 ? (totalHP / totalMaxHP) * 100 : 0,
            averageInitiative: Math.round(averageInitiative * 10) / 10,
            healthStates,
            round: combatState?.round || 0,
            totalTurns: combatState?.round ? (combatState.round - 1) * combatants.length + (combatState.currentTurnIndex || 0) + 1 : 0
        };
    }

    /**
     * Calculate die roll with advantage/disadvantage
     * @param {number} sides - Number of sides on die
     * @param {string} type - 'normal', 'advantage', 'disadvantage'
     * @param {number} modifier - Modifier to add
     * @returns {Object} Roll result
     */
    static rollDie(sides = 20, type = 'normal', modifier = 0) {
        const roll1 = Math.floor(Math.random() * sides) + 1;
        let roll2, finalRoll;

        switch (type) {
            case 'advantage':
                roll2 = Math.floor(Math.random() * sides) + 1;
                finalRoll = Math.max(roll1, roll2);
                break;
            case 'disadvantage':
                roll2 = Math.floor(Math.random() * sides) + 1;
                finalRoll = Math.min(roll1, roll2);
                break;
            default:
                finalRoll = roll1;
                break;
        }

        const total = finalRoll + modifier;

        return {
            roll1,
            roll2: type !== 'normal' ? roll2 : null,
            finalRoll,
            modifier,
            total,
            type,
            sides,
            isCritical: finalRoll === sides,
            isCriticalFail: finalRoll === 1
        };
    }

    /**
     * Calculate ability modifier from ability score
     * @param {number} abilityScore - Ability score (1-30)
     * @returns {number} Ability modifier
     */
    static calculateAbilityModifier(abilityScore) {
        return Math.floor((abilityScore - 10) / 2);
    }

    /**
     * Calculate proficiency bonus by character level
     * @param {number} level - Character level (1-20)
     * @returns {number} Proficiency bonus
     */
    static calculateProficiencyBonus(level) {
        return Math.ceil(level / 4) + 1;
    }

    /**
     * Calculate spell save DC
     * @param {number} level - Caster level
     * @param {number} abilityModifier - Spellcasting ability modifier
     * @returns {number} Spell save DC
     */
    static calculateSpellSaveDC(level, abilityModifier) {
        const proficiencyBonus = this.calculateProficiencyBonus(level);
        return 8 + proficiencyBonus + abilityModifier;
    }

    /**
     * Calculate average damage from dice notation
     * @param {string} diceNotation - Dice notation (e.g., "2d6+3")
     * @returns {Object} Damage calculation
     */
    static calculateAverageDamage(diceNotation) {
        const diceRegex = /(\d+)d(\d+)([+-]\d+)?/g;
        let totalAverage = 0;
        let minDamage = 0;
        let maxDamage = 0;
        const components = [];

        let match;
        while ((match = diceRegex.exec(diceNotation)) !== null) {
            const count = parseInt(match[1]);
            const sides = parseInt(match[2]);
            const modifier = match[3] ? parseInt(match[3]) : 0;

            const average = count * ((sides + 1) / 2) + modifier;
            const min = count + modifier;
            const max = count * sides + modifier;

            totalAverage += average;
            minDamage += min;
            maxDamage += max;

            components.push({
                dice: `${count}d${sides}`,
                modifier,
                average,
                min,
                max
            });
        }

        return {
            notation: diceNotation,
            average: Math.round(totalAverage * 10) / 10,
            min: minDamage,
            max: maxDamage,
            components
        };
    }

    /**
     * Utility: Round to specified decimal places
     * @param {number} number - Number to round
     * @param {number} decimals - Number of decimal places
     * @returns {number} Rounded number
     */
    static round(number, decimals = 0) {
        const factor = Math.pow(10, decimals);
        return Math.round(number * factor) / factor;
    }

    /**
     * Utility: Clamp number between min and max
     * @param {number} number - Number to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped number
     */
    static clamp(number, min, max) {
        return Math.min(Math.max(number, min), max);
    }

    /**
     * Utility: Calculate percentage
     * @param {number} value - Current value
     * @param {number} total - Total value
     * @returns {number} Percentage (0-100)
     */
    static percentage(value, total) {
        if (total === 0) return 0;
        return this.round((value / total) * 100, 1);
    }
}