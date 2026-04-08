/**
 * CombatantManager - Template Rendering System
 *
 * Manages the creation, rendering, and lifecycle of multiple CombatantCard instances.
 * Optimized for handling 50+ combatants efficiently with robust error handling
 * and validation.
 *
 * @class CombatantManager
 * @version 1.1.0
 */

import { CombatantCard } from './CombatantCard.js';
import { CombatEvents } from '../../scripts/events/combat-events.js';
import { STORAGE_KEYS, TIMING, DEFAULTS, DATA_PATHS } from '../../scripts/constants.js';
import { CreatureService } from '../../scripts/services/creature-service.js';
import { ApiClient } from '../../scripts/services/api-client.js';

export class CombatantManager {
    constructor() {
        // Store all active combatant cards
        this.combatants = new Map(); // Map of combatantId -> CombatantCard instance
        
        // Reference to the container element
        this.container = null;
        
        // Creature database
        this.creatureDatabase = null;
        
        // Performance optimization: batch DOM updates
        this.pendingUpdates = new Set();
        this.updateScheduled = false;
        
        // Auto-save functionality
        this.autoSaveKey = STORAGE_KEYS.COMBATANT_INSTANCES;
        this.autoSaveInterval = null;
        
        // Bind methods
        this.loadCreatureDatabase = this.loadCreatureDatabase.bind(this);
        this.addCombatant = this.addCombatant.bind(this);
        this.removeCombatant = this.removeCombatant.bind(this);
        this.updateCombatant = this.updateCombatant.bind(this);
        this.renderAll = this.renderAll.bind(this);
        this.saveInstances = this.saveInstances.bind(this);
        this.loadInstances = this.loadInstances.bind(this);
    }
    
    /**
     * Initialize the manager
     * @param {HTMLElement} containerElement - The element to render combatants into
     */
    async init(containerElement) {
        console.log('🎯 Initializing CombatantManager...');
        
        this.container = containerElement;
        
        // Load creature database
        await this.loadCreatureDatabase();
        
        // Load saved instances
        this.loadInstances();
        
        // Set up auto-save
        this.startAutoSave();
        
        // Initial render
        this.renderAll();
        
        // Update combat header after initial render
        CombatEvents.updateCombatHeader();
        
        console.log('✅ CombatantManager initialized');
    }
    
    /**
     * Load the creature database using CreatureService
     * Uses the new unified database system (working database in localStorage)
     * @returns {Promise<void>}
     */
    async loadCreatureDatabase() {
        try {
            // Initialize CreatureService if needed
            await CreatureService.initialize();

            // Load all creatures from the working database
            const creatures = await CreatureService.loadCreatures();

            // Get hidden creatures list
            const hiddenCreatures = JSON.parse(localStorage.getItem('dnd-hidden-creatures') || '[]');

            // Filter out hidden creatures
            this.creatureDatabase = creatures.filter(c => !hiddenCreatures.includes(c.id));

            console.log(`📚 Loaded ${this.creatureDatabase.length} creatures from working database`);
        } catch (error) {
            console.error('❌ Failed to load creature database:', error);
            // Fallback to empty array to prevent crashes
            this.creatureDatabase = [];
        }
    }
    
    /**
     * Get available creatures for the Add Combatant dropdown
     * @returns {Array} Array of creature options
     */
    getAvailableCreatures() {
        return this.creatureDatabase.map(creature => ({
            id: creature.id,
            name: creature.name,
            type: creature.type,
            display: `${creature.name} (${creature.type})`
        }));
    }
    
    /**
     * Add a new combatant from the creature database
     * @param {string} creatureId - ID from the creature database
     * @param {Object} [instanceData={}] - Optional instance-specific data
     * @returns {CombatantCard|null} The created combatant card or null if error
     */
    addCombatant(creatureId, instanceData = {}) {
        try {
            // Find creature in consolidated database
            const creatureData = this.creatureDatabase?.find(c => c.id === creatureId);

            if (!creatureData) {
                console.error(`Creature ${creatureId} not found in database`);
                return null;
            }

            // Validate creature has required properties
            if (!creatureData.id || !creatureData.name || !creatureData.type) {
                console.error(`Creature ${creatureId} is missing required properties`);
                return null;
            }

            // Create new combatant card
            const orderIndex = this.combatants.size;
            const combatantCard = new CombatantCard(creatureData, instanceData, orderIndex);

            // Store in map
            this.combatants.set(combatantCard.id, combatantCard);

            // Immediately render all combatants to show new addition in correct initiative order
            this.renderAll();

            // Save instances
            this.saveInstances();

            // Update combat header to reflect new XP total
            CombatEvents.updateCombatHeader();

            console.log(`➕ Added combatant: ${combatantCard.name} (${combatantCard.id})`);

            return combatantCard;
        } catch (error) {
            console.error('Error adding combatant:', error);
            return null;
        }
    }

