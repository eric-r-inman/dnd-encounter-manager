/**
 * Initiative Utilities
 *
 * Shared utilities for initiative calculation and management
 *
 * @module utils/initiative-utils
 * @version 1.0.0
 */

/**
 * Get initiative modifier for a combatant
 * Prefers statBlock.initiative.modifier, falls back to DEX modifier
 *
 * @param {Object} combatant - The combatant
 * @param {Array} creatureDatabase - The creature database
 * @returns {number} Initiative modifier
 */
export function getInitiativeModifier(combatant, creatureDatabase) {
    const creature = creatureDatabase.find(c => c.id === combatant.creatureId);

    // Use statBlock.initiative.modifier if available (includes DEX + any bonuses)
    if (creature?.statBlock?.initiative?.modifier !== undefined) {
        return creature.statBlock.initiative.modifier;
    }

    // Otherwise fall back to DEX modifier
    if (creature?.statBlock?.abilities?.dex?.modifier !== undefined) {
        return creature.statBlock.abilities.dex.modifier;
    }

    return 0;
}

/**
 * Get initiative modifier using a creature map (optimized for batch operations)
 *
 * @param {Object} combatant - The combatant
 * @param {Map<string, Object>} creatureMap - Map of creature ID to creature object
 * @returns {number} Initiative modifier
 */
export function getInitiativeModifierWithMap(combatant, creatureMap) {
    const creature = creatureMap.get(combatant.creatureId);

    // Use statBlock.initiative.modifier if available (includes DEX + any bonuses)
    if (creature?.statBlock?.initiative?.modifier !== undefined) {
        return creature.statBlock.initiative.modifier;
    }

    // Otherwise fall back to DEX modifier
    if (creature?.statBlock?.abilities?.dex?.modifier !== undefined) {
        return creature.statBlock.abilities.dex.modifier;
    }

    return 0;
}

/**
 * Create a creature lookup map for efficient batch operations
 *
 * @param {Array} creatureDatabase - The creature database
 * @returns {Map<string, Object>} Map of creature ID to creature object
 */
export function createCreatureMap(creatureDatabase) {
    return new Map(creatureDatabase.map(c => [c.id, c]));
}
