/**
 * StateManager - Centralized State Management Coordinator
 *
 * Coordinates between specialized state modules:
 * - CombatState: Combat rounds, turns, and progression
 * - CombatantState: Individual combatant data and operations
 * - UIState: User interface state and preferences
 * - PersistentState: Data persistence and auto-save
 *
 * Provides a unified interface for state management while
 * maintaining separation of concerns through modular design.
 *
 * @version 2.0.0
 */

import { CombatState } from './combat-state.js';
import { CombatantState } from './combatant-state.js';
import { UIState } from './ui-state.js';
import { PersistentState } from './persistent-state.js';

export class StateManager {
    static state = {
        combat: null,
        combatants: [],
        ui: null
    };

    static observers = new Map(); // Observer callbacks for state changes

    /**
     * Initialize the state management system
     */
    static init() {
        console.log('📊 State Manager v2.0 initializing...');

        // Initialize state modules
        this.state.combat = CombatState.init();
        this.state.ui = UIState.init();
        this.state.combatants = [];

        // Initialize persistence
        PersistentState.init();

        // Try to load saved state
        const savedState = PersistentState.loadState();
        if (savedState) {
            this.loadState(savedState);
        } else {
            // Load with example data for development
            this.loadExampleData();
        }

        // Make StateManager globally available for persistence
        window.StateManager = this;

        console.log('✅ State Manager v2.0 initialized');
        console.log('Current state:', this.getState());
    }

    /**
     * Get current state (read-only deep copy)
     * @returns {Object} Current application state
     */
    static getState() {
        return JSON.parse(JSON.stringify(this.state));
    }

    /**
     * Get specific state slice
     * @param {string} slice - State slice name (combat, combatants, ui)
     * @returns {*} State slice data
     */
    static getStateSlice(slice) {
        return JSON.parse(JSON.stringify(this.state[slice]));
    }

    /**
     * Load state from external source
     * @param {Object} newState - State to load
     */
    static loadState(newState) {
        if (newState.combat) {
            this.state.combat = newState.combat;
        }
        if (newState.combatants) {
            this.state.combatants = newState.combatants;
        }
        if (newState.ui) {
            this.state.ui = newState.ui;
        }

        this.notifyObservers('*', this.state, null);
        this.scheduleAutoSave();
    }

    /**
     * Load example data for development/demo
     */
    static loadExampleData() {
        // Create example combatants
        this.state.combatants = [
            CombatantState.createCombatant({
                id: 'combatant-1',
                name: 'Thorin Ironforge',
                type: 'player',
                initiative: 18,
                ac: 18,
                maxHP: 40,
                currentHP: 24,
                tempHP: 5,
                status: {
                    concentration: true,
                    concentrationSpell: 'shield',
                    hiding: false,
                    cover: 'half',
                    surprised: false
                },
                conditions: [
                    { name: 'Blessed', duration: 3, note: 'From spell', decrementOn: 'turnStart' }
                ],
                effects: [
                    { name: 'Shield', duration: 'infinite', note: '+2 AC', decrementOn: null }
                ]
            }),
            CombatantState.createCombatant({
                id: 'combatant-2',
                name: 'Orc Warrior',
                type: 'enemy',
                initiative: 16,
                ac: 14,
                maxHP: 25,
                currentHP: 8,
                tempHP: 0,
                holdAction: true,
                status: {
                    concentration: false,
                    hiding: true,
                    cover: 'three-quarters',
                    surprised: false
                },
                conditions: [
                    { name: 'Poisoned', duration: 1, note: '', decrementOn: 'turnStart' }
                ]
            }),
            CombatantState.createCombatant({
                id: 'combatant-3',
                name: 'Elara Moonwhisper',
                type: 'player',
                initiative: 12,
                ac: 15,
                maxHP: 28,
                currentHP: 0,
                tempHP: 0,
                status: {
                    concentration: false,
                    hiding: false,
                    cover: 'none',
                    surprised: false
                },
                conditions: [
                    { name: 'Unconscious', duration: 'infinite', note: '', decrementOn: null }
                ]
            })
        ];

        // Start combat with example data
        this.state.combat = CombatState.startCombat(this.state.combatants);
        this.state.combatants[0].isActive = true;

        // Set UI state
        this.state.ui.selectedCombatants = ['combatant-3'];
    }