    /**
     * Add a placeholder combatant
     * Placeholders have minimal functionality - just a name and notes field
     * @param {Object} instanceData - Optional instance-specific data
     * @returns {CombatantCard} The created placeholder card
     */
    addPlaceholder(instanceData = {}) {
        // Create minimal placeholder creature data
        const placeholderData = {
            id: `placeholder-${Date.now()}`,
            name: 'Placeholder',
            type: 'placeholder',
            ac: 10,
            maxHP: 1,
            currentHP: 1,
            isPlaceholder: true
        };

        // Ensure initiative is set to 0 in instanceData if not provided
        const placeholderInstanceData = {
            ...instanceData,
            initiative: instanceData.initiative ?? 0
        };

        // Create new combatant card with placeholder flag
        const orderIndex = this.combatants.size;
        const combatantCard = new CombatantCard(placeholderData, placeholderInstanceData, orderIndex);

        // Mark as placeholder
        combatantCard.isPlaceholder = true;

        // Store in map
        this.combatants.set(combatantCard.id, combatantCard);

        // Immediately render all combatants
        this.renderAll();

        // Save instances
        this.saveInstances();

        console.log(`➕ Added placeholder: ${combatantCard.id}`);

        return combatantCard;
    }

    /**
     * Remove a combatant
     * @param {string} combatantId - The combatant's unique ID
     */
    removeCombatant(combatantId) {
        const combatant = this.combatants.get(combatantId);
        if (!combatant) return;
        
        // Destroy the card
        combatant.destroy();

        // Remove from map
        this.combatants.delete(combatantId);

        // Update order indices
        this.updateOrderIndices();

        // Save instances
        this.saveInstances();

        // Update combat header to reflect new XP total
        CombatEvents.updateCombatHeader();

        console.log(`➖ Removed combatant: ${combatant.name}`);
    }
    
    /**
     * Update a combatant's property
     * @param {string} combatantId - The combatant's unique ID
     * @param {string} property - Property path (e.g., 'currentHP', 'status.concentration')
     * @param {*} value - New value
     */
    updateCombatant(combatantId, property, value) {
        const combatant = this.combatants.get(combatantId);
        if (!combatant) {
            console.log(`Combatant ${combatantId} not found`);
            return;
        }
        
        console.log(`Updating ${combatantId} ${property} from ${combatant[property]} to ${value}`);
        
        // Update the property
        combatant.updateProperty(property, value);
        
        // For status changes and notes, we need immediate visual update
        if (property.startsWith('status.') || property === 'conditions' || property === 'effects' || property === 'notes' || property === 'nameNote') {
            // Force immediate update instead of scheduling
            if (combatant.element) {
                combatant.update();
            }
        } else {
            // Schedule render update for other properties
            this.scheduleUpdate(combatantId);
        }
        
        // Save instances
        this.saveInstances();
    }
    
    /**
     * Schedule a batch update for performance
     *
     * WHY BATCHING: When multiple properties change in quick succession (e.g., taking
     * damage, updating HP, checking death status), we don't want to re-render the card
     * 3 times. Instead, we batch all updates and render once using requestAnimationFrame.
     *
     * WHY requestAnimationFrame: Browser optimization - it ensures updates happen right
     * before the next paint, preventing wasted renders and keeping animations smooth.
     *
     * @param {string} combatantId - ID of combatant that needs update
     */
    scheduleUpdate(combatantId) {
        this.pendingUpdates.add(combatantId);

        if (!this.updateScheduled) {
            this.updateScheduled = true;
            requestAnimationFrame(() => {
                this.processPendingUpdates();
            });
        }
    }

    /**
     * Process all pending updates in a single batch
     *
     * WHY THE 30% THRESHOLD: Performance optimization. If many combatants need updates
     * (e.g., end of round processing), it's faster to re-render the entire list once
     * rather than individually updating many cards. DOM operations are expensive!
     *
     * EXAMPLE: If you have 10 combatants and 4 need updates, that's 40% > 30% threshold,
     * so we do 1 full render instead of 4 individual renders.
     */
    processPendingUpdates() {
        if (this.pendingUpdates.size === 0) {
            this.updateScheduled = false;
            return;
        }

        // WHY 30% THRESHOLD: Based on performance testing, rendering everything is faster
        // than individual updates when this many cards need changes. This threshold
        // balances responsiveness (small changes are instant) vs efficiency (bulk changes
        // are batched). You can adjust this value based on your performance needs.
        if (this.pendingUpdates.size > this.combatants.size * 0.3) {
            this.renderAll();
        } else {
            // Update individual cards for small changes
            for (const combatantId of this.pendingUpdates) {
                const combatant = this.combatants.get(combatantId);
                if (combatant && combatant.element) {
                    combatant.update();
                }
            }
        }
        
        this.pendingUpdates.clear();
        this.updateScheduled = false;
    }
    
