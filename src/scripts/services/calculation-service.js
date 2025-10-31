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

        // D&D 5e Rule: Temporary HP is lost first, then current HP
        // Temp HP acts as a buffer and doesn't stack with new temp HP
        let newTempHP = combatant.tempHP;
        let newCurrentHP = combatant.currentHP;
        let damageToTempHP = 0;
        let damageToCurrentHP = 0;

        // First, apply damage to temporary HP (if any exists)
        if (newTempHP > 0) {
            damageToTempHP = Math.min(effectiveDamage, newTempHP);
            newTempHP -= damageToTempHP;
            effectiveDamage -= damageToTempHP; // Reduce remaining damage
        }

        // Then apply any remaining damage to current HP
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
        const newTempHP = Math.max(combatant.tempHP, tempHP);
        const actualGain = newTempHP - combatant.tempHP;

        return {
            originalTempHP: tempHP,
            newTempHP,
            actualGain,
            wasReplaced: combatant.tempHP > 0 && tempHP > combatant.tempHP,
            wasIgnored: tempHP <= combatant.tempHP
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
        if (!combatant.resistances && !combatant.immunities && !combatant.vulnerabilities) {
            return damage;
        }

        // Check immunity first
        if (combatant.immunities && combatant.immunities.includes(damageType)) {
            return 0;
        }

        // Check resistance
        if (combatant.resistances && combatant.resistances.includes(damageType)) {
            return Math.floor(damage / 2);
        }

        // Check vulnerability
        if (combatant.vulnerabilities && combatant.vulnerabilities.includes(damageType)) {
            return damage * 2;
        }

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

        return [...combatants].sort((a, b) => {
            // Primary sort: initiative (descending)
            if (b.initiative !== a.initiative) {
                return b.initiative - a.initiative;
            }

            // Tie breaking
            if (playerAdvantage) {
                if (a.type === 'player' && b.type !== 'player') return -1;
                if (b.type === 'player' && a.type !== 'player') return 1;
            }

            switch (tieBreaker) {
                case 'dexterity':
                    const aDex = a.dexterity || a.dexterityModifier || 0;
                    const bDex = b.dexterity || b.dexterityModifier || 0;
                    if (bDex !== aDex) return bDex - aDex;
                    break;

                case 'random':
                    return Math.random() - 0.5;

                case 'alphabetical':
                default:
                    return a.name.localeCompare(b.name);
            }

            return a.name.localeCompare(b.name); // Fallback
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
        const effectiveHP = currentHP + tempHP;
        const healthPercentage = maxHP > 0 ? (currentHP / maxHP) * 100 : 0;

        let state, description, severity;

        if (currentHP <= 0) {
            state = 'unconscious';
            description = 'Unconscious';
            severity = 'critical';
        } else if (healthPercentage <= 25) {
            state = 'critical';
            description = 'Critically wounded';
            severity = 'high';
        } else if (healthPercentage <= 50) {
            state = 'bloodied';
            description = 'Bloodied';
            severity = 'medium';
        } else if (healthPercentage <= 75) {
            state = 'wounded';
            description = 'Wounded';
            severity = 'low';
        } else {
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

        if (players.length === 0) {
            return { difficulty: 'unknown', reason: 'No players in encounter' };
        }

        const playerHP = players.reduce((sum, p) => sum + p.maxHP, 0);
        const enemyHP = enemies.reduce((sum, e) => sum + e.maxHP, 0);
        const playerCount = players.length;
        const enemyCount = enemies.length;

        const hpRatio = enemyHP / playerHP;
        const numberRatio = enemyCount / playerCount;

        let difficulty, color, description;

        if (hpRatio < 0.5 && numberRatio < 1) {
            difficulty = 'trivial';
            color = '#28a745';
            description = 'Very easy encounter';
        } else if (hpRatio < 1 && numberRatio < 1.5) {
            difficulty = 'easy';
            color = '#17a2b8';
            description = 'Easy encounter';
        } else if (hpRatio < 1.5 && numberRatio < 2) {
            difficulty = 'medium';
            color = '#ffc107';
            description = 'Balanced encounter';
        } else if (hpRatio < 2.5 && numberRatio < 3) {
            difficulty = 'hard';
            color = '#fd7e14';
            description = 'Challenging encounter';
        } else {
            difficulty = 'deadly';
            color = '#dc3545';
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