    /**
     * Update combat state
     * @param {Object} updates - Combat state updates
     */
    static updateCombat(updates) {
        const oldCombat = this.state.combat;
        this.state.combat = { ...this.state.combat, ...updates };

        this.notifyObservers('combat', this.state.combat, oldCombat);
        this.scheduleAutoSave();
    }

    /**
     * Update single combatant
     * @param {string} combatantId - ID of combatant to update
     * @param {string} property - Property path or updates object
     * @param {*} value - New value (if property is string)
     */
    static updateCombatant(combatantId, property, value) {
        const combatant = this.state.combatants.find(c => c.id === combatantId);
        if (!combatant) {
            console.warn(`Combatant ${combatantId} not found`);
            return;
        }

        const oldCombatant = { ...combatant };
        let updatedCombatant;

        if (typeof property === 'string') {
            // Update specific property
            updatedCombatant = CombatantState.updateProperty(combatant, property, value);
        } else {
            // Property is actually an updates object
            updatedCombatant = { ...combatant, ...property };
        }

        // Replace in array
        const index = this.state.combatants.findIndex(c => c.id === combatantId);
        this.state.combatants[index] = updatedCombatant;

        this.notifyObservers(`combatants.${combatantId}`, updatedCombatant, oldCombatant);
        this.notifyObservers('combatants', this.state.combatants, this.state.combatants);
        this.scheduleAutoSave();
    }

    /**
     * Update UI state
     * @param {Object} updates - UI state updates
     */
    static updateUI(updates) {
        const oldUI = this.state.ui;
        this.state.ui = { ...this.state.ui, ...updates };

        this.notifyObservers('ui', this.state.ui, oldUI);
        // UI state changes don't trigger auto-save by default
    }

    /**
     * Add new combatant
     * @param {Object} combatantData - Initial combatant data
     * @returns {string} New combatant ID
     */
    static addCombatant(combatantData) {
        const newCombatant = CombatantState.createCombatant(combatantData);
        this.state.combatants.push(newCombatant);

        this.notifyObservers('combatants', this.state.combatants, this.state.combatants);
        this.scheduleAutoSave();

        return newCombatant.id;
    }

    /**
     * Remove combatant
     * @param {string} combatantId - ID of combatant to remove
     */
    static removeCombatant(combatantId) {
        const index = this.state.combatants.findIndex(c => c.id === combatantId);
        if (index === -1) {
            console.warn(`Combatant ${combatantId} not found`);
            return;
        }

        this.state.combatants.splice(index, 1);

        // Remove from UI selections
        this.state.ui.selectedCombatants = this.state.ui.selectedCombatants.filter(id => id !== combatantId);

        this.notifyObservers('combatants', this.state.combatants, this.state.combatants);
        this.scheduleAutoSave();
    }

    /**
     * Get current active combatant
     * @returns {Object|null} Active combatant or null
     */
    static getActiveCombatant() {
        return this.state.combatants.find(c => c.isActive) || null;
    }

    /**
     * Get combatant by ID
     * @param {string} combatantId - Combatant ID
     * @returns {Object|null} Combatant or null
     */
    static getCombatant(combatantId) {
        return this.state.combatants.find(c => c.id === combatantId) || null;
    }

    /**
     * Advance to next turn
     */
    static nextTurn() {
        console.log('⏭️ Advancing to next turn...');

        const currentActive = this.getActiveCombatant();
        if (currentActive) {
            // Process turn end effects
            const updatedCombatant = CombatantState.processTurnEffects(currentActive, 'turnEnd');
            this.updateCombatant(currentActive.id, updatedCombatant);

            // Mark as not active
            this.updateCombatant(currentActive.id, 'isActive', false);
        }

        // Advance combat state
        const newCombatState = CombatState.advanceTurn(this.state.combat, this.state.combatants);
        this.updateCombat(newCombatState);

        // Set new active combatant
        const newActiveCombatant = this.state.combatants[newCombatState.currentTurnIndex];
        if (newActiveCombatant) {
            this.updateCombatant(newActiveCombatant.id, 'isActive', true);

            // Process turn start effects
            const processedCombatant = CombatantState.processTurnEffects(newActiveCombatant, 'turnStart');
            this.updateCombatant(newActiveCombatant.id, processedCombatant);

            console.log(`✅ ${newActiveCombatant.name}'s turn (Round ${newCombatState.round})`);
        }
    }

