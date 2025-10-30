/**
 * CombatantService - CRUD operations for combatant management
 *
 * Handles all combatant-related data operations including:
 * - Creating and adding new combatants
 * - Reading and retrieving combatant data
 * - Updating combatant properties and status
 * - Deleting and removing combatants
 * - Batch operations on multiple combatants
 * - Data validation and integrity checks
 *
 * @version 1.0.0
 */

import { StateManager } from '../state-manager.js';
import { CombatantState } from '../state/combatant-state.js';
import { ToastSystem } from '../../components/toast/ToastSystem.js';

export class CombatantService {
    /**
     * Create a new combatant and add to encounter
     * @param {Object} combatantData - Initial combatant data
     * @returns {Promise<string>} New combatant ID
     * @throws {Error} If validation fails or creation fails
     */
    static async createCombatant(combatantData) {
        try {
            // Validate input data using CombatantState validation
            const validation = CombatantState.validateCombatant(combatantData);
            if (!validation.isValid) {
                throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
            }

            // Create combatant through state manager
            const combatantId = StateManager.addCombatant(combatantData);

            console.log(`✅ Created combatant: ${combatantData.name} (${combatantId})`);
            ToastSystem.show(`Added ${combatantData.name} to encounter`, 'success', 2000);

            return combatantId;
        } catch (error) {
            console.error('Failed to create combatant:', error);
            ToastSystem.show(`Failed to create combatant: ${error.message}`, 'error', 3000);
            throw error;
        }
    }

    /**
     * Get combatant by ID
     * @param {string} combatantId - Combatant ID
     * @returns {Object|null} Combatant data or null if not found
     */
    static getCombatant(combatantId) {
        if (!combatantId) {
            console.warn('getCombatant called with empty ID');
            return null;
        }

        return StateManager.getCombatant(combatantId);
    }

    /**
     * Get all combatants
     * @returns {Array} Array of all combatants
     */
    static getAllCombatants() {
        return StateManager.getStateSlice('combatants') || [];
    }

    /**
     * Get combatants by type
     * @param {string} type - Combatant type ('player', 'enemy', 'npc')
     * @returns {Array} Filtered combatants
     */
    static getCombatantsByType(type) {
        const allCombatants = this.getAllCombatants();
        return allCombatants.filter(combatant => combatant.type === type);
    }

    /**
     * Get active combatant
     * @returns {Object|null} Currently active combatant or null
     */
    static getActiveCombatant() {
        return StateManager.getActiveCombatant();
    }

    /**
     * Get combatants sorted by initiative
     * @returns {Array} Combatants sorted by initiative (descending)
     */
    static getCombatantsByInitiative() {
        const allCombatants = this.getAllCombatants();
        return [...allCombatants].sort(CombatantState.compareInitiative);
    }

    /**
     * Update combatant property
     * @param {string} combatantId - Combatant ID
     * @param {string} property - Property path to update
     * @param {*} value - New value
     * @returns {Promise<boolean>} Success status
     * @throws {Error} If combatant not found or validation fails
     */
    static async updateCombatant(combatantId, property, value) {
        try {
            const combatant = this.getCombatant(combatantId);
            if (!combatant) {
                throw new Error(`Combatant not found: ${combatantId}`);
            }

            // Validate the update if it's a critical property
            if (this.isCriticalProperty(property)) {
                const validation = this.validatePropertyUpdate(combatant, property, value);
                if (!validation.isValid) {
                    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
                }
            }

            // Update through state manager
            StateManager.updateCombatant(combatantId, property, value);

            console.log(`✅ Updated ${combatant.name}: ${property} = ${value}`);
            return true;
        } catch (error) {
            console.error('Failed to update combatant:', error);
            ToastSystem.show(`Update failed: ${error.message}`, 'error', 3000);
            throw error;
        }
    }

    /**
     * Update multiple properties at once
     * @param {string} combatantId - Combatant ID
     * @param {Object} updates - Object with property updates
     * @returns {Promise<boolean>} Success status
     */
    static async updateCombatantMultiple(combatantId, updates) {
        try {
            const combatant = this.getCombatant(combatantId);
            if (!combatant) {
                throw new Error(`Combatant not found: ${combatantId}`);
            }

            // Validate all updates
            for (const [property, value] of Object.entries(updates)) {
                if (this.isCriticalProperty(property)) {
                    const validation = this.validatePropertyUpdate(combatant, property, value);
                    if (!validation.isValid) {
                        throw new Error(`Validation failed for ${property}: ${validation.errors.join(', ')}`);
                    }
                }
            }

            // Apply all updates
            for (const [property, value] of Object.entries(updates)) {
                StateManager.updateCombatant(combatantId, property, value);
            }

            console.log(`✅ Updated ${combatant.name} with ${Object.keys(updates).length} properties`);
            return true;
        } catch (error) {
            console.error('Failed to update combatant:', error);
            ToastSystem.show(`Batch update failed: ${error.message}`, 'error', 3000);
            throw error;
        }
    }

