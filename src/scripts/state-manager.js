/**
 * StateManager - Reactive State Management for D&D Encounter Manager
 * 
 * Features:
 * - Reactive observer pattern for efficient DOM updates
 * - Combat turn tracking with phase hooks
 * - Automatic counter decrementation
 * - Auto-save to localStorage with debouncing
 * - Initiative order management
 * 
 * @version 1.0.0
 */

export class StateManager {
    static state = {
        combat: {
            isActive: false,
            round: 3, // Match the template example
            currentTurnIndex: 0, // Points to active combatant (Thorin)
            combatants: [
                // Based on the HTML template examples
                {
                    id: 'combatant-1',
                    name: 'Thorin Ironforge',
                    type: 'player',
                    initiative: 18,
                    ac: 18,
                    maxHP: 40,
                    currentHP: 24,
                    tempHP: 5,
                    isActive: true, // Currently active turn
                    holdAction: false,
                    status: {
                        concentration: true,
                        concentrationSpell: 'shield',
                        hiding: false,
                        cover: 'half',
                        surprised: false
                    },
                    conditions: [
                        {
                            name: 'Blessed',
                            duration: 3,
                            note: 'From spell',
                            decrementOn: 'turnStart' // or 'turnEnd'
                        }
                    ],
                    effects: [
                        {
                            name: 'Shield',
                            duration: 'infinite',
                            note: '+2 AC',
                            decrementOn: null
                        }
                    ]
                },
                {
                    id: 'combatant-2',
                    name: 'Orc Warrior',
                    type: 'enemy',
                    initiative: 16,
                    ac: 14,
                    maxHP: 25,
                    currentHP: 8,
                    tempHP: 0,
                    isActive: false,
                    holdAction: true, // Has hold action background
                    status: {
                        concentration: false,
                        hiding: true,
                        cover: 'three-quarters',
                        surprised: false
                    },
                    conditions: [
                        {
                            name: 'Poisoned',
                            duration: 1,
                            note: '',
                            decrementOn: 'turnStart'
                        }
                    ],
                    effects: []
                },
                {
                    id: 'combatant-3',
                    name: 'Elara Moonwhisper',
                    type: 'player',
                    initiative: 12,
                    ac: 15,
                    maxHP: 28,
                    currentHP: 0,
                    tempHP: 0,
                    isActive: false,
                    holdAction: false,
                    status: {
                        concentration: false,
                        hiding: false,
                        cover: 'none',
                        surprised: false
                    },
                    conditions: [
                        {
                            name: 'Unconscious',
                            duration: 'infinite',
                            note: '',
                            decrementOn: null
                        }
                    ],
                    effects: []
                },
                {
                    id: 'combatant-4',
                    name: 'Goblin Archer',
                    type: 'enemy',
                    initiative: 8,
                    ac: 12,
                    maxHP: 15,
                    currentHP: 0,
                    tempHP: 0,
                    isActive: false,
                    holdAction: false,
                    status: {
                        concentration: false,
                        hiding: false,
                        cover: 'full',
                        surprised: false
                    },
                    conditions: [],
                    effects: []
                },
                {
                    id: 'combatant-5',
                    name: 'Merchant Guard',
                    type: 'npc',
                    initiative: 14,
                    ac: 16,
                    maxHP: 22,
                    currentHP: 22,
                    tempHP: 0,
                    isActive: false,
                    holdAction: false,
                    status: {
                        concentration: false,
                        hiding: false,
                        cover: 'none',
                        surprised: true // Shows surprised emoji
                    },
                    conditions: [],
                    effects: [
                        {
                            name: 'Guidance',
                            duration: 2,
                            note: '+1d4 to next ability check',
                            decrementOn: 'turnEnd'
                        }
                    ]
                }
            ]
        },
        ui: {
            selectedCombatants: ['combatant-5'], // For batch operations
            activeModal: null,
            notifications: []
        }
    };

    static observers = new Map(); // Observer callbacks for state changes
    static autoSaveTimeout = null; // Debounce timeout for auto-save

    /**
     * Initialize the state management system
     */
    static init() {
        console.log('📊 State Manager initializing...');
        
        // Load saved state from localStorage if available
        this.loadAutoSavedState();
        
        // Set up auto-save on state changes
        this.setupAutoSave();
        
        // Initialize DOM with current state
        this.syncDOMWithState();
        
        console.log('✅ State Manager initialized');
        console.log('Current state:', this.state);
    }

    /**
     * Get current state (read-only)
     */
    static getState() {
        return JSON.parse(JSON.stringify(this.state));
    }