    /**
     * Render all combatants (full re-render)
     */
    renderAll() {
        if (!this.container) return;
        
        console.log(`🎨 Rendering ${this.combatants.size} combatants`);
        
        // Preserve combatant selection states in memory (don't read from DOM)
        // The combatant objects already have the correct isSelected state
        // No need to override them by reading from DOM checkboxes
        
        // Use document fragment for performance
        const fragment = document.createDocumentFragment();
        
        // Sort combatants using the same logic as sortCombatants
        const sortedCombatants = Array.from(this.combatants.values())
            .sort((a, b) => {
                // UPDATED SORTING LOGIC - respects manual order
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
        
        // Render each combatant
        sortedCombatants.forEach((combatant, index) => {
            combatant.orderIndex = index;
            const element = combatant.render();
            fragment.appendChild(element);
        });
        
        // Clear container and append all at once
        this.container.innerHTML = '';
        this.container.appendChild(fragment);

        // Add the "add placeholder" button at the end
        const addButton = document.createElement('button');
        addButton.className = 'add-placeholder-btn';
        addButton.setAttribute('data-action', 'add-placeholder');
        addButton.textContent = '+';
        this.container.appendChild(addButton);
    }
    
    /**
     * Update order indices after sorting or removal
     */
    updateOrderIndices() {
        const sortedCombatants = Array.from(this.combatants.values())
            .sort((a, b) => b.initiative - a.initiative);
        
        sortedCombatants.forEach((combatant, index) => {
            combatant.orderIndex = index;
        });
    }

    /**
     * Sort combatants by manual order first, then initiative
     */
    sortCombatants() {
        console.log('🔄 Sorting combatants...');
        
        // Convert map to array for sorting
        const sortedArray = Array.from(this.combatants.values());
        
        // Sort by manual order if set, otherwise by initiative
        sortedArray.sort((a, b) => {
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
        
        // Update order indices based on new sort
        sortedArray.forEach((combatant, index) => {
            combatant.orderIndex = index;
        });
        
        // Preserve any active turn state
        const activeCombatant = sortedArray.find(c => c.status.isActive);
        if (activeCombatant) {
            console.log(`Active combatant: ${activeCombatant.name} is now at position ${activeCombatant.orderIndex}`);
        }
        
        console.log('✅ Combatants sorted');
    }
    
    /**
     * Get combatant by ID
     * @param {string} combatantId - The combatant's unique ID
     * @returns {CombatantCard|null} The combatant card or null
     */
    getCombatant(combatantId) {
        return this.combatants.get(combatantId) || null;
    }
    
    /**
     * Get all combatants
     * @returns {Array<CombatantCard>} Array of all combatant cards
     */
    getAllCombatants() {
        return Array.from(this.combatants.values());
    }
    
    /**
     * Save all combatant instances to localStorage
     * @returns {boolean} True if save successful, false otherwise
     */
    saveInstances() {
        try {
            const instanceData = [];

            // Collect instance data from all combatants
            for (const [id, combatant] of this.combatants) {
                instanceData.push({
                    combatantId: id,
                    creatureId: combatant.creatureId,
                    instanceData: combatant.getInstanceData()
                });
            }

            const saveData = {
                timestamp: Date.now(),
                instances: instanceData,
                version: '1.0'
            };

            // Fire async save to server, don't await
            ApiClient.put('/state/combatant-instances', saveData).catch(err => {
                console.error('❌ Failed to save combatant instances to server:', err);
            });
            console.log(`💾 Saved ${instanceData.length} combatant instances`);
            return true;
        } catch (error) {
            console.error('❌ Failed to save combatant instances:', error);
            return false;
        }
    }

    /**
     * Load combatant instances from server
     */
    async loadInstances() {
        try {
            let saveData;
            try {
                saveData = await ApiClient.get('/state/combatant-instances');
            } catch {
                return; // No saved instances
            }

            if (!saveData || !saveData.instances) return;

            const { instances } = saveData;

            console.log(`📂 Loading ${instances.length} saved combatant instances`);

            // Clear existing combatants
            this.combatants.clear();

            // Recreate combatants from saved data
            instances.forEach(({ creatureId, instanceData }) => {
                // Check if this is a placeholder
                if (instanceData && instanceData.isPlaceholder) {
                    this.addPlaceholder(instanceData);
                } else {
                    this.addCombatant(creatureId, instanceData);
                }
            });

        } catch (error) {
            console.error('❌ Failed to load combatant instances:', error);
        }
    }

    /**
     * Start auto-save interval
     */
    startAutoSave() {
        // Save every 5 seconds
        this.autoSaveInterval = setInterval(() => {
            this.saveInstances();
        }, TIMING.AUTOSAVE_INTERVAL);
    }
    
    /**
     * Stop auto-save interval
     */
    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }
    
    /**
     * Clear all combatants
     */
    clearAll() {
        // Destroy all cards
        for (const combatant of this.combatants.values()) {
            combatant.destroy();
        }
        
        // Clear the map
        this.combatants.clear();
        
        // Clear the container
        if (this.container) {
            this.container.innerHTML = '';
        }

        // Save empty state
        this.saveInstances();

        // Update combat header to reflect zero XP
        CombatEvents.updateCombatHeader();
    }
    
    /**
     * Clean up the manager
     */
    destroy() {
        this.stopAutoSave();
        this.clearAll();
        this.container = null;
        this.creatureDatabase = null;
    }
}