    /**
     * Remove combatant from encounter
     * @param {string} combatantId - Combatant ID
     * @returns {Promise<boolean>} Success status
     * @throws {Error} If combatant not found
     */
    static async removeCombatant(combatantId) {
        try {
            const combatant = this.getCombatant(combatantId);
            if (!combatant) {
                throw new Error(`Combatant not found: ${combatantId}`);
            }

            const combatantName = combatant.name;
            StateManager.removeCombatant(combatantId);

            console.log(`✅ Removed combatant: ${combatantName}`);
            ToastSystem.show(`Removed ${combatantName} from encounter`, 'info', 2000);

            return true;
        } catch (error) {
            console.error('Failed to remove combatant:', error);
            ToastSystem.show(`Failed to remove combatant: ${error.message}`, 'error', 3000);
            throw error;
        }
    }

    /**
     * Duplicate an existing combatant
     * @param {string} combatantId - ID of combatant to duplicate
     * @param {Object} overrides - Optional property overrides
     * @returns {Promise<string>} New combatant ID
     */
    static async duplicateCombatant(combatantId, overrides = {}) {
        try {
            const originalCombatant = this.getCombatant(combatantId);
            if (!originalCombatant) {
                throw new Error(`Combatant not found: ${combatantId}`);
            }

            // Create duplicate data
            const duplicateData = {
                ...originalCombatant,
                name: `${originalCombatant.name} (Copy)`,
                id: undefined, // Will be generated
                isActive: false,
                ...overrides
            };

            // Remove non-transferable properties
            delete duplicateData.hpHistory;

            return await this.createCombatant(duplicateData);
        } catch (error) {
            console.error('Failed to duplicate combatant:', error);
            throw error;
        }
    }

    /**
     * Add condition to combatant
     * @param {string} combatantId - Combatant ID
     * @param {Object} condition - Condition data
     * @returns {Promise<boolean>} Success status
     */
    static async addCondition(combatantId, condition) {
        try {
            const combatant = this.getCombatant(combatantId);
            if (!combatant) {
                throw new Error(`Combatant not found: ${combatantId}`);
            }

            const updatedCombatant = CombatantState.addCondition(combatant, condition);
            StateManager.updateCombatant(combatantId, 'conditions', updatedCombatant.conditions);

            console.log(`✅ Added condition ${condition.name} to ${combatant.name}`);
            ToastSystem.show(`Applied ${condition.name} to ${combatant.name}`, 'success', 2000);

            return true;
        } catch (error) {
            console.error('Failed to add condition:', error);
            ToastSystem.show(`Failed to add condition: ${error.message}`, 'error', 3000);
            throw error;
        }
    }

    /**
     * Remove condition from combatant
     * @param {string} combatantId - Combatant ID
     * @param {string} conditionName - Name of condition to remove
     * @returns {Promise<boolean>} Success status
     */
    static async removeCondition(combatantId, conditionName) {
        try {
            const combatant = this.getCombatant(combatantId);
            if (!combatant) {
                throw new Error(`Combatant not found: ${combatantId}`);
            }

            const updatedCombatant = CombatantState.removeCondition(combatant, conditionName);
            StateManager.updateCombatant(combatantId, 'conditions', updatedCombatant.conditions);

            console.log(`✅ Removed condition ${conditionName} from ${combatant.name}`);
            ToastSystem.show(`Removed ${conditionName} from ${combatant.name}`, 'info', 2000);

            return true;
        } catch (error) {
            console.error('Failed to remove condition:', error);
            ToastSystem.show(`Failed to remove condition: ${error.message}`, 'error', 3000);
            throw error;
        }
    }

    /**
     * Add effect to combatant
     * @param {string} combatantId - Combatant ID
     * @param {Object} effect - Effect data
     * @returns {Promise<boolean>} Success status
     */
    static async addEffect(combatantId, effect) {
        try {
            const combatant = this.getCombatant(combatantId);
            if (!combatant) {
                throw new Error(`Combatant not found: ${combatantId}`);
            }

            const updatedCombatant = CombatantState.addEffect(combatant, effect);
            StateManager.updateCombatant(combatantId, 'effects', updatedCombatant.effects);

            console.log(`✅ Added effect ${effect.name} to ${combatant.name}`);
            ToastSystem.show(`Applied ${effect.name} to ${combatant.name}`, 'success', 2000);

            return true;
        } catch (error) {
            console.error('Failed to add effect:', error);
            ToastSystem.show(`Failed to add effect: ${error.message}`, 'error', 3000);
            throw error;
        }
    }

