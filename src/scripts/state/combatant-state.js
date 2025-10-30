/**
 * CombatantState - Individual combatant state management
 *
 * Handles individual combatant data including:
 * - Basic stats (HP, AC, initiative)
 * - Status effects and conditions
 * - Combat status (active, hold action, etc.)
 * - Effect duration processing
 * - State validation and updates
 *
 * @version 1.0.0
 */

export class CombatantState {
    /**
     * Create a new combatant with default values
     * @param {Object} data - Initial combatant data
     * @returns {Object} New combatant object
     */
    static createCombatant(data) {
        const defaults = {
            id: this.generateId(),
            name: 'Unnamed Combatant',
            type: 'enemy', // player, enemy, npc
            initiative: 10,
            ac: 10,
            maxHP: 1,
            currentHP: 1,
            tempHP: 0,
            isActive: false,
            holdAction: false,
            notes: '',
            nameNote: '',
            status: {
                concentration: false,
                concentrationSpell: '',
                hiding: false,
                cover: 'none', // none, half, three-quarters, full
                surprised: false
            },
            conditions: [],
            effects: [],
            hpHistory: []
        };

        return { ...defaults, ...data };
    }

    /**
     * Generate a unique ID for a combatant
     * @returns {string} Unique combatant ID
     */
    static generateId() {
        return `combatant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Update combatant property safely
     * @param {Object} combatant - Combatant object to update
     * @param {string} property - Property path (e.g., 'currentHP', 'status.concentration')
     * @param {*} value - New value
     * @returns {Object} Updated combatant object
     */
    static updateProperty(combatant, property, value) {
        const updated = { ...combatant };
        const propParts = property.split('.');
        let current = updated;

        // Navigate to parent of target property
        for (let i = 0; i < propParts.length - 1; i++) {
            const part = propParts[i];
            if (!(part in current)) {
                current[part] = {};
            } else {
                current[part] = { ...current[part] };
            }
            current = current[part];
        }

        // Set the value
        const finalKey = propParts[propParts.length - 1];
        current[finalKey] = value;

        return updated;
    }

    /**
     * Apply damage to combatant with proper temp HP handling
     * @param {Object} combatant - Combatant to damage
     * @param {number} damage - Amount of damage
     * @param {string} damageType - Type of damage (optional)
     * @returns {Object} Updated combatant with damage applied
     */
    static applyDamage(combatant, damage, damageType = 'untyped') {
        if (damage < 0) {
            throw new Error('Damage cannot be negative');
        }

        let updated = { ...combatant };
        let remainingDamage = damage;

        // Apply damage to temp HP first
        if (updated.tempHP > 0) {
            const tempDamage = Math.min(remainingDamage, updated.tempHP);
            updated.tempHP -= tempDamage;
            remainingDamage -= tempDamage;
        }

        // Apply remaining damage to current HP
        if (remainingDamage > 0) {
            updated.currentHP = Math.max(0, updated.currentHP - remainingDamage);
        }

        // Add to HP history
        updated.hpHistory = [...(updated.hpHistory || []), {
            type: 'damage',
            amount: damage,
            damageType,
            timestamp: Date.now(),
            resultingHP: updated.currentHP,
            resultingTempHP: updated.tempHP
        }];

        return updated;
    }

    /**
     * Apply healing to combatant
     * @param {Object} combatant - Combatant to heal
     * @param {number} healing - Amount of healing
     * @returns {Object} Updated combatant with healing applied
     */
    static applyHealing(combatant, healing) {
        if (healing < 0) {
            throw new Error('Healing cannot be negative');
        }

        let updated = { ...combatant };
        const oldHP = updated.currentHP;
        updated.currentHP = Math.min(updated.maxHP, updated.currentHP + healing);
        const actualHealing = updated.currentHP - oldHP;

        // Add to HP history
        updated.hpHistory = [...(updated.hpHistory || []), {
            type: 'healing',
            amount: actualHealing,
            timestamp: Date.now(),
            resultingHP: updated.currentHP,
            resultingTempHP: updated.tempHP
        }];

        return updated;
    }

    /**
     * Set temporary HP (doesn't stack)
     * @param {Object} combatant - Combatant to update
     * @param {number} tempHP - Amount of temporary HP
     * @returns {Object} Updated combatant with temp HP set
     */
    static setTempHP(combatant, tempHP) {
        if (tempHP < 0) {
            throw new Error('Temporary HP cannot be negative');
        }

        let updated = { ...combatant };
        const oldTempHP = updated.tempHP;

        // Temp HP doesn't stack - take the higher value
        updated.tempHP = Math.max(updated.tempHP, tempHP);

        // Add to HP history if temp HP changed
        if (updated.tempHP !== oldTempHP) {
            updated.hpHistory = [...(updated.hpHistory || []), {
                type: 'temp-hp',
                amount: updated.tempHP - oldTempHP,
                timestamp: Date.now(),
                resultingHP: updated.currentHP,
                resultingTempHP: updated.tempHP
            }];
        }

        return updated;
    }

    /**
     * Add condition to combatant
     * @param {Object} combatant - Combatant to update
     * @param {Object} condition - Condition object
     * @returns {Object} Updated combatant with condition added
     */
    static addCondition(combatant, condition) {
        const requiredFields = ['name'];
        const missingFields = requiredFields.filter(field => !(field in condition));
        if (missingFields.length > 0) {
            throw new Error(`Missing required condition fields: ${missingFields.join(', ')}`);
        }

        let updated = { ...combatant };
        updated.conditions = [...updated.conditions];

        const conditionData = {
            name: condition.name,
            duration: condition.duration || 1,
            note: condition.note || '',
            decrementOn: condition.decrementOn || 'turnStart'
        };

        // Check if condition already exists
        const existingIndex = updated.conditions.findIndex(c => c.name === condition.name);
        if (existingIndex !== -1) {
            // Update existing condition
            updated.conditions[existingIndex] = conditionData;
        } else {
            // Add new condition
            updated.conditions.push(conditionData);
        }

        return updated;
    }

    /**
     * Remove condition from combatant
     * @param {Object} combatant - Combatant to update
     * @param {string} conditionName - Name of condition to remove
     * @returns {Object} Updated combatant with condition removed
     */
    static removeCondition(combatant, conditionName) {
        let updated = { ...combatant };
        updated.conditions = updated.conditions.filter(c => c.name !== conditionName);
        return updated;
    }

    /**
     * Add effect to combatant
     * @param {Object} combatant - Combatant to update
     * @param {Object} effect - Effect object
     * @returns {Object} Updated combatant with effect added
     */
    static addEffect(combatant, effect) {
        const requiredFields = ['name'];
        const missingFields = requiredFields.filter(field => !(field in effect));
        if (missingFields.length > 0) {
            throw new Error(`Missing required effect fields: ${missingFields.join(', ')}`);
        }

        let updated = { ...combatant };
        updated.effects = [...updated.effects];

        const effectData = {
            name: effect.name,
            duration: effect.duration || 1,
            note: effect.note || '',
            decrementOn: effect.decrementOn || 'turnStart'
        };

        // Check if effect already exists
        const existingIndex = updated.effects.findIndex(e => e.name === effect.name);
        if (existingIndex !== -1) {
            // Update existing effect
            updated.effects[existingIndex] = effectData;
        } else {
            // Add new effect
            updated.effects.push(effectData);
        }

        return updated;
    }

    /**
     * Remove effect from combatant
     * @param {Object} combatant - Combatant to update
     * @param {string} effectName - Name of effect to remove
     * @returns {Object} Updated combatant with effect removed
     */
    static removeEffect(combatant, effectName) {
        let updated = { ...combatant };
        updated.effects = updated.effects.filter(e => e.name !== effectName);
        return updated;
    }

    /**
     * Process turn-based effects (decrement durations)
     * @param {Object} combatant - Combatant to process
     * @param {string} timing - 'turnStart' or 'turnEnd'
     * @returns {Object} Updated combatant with processed effects
     */
    static processTurnEffects(combatant, timing = 'turnStart') {
        let updated = { ...combatant };

        // Process conditions
        updated.conditions = updated.conditions.filter(condition => {
            if (condition.decrementOn === timing && condition.duration !== 'infinite') {
                condition.duration--;
                return condition.duration > 0;
            }
            return true;
        });

        // Process effects
        updated.effects = updated.effects.filter(effect => {
            if (effect.decrementOn === timing && effect.duration !== 'infinite') {
                effect.duration--;
                return effect.duration > 0;
            }
            return true;
        });

        return updated;
    }

    /**
     * Get health state of combatant
     * @param {Object} combatant - Combatant to check
     * @returns {string} Health state: healthy, bloodied, unconscious, dead
     */
    static getHealthState(combatant) {
        if (combatant.currentHP <= 0) {
            return combatant.maxHP > 0 ? 'unconscious' : 'dead';
        }

        const healthPercentage = combatant.currentHP / combatant.maxHP;
        if (healthPercentage <= 0.5) {
            return 'bloodied';
        }

        return 'healthy';
    }

    /**
     * Get effective HP (current + temp)
     * @param {Object} combatant - Combatant to check
     * @returns {number} Effective HP total
     */
    static getEffectiveHP(combatant) {
        return combatant.currentHP + combatant.tempHP;
    }

    /**
     * Validate combatant data integrity
     * @param {Object} combatant - Combatant to validate
     * @returns {Object} Validation result with isValid and errors
     */
    static validateCombatant(combatant) {
        const errors = [];

        if (!combatant) {
            errors.push('Combatant is null or undefined');
            return { isValid: false, errors };
        }

        const requiredFields = ['id', 'name', 'type', 'initiative', 'ac', 'maxHP', 'currentHP'];
        const missingFields = requiredFields.filter(field => !(field in combatant));
        if (missingFields.length > 0) {
            errors.push(`Missing required fields: ${missingFields.join(', ')}`);
        }

        if (typeof combatant.maxHP !== 'number' || combatant.maxHP < 1) {
            errors.push('Max HP must be a positive number');
        }

        if (typeof combatant.currentHP !== 'number' || combatant.currentHP < 0) {
            errors.push('Current HP cannot be negative');
        }

        if (combatant.currentHP > combatant.maxHP) {
            errors.push('Current HP cannot exceed max HP');
        }

        if (typeof combatant.tempHP !== 'number' || combatant.tempHP < 0) {
            errors.push('Temporary HP cannot be negative');
        }

        if (typeof combatant.initiative !== 'number') {
            errors.push('Initiative must be a number');
        }

        if (typeof combatant.ac !== 'number' || combatant.ac < 0) {
            errors.push('AC must be a non-negative number');
        }

        if (!['player', 'enemy', 'npc'].includes(combatant.type)) {
            errors.push('Type must be player, enemy, or npc');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Clone combatant (deep copy)
     * @param {Object} combatant - Combatant to clone
     * @returns {Object} Cloned combatant
     */
    static clone(combatant) {
        return JSON.parse(JSON.stringify(combatant));
    }

    /**
     * Compare two combatants for initiative order
     * @param {Object} a - First combatant
     * @param {Object} b - Second combatant
     * @returns {number} Comparison result for sorting
     */
    static compareInitiative(a, b) {
        if (b.initiative !== a.initiative) {
            return b.initiative - a.initiative;
        }
        return a.name.localeCompare(b.name);
    }
}