    /**
     * Start combat
     */
    static startCombat() {
        if (!CombatState.canStartCombat(this.state.combatants)) {
            throw new Error('Cannot start combat without combatants');
        }

        // Sort combatants by initiative
        this.state.combatants.sort(CombatantState.compareInitiative);

        // Initialize combat state
        const combatState = CombatState.startCombat(this.state.combatants);
        this.updateCombat(combatState);

        // Set first combatant as active
        this.updateCombatant(this.state.combatants[0].id, 'isActive', true);

        console.log('🎲 Combat started!');
    }

    /**
     * Reset combat
     */
    static resetCombat() {
        console.log('🔄 Resetting combat...');

        // Reset all combatants to inactive
        this.state.combatants.forEach(combatant => {
            this.updateCombatant(combatant.id, 'isActive', false);
        });

        // Reset combat state
        const resetState = CombatState.resetCombat();
        this.updateCombat(resetState);

        console.log('✅ Combat reset');
    }

    /**
     * Subscribe to state changes
     * @param {string} path - State path to watch
     * @param {function} callback - Callback function
     * @returns {function} Unsubscribe function
     */
    static observe(path, callback) {
        if (!this.observers.has(path)) {
            this.observers.set(path, new Set());
        }
        this.observers.get(path).add(callback);

        return () => {
            const pathObservers = this.observers.get(path);
            if (pathObservers) {
                pathObservers.delete(callback);
                if (pathObservers.size === 0) {
                    this.observers.delete(path);
                }
            }
        };
    }

    /**
     * Notify observers of state changes
     * @param {string} path - Changed state path
     * @param {*} newValue - New value
     * @param {*} oldValue - Old value
     */
    static notifyObservers(path, newValue, oldValue) {
        // Exact path match
        const exactObservers = this.observers.get(path);
        if (exactObservers) {
            exactObservers.forEach(callback => {
                try {
                    callback(newValue, oldValue, path);
                } catch (error) {
                    console.error(`Observer error for path ${path}:`, error);
                }
            });
        }

        // Wildcard matches
        this.observers.forEach((callbacks, observerPath) => {
            if (observerPath.includes('*')) {
                const pattern = observerPath.replace(/\*/g, '[^.]+');
                const regex = new RegExp(`^${pattern}$`);
                if (regex.test(path)) {
                    callbacks.forEach(callback => {
                        try {
                            callback(newValue, oldValue, path);
                        } catch (error) {
                            console.error(`Observer error for wildcard path ${observerPath}:`, error);
                        }
                    });
                }
            }
        });
    }

    /**
     * Schedule auto-save
     */
    static scheduleAutoSave() {
        PersistentState.scheduleAutoSave(this.state);
    }

    /**
     * Manually save state
     * @returns {boolean} Success status
     */
    static saveState() {
        return PersistentState.saveState(this.state);
    }

    /**
     * Get storage information
     * @returns {Object|null} Storage info
     */
    static getStorageInfo() {
        return PersistentState.getStorageInfo();
    }

    /**
     * Export state for backup
     * @returns {string} JSON string of state
     */
    static exportState() {
        return PersistentState.exportState(this.state);
    }

    /**
     * Import state from JSON
     * @param {string} jsonData - JSON string to import
     * @returns {boolean} Success status
     */
    static importState(jsonData) {
        const importedState = PersistentState.importState(jsonData);
        if (importedState) {
            this.loadState(importedState);
            return true;
        }
        return false;
    }

    /**
     * Clear all data
     */
    static clearAllData() {
        PersistentState.clearAllData();
        this.state.combat = CombatState.init();
        this.state.combatants = [];
        this.state.ui = UIState.init();
        this.notifyObservers('*', this.state, null);
    }

    /**
     * Destroy state manager
     */
    static destroy() {
        PersistentState.destroy();
        this.observers.clear();
        console.log('📊 State Manager destroyed');
    }
}