    /**
     * Remove effect from combatant
     * @param {string} combatantId - Combatant ID
     * @param {string} effectName - Name of effect to remove
     * @returns {Promise<boolean>} Success status
     */
    static async removeEffect(combatantId, effectName) {
        try {
            const combatant = this.getCombatant(combatantId);
            if (!combatant) {
                throw new Error(`Combatant not found: ${combatantId}`);
            }

            const updatedCombatant = CombatantState.removeEffect(combatant, effectName);
            StateManager.updateCombatant(combatantId, 'effects', updatedCombatant.effects);

            console.log(`✅ Removed effect ${effectName} from ${combatant.name}`);
            ToastSystem.show(`Removed ${effectName} from ${combatant.name}`, 'info', 2000);

            return true;
        } catch (error) {
            console.error('Failed to remove effect:', error);
            ToastSystem.show(`Failed to remove effect: ${error.message}`, 'error', 3000);
            throw error;
        }
    }

    /**
     * Get combatant statistics
     * @param {string} combatantId - Combatant ID (optional, gets all if not provided)
     * @returns {Object} Statistics object
     */
    static getStatistics(combatantId = null) {
        if (combatantId) {
            const combatant = this.getCombatant(combatantId);
            if (!combatant) return null;

            return {
                id: combatant.id,
                name: combatant.name,
                healthState: CombatantState.getHealthState(combatant),
                effectiveHP: CombatantState.getEffectiveHP(combatant),
                activeConditions: combatant.conditions.length,
                activeEffects: combatant.effects.length,
                hpHistoryEntries: combatant.hpHistory?.length || 0
            };
        } else {
            const allCombatants = this.getAllCombatants();
            const totalHP = allCombatants.reduce((sum, c) => sum + c.currentHP, 0);
            const totalMaxHP = allCombatants.reduce((sum, c) => sum + c.maxHP, 0);

            return {
                totalCombatants: allCombatants.length,
                playerCount: allCombatants.filter(c => c.type === 'player').length,
                enemyCount: allCombatants.filter(c => c.type === 'enemy').length,
                npcCount: allCombatants.filter(c => c.type === 'npc').length,
                totalCurrentHP: totalHP,
                totalMaxHP: totalMaxHP,
                averageInitiative: allCombatants.reduce((sum, c) => sum + c.initiative, 0) / allCombatants.length || 0,
                unconsciousCount: allCombatants.filter(c => c.currentHP === 0).length
            };
        }
    }

    /**
     * Check if a property is critical and needs validation
     * @param {string} property - Property path
     * @returns {boolean} True if critical
     * @private
     */
    static isCriticalProperty(property) {
        const criticalProperties = [
            'maxHP', 'currentHP', 'tempHP', 'ac', 'initiative', 'name', 'type'
        ];
        return criticalProperties.some(critical => property.includes(critical));
    }

    /**
     * Validate a property update
     * @param {Object} combatant - Current combatant data
     * @param {string} property - Property being updated
     * @param {*} value - New value
     * @returns {Object} Validation result
     * @private
     */
    static validatePropertyUpdate(combatant, property, value) {
        const errors = [];

        switch (property) {
            case 'maxHP':
                if (typeof value !== 'number' || value < 1) {
                    errors.push('Max HP must be a positive number');
                }
                break;
            case 'currentHP':
                if (typeof value !== 'number' || value < 0) {
                    errors.push('Current HP cannot be negative');
                }
                if (value > combatant.maxHP) {
                    errors.push('Current HP cannot exceed max HP');
                }
                break;
            case 'tempHP':
                if (typeof value !== 'number' || value < 0) {
                    errors.push('Temporary HP cannot be negative');
                }
                break;
            case 'ac':
                if (typeof value !== 'number' || value < 0) {
                    errors.push('AC must be a non-negative number');
                }
                break;
            case 'initiative':
                if (typeof value !== 'number') {
                    errors.push('Initiative must be a number');
                }
                break;
            case 'name':
                if (!value || typeof value !== 'string' || !value.trim()) {
                    errors.push('Name is required and must be non-empty');
                }
                break;
            case 'type':
                if (!['player', 'enemy', 'npc'].includes(value)) {
                    errors.push('Type must be player, enemy, or npc');
                }
                break;
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}