    /**
     * Get current active combatant
     */
    static getActiveCombatant() {
        const { currentTurnIndex, combatants } = this.state.combat;
        return combatants[currentTurnIndex] || null;
    }

    /**
     * Subscribe to state changes
     * @param {string} path - State path to watch (e.g., 'combat.round', 'combat.combatants.*.currentHP')
     * @param {function} callback - Function to call when path changes
     */
    static observe(path, callback) {
        if (!this.observers.has(path)) {
            this.observers.set(path, new Set());
        }
        this.observers.get(path).add(callback);
        
        // Return unsubscribe function
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
     * Update state and notify observers
     * @param {string} path - State path to update
     * @param {*} value - New value
     */
    static setState(path, value) {
        const pathParts = path.split('.');
        let current = this.state;
        
        // Navigate to parent of target property
        for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i];
            if (!(part in current)) {
                current[part] = {};
            }
            current = current[part];
        }
        
        // Set the value
        const finalKey = pathParts[pathParts.length - 1];
        const oldValue = current[finalKey];
        current[finalKey] = value;
        
        // Notify observers
        this.notifyObservers(path, value, oldValue);
        
        // Trigger auto-save
        this.scheduleAutoSave();
    }

    /**
     * Update combatant property
     * @param {string} combatantId - ID of combatant to update
     * @param {string} property - Property path (e.g., 'currentHP', 'status.concentration')
     * @param {*} value - New value
     */
    static updateCombatant(combatantId, property, value) {
        const combatant = this.state.combat.combatants.find(c => c.id === combatantId);
        if (!combatant) {
            console.warn(`Combatant ${combatantId} not found`);
            return;
        }

        const fullPath = `combat.combatants.${combatantId}.${property}`;
        
        // Handle nested property updates
        const propParts = property.split('.');
        let current = combatant;
        for (let i = 0; i < propParts.length - 1; i++) {
            const part = propParts[i];
            if (!(part in current)) {
                current[part] = {};
            }
            current = current[part];
        }
        
        const finalKey = propParts[propParts.length - 1];
        const oldValue = current[finalKey];
        current[finalKey] = value;
        
        // Notify observers
        this.notifyObservers(fullPath, value, oldValue);
        this.notifyObservers(`combat.combatants.${combatantId}`, combatant, combatant);
        
        // Trigger auto-save
        this.scheduleAutoSave();
    }

    /**
     * Advance to next turn in initiative order
     */
    static nextTurn() {
        console.log('⏭️ Advancing to next turn...');
        
        const currentCombatant = this.getActiveCombatant();
        if (currentCombatant) {
            // Trigger end-of-turn effects
            this.processTurnEnd(currentCombatant);
            
            // Mark current combatant as not active
            this.updateCombatant(currentCombatant.id, 'isActive', false);
        }
        
        // Advance turn index
        let newTurnIndex = this.state.combat.currentTurnIndex + 1;
        
        // Check if we've completed a round
        if (newTurnIndex >= this.state.combat.combatants.length) {
            newTurnIndex = 0;
            this.setState('combat.round', this.state.combat.round + 1);
            console.log(`🔄 New round: ${this.state.combat.round}`);
        }
        
        // Set new active combatant
        this.setState('combat.currentTurnIndex', newTurnIndex);
        const newActiveCombatant = this.getActiveCombatant();
        
        if (newActiveCombatant) {
            this.updateCombatant(newActiveCombatant.id, 'isActive', true);
            
            // Trigger start-of-turn effects
            this.processTurnStart(newActiveCombatant);
            
            console.log(`✅ ${newActiveCombatant.name}'s turn (Initiative ${newActiveCombatant.initiative})`);
        }
        
        // Update combat header
        this.updateCombatHeader();
    }

    /**
     * Process turn start effects (decrement counters, etc.)
     */
    static processTurnStart(combatant) {
        console.log(`🎬 Processing turn start for ${combatant.name}`);
        
        // Decrement conditions that expire at turn start
        combatant.conditions = combatant.conditions.filter(condition => {
            if (condition.decrementOn === 'turnStart' && condition.duration !== 'infinite') {
                condition.duration--;
                if (condition.duration <= 0) {
                    console.log(`⏰ ${condition.name} expired on ${combatant.name}`);
                    return false; // Remove expired condition
                }
            }
            return true;
        });
        
        // Decrement effects that expire at turn start
        combatant.effects = combatant.effects.filter(effect => {
            if (effect.decrementOn === 'turnStart' && effect.duration !== 'infinite') {
                effect.duration--;
                if (effect.duration <= 0) {
                    console.log(`⏰ ${effect.name} expired on ${combatant.name}`);
                    return false; // Remove expired effect
                }
            }
            return true;
        });
        
        // Update DOM for this combatant
        this.updateCombatantDOM(combatant);
    }

    /**
     * Process turn end effects
     */
    static processTurnEnd(combatant) {
        console.log(`🎬 Processing turn end for ${combatant.name}`);
        
        // Decrement conditions that expire at turn end
        combatant.conditions = combatant.conditions.filter(condition => {
            if (condition.decrementOn === 'turnEnd' && condition.duration !== 'infinite') {
                condition.duration--;
                if (condition.duration <= 0) {
                    console.log(`⏰ ${condition.name} expired on ${combatant.name}`);
                    return false; // Remove expired condition
                }
            }
            return true;
        });
        
        // Decrement effects that expire at turn end
        combatant.effects = combatant.effects.filter(effect => {
            if (effect.decrementOn === 'turnEnd' && effect.duration !== 'infinite') {
                effect.duration--;
                if (effect.duration <= 0) {
                    console.log(`⏰ ${effect.name} expired on ${combatant.name}`);
                    return false; // Remove expired effect
                }
            }
            return true;
        });
        
        // Update DOM for this combatant
        this.updateCombatantDOM(combatant);
    }

    /**
     * Reset combat to initial state
     */
    static resetCombat() {
        console.log('🔄 Resetting combat...');
        
        // Reset combat state
        this.setState('combat.round', 1);
        this.setState('combat.currentTurnIndex', 0);
        
        // Reset all combatants
        this.state.combat.combatants.forEach((combatant, index) => {
            this.updateCombatant(combatant.id, 'isActive', index === 0);
            // Additional reset logic can be added here
        });
        
        this.updateCombatHeader();
        console.log('✅ Combat reset to Round 1');
    }

    /**
     * Notify observers of state changes
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
        
        // Wildcard path matches (e.g., 'combat.combatants.*')
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
     * Schedule auto-save with debouncing
     */
    static scheduleAutoSave() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        this.autoSaveTimeout = setTimeout(() => {
            this.autoSave();
        }, 300); // 300ms debounce
    }

    /**
     * Auto-save to localStorage
     */
    static autoSave() {
        try {
            const saveData = {
                timestamp: Date.now(),
                state: this.state
            };
            localStorage.setItem('dnd-encounter-autosave', JSON.stringify(saveData));
            console.log('💾 Auto-saved to localStorage');
        } catch (error) {
            console.error('❌ Auto-save failed:', error);
        }
    }

    /**
     * Load auto-saved state from localStorage
     */
    static loadAutoSavedState() {
        try {
            const saved = localStorage.getItem('dnd-encounter-autosave');
            if (saved) {
                const saveData = JSON.parse(saved);
                if (saveData.state && saveData.timestamp) {
                    this.state = saveData.state;
                    console.log('📂 Loaded auto-saved state from localStorage');
                    console.log('Save timestamp:', new Date(saveData.timestamp).toLocaleString());
                }
            }
        } catch (error) {
            console.error('❌ Failed to load auto-saved state:', error);
        }
    }

    /**
     * Set up auto-save system
     */
    static setupAutoSave() {
        // Save on page unload
        window.addEventListener('beforeunload', () => {
            this.autoSave();
        });
        
        // Periodic backup save every 30 seconds
        setInterval(() => {
            this.autoSave();
        }, 30000);
    }

    /**
     * Sync DOM with current state (initial render)
     */
    static syncDOMWithState() {
        console.log('🔄 Syncing DOM with state...');
        
        // Update each combatant card
        this.state.combat.combatants.forEach(combatant => {
            this.updateCombatantDOM(combatant);
        });
        
        // Update combat header
        this.updateCombatHeader();
        
        console.log('✅ DOM synchronized');
    }

    /**
     * Update a single combatant's DOM representation
     */
    static updateCombatantDOM(combatant) {
        const cardElement = document.querySelector(`[data-combatant-id="${combatant.id}"]`);
        if (!cardElement) {
            console.warn(`DOM element not found for combatant ${combatant.id}`);
            return;
        }

        // Update active state
        cardElement.classList.toggle('active-in-initiative', combatant.isActive);
        
        // Update hold action state
        const orderControls = cardElement.querySelector('.combatant-order-controls');
        if (orderControls) {
            orderControls.classList.toggle('hold-action', combatant.holdAction);
        }
        
        // Update HP
        const currentHPElement = cardElement.querySelector('.current-health');
        if (currentHPElement) {
            currentHPElement.textContent = combatant.currentHP;
        }
        
        const tempHPElement = cardElement.querySelector('.temporary-health');
        if (tempHPElement) {
            tempHPElement.textContent = combatant.tempHP > 0 ? `+${combatant.tempHP}` : '';
            tempHPElement.style.display = combatant.tempHP > 0 ? 'inline' : 'none';
        }
        
        // Update conditions and effects (simplified for now)
        this.updateConditionsEffectsDOM(combatant, cardElement);
        
        // Update status indicators
        this.updateStatusIndicatorsDOM(combatant, cardElement);
    }

    /**
     * Update conditions and effects in DOM
     */
    static updateConditionsEffectsDOM(combatant, cardElement) {
        const conditionsContainer = cardElement.querySelector('.combatant-conditions-effects');
        if (!conditionsContainer) return;
        
        // Clear existing badges
        conditionsContainer.innerHTML = '';
        
        // Add condition badges
        combatant.conditions.forEach(condition => {
            const badge = document.createElement('span');
            badge.className = 'combatant-condition-badge';
            badge.innerHTML = `
                ${condition.name}
                <span class="condition-duration-counter ${condition.duration === 'infinite' ? 'duration-permanent' : 'duration-remaining'}">
                    ${condition.duration === 'infinite' ? '∞' : condition.duration}
                </span>
                <button class="condition-clear" title="Clear condition" data-action="clear-condition">×</button>
            `;
            conditionsContainer.appendChild(badge);
        });
        
        // Add effect badges
        combatant.effects.forEach(effect => {
            const badge = document.createElement('span');
            badge.className = 'combatant-effect-badge';
            badge.innerHTML = `
                ${effect.name}
                <span class="effect-duration-counter ${effect.duration === 'infinite' ? 'duration-permanent' : 'duration-remaining'}">
                    ${effect.duration === 'infinite' ? '∞' : effect.duration}
                </span>
                ${effect.note ? `<span class="effect-note">(${effect.note})</span>` : ''}
                <button class="effect-clear" title="Clear effect" data-action="clear-effect">×</button>
            `;
            conditionsContainer.appendChild(badge);
        });
    }

    /**
     * Update status indicators in DOM
     */
    static updateStatusIndicatorsDOM(combatant, cardElement) {
        // Concentration indicator
        const concentrationElement = cardElement.querySelector('.concentration-indicator');
        if (concentrationElement) {
            concentrationElement.setAttribute('data-is-concentrating', combatant.status.concentration);
            concentrationElement.textContent = combatant.status.concentration ? 'Concentrating' : 'Not concentrating';
        }
        
        // Hiding indicator
        const stealthElement = cardElement.querySelector('.stealth-indicator');
        if (stealthElement) {
            stealthElement.setAttribute('data-is-hiding', combatant.status.hiding);
            stealthElement.textContent = combatant.status.hiding ? 'Hiding' : 'Not hiding';
        }
        
        // Cover indicator
        const coverElement = cardElement.querySelector('.cover-status-indicator');
        if (coverElement) {
            coverElement.setAttribute('data-cover-level', combatant.status.cover);
            const coverTexts = {
                'none': 'No cover',
                'half': '½ cover',
                'three-quarters': '¾ cover',
                'full': 'Full cover'
            };
            coverElement.textContent = coverTexts[combatant.status.cover] || 'No cover';
        }
    }

    /**
     * Update the combat header display
     */
    static updateCombatHeader() {
        const headerElement = document.getElementById('initiative-header-display');
        if (!headerElement) return;
        
        const activeCombatant = this.getActiveCombatant();
        if (!activeCombatant) return;
        
        const { round } = this.state.combat;
        const healthDisplay = activeCombatant.tempHP > 0 
            ? `${activeCombatant.currentHP}+${activeCombatant.tempHP}/${activeCombatant.maxHP}`
            : `${activeCombatant.currentHP}/${activeCombatant.maxHP}`;
        
        const coverIcon = {
            'none': '○',
            'half': '◐',
            'three-quarters': '◕',
            'full': '●'
        }[activeCombatant.status.cover] || '○';
        
        const concentrationIcon = activeCombatant.status.concentration ? '🧠' : '';
        
        const conditionsList = activeCombatant.conditions.map(c => c.name).join(', ') || 'None';
        
        headerElement.innerHTML = `
            Round ${round} | 
            <span class="current-turn-name">${activeCombatant.name}</span> 
            , 
            <span class="health-status">${healthDisplay}</span>
            , 
            AC ${activeCombatant.ac} 
            <span class="status-separator">|</span> <span class="cover-status">${coverIcon}</span>
            ${concentrationIcon ? `<span class="status-separator">|</span> <span class="cover-status">${concentrationIcon}</span>` : ''}
            <span class="status-separator">|</span> <span class="conditions-list">${conditionsList}</span>
        `;
    }
}