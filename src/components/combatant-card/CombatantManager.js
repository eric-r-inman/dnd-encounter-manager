/**
 * CombatantManager - Template Rendering System
 * 
 * Manages the creation, rendering, and lifecycle of multiple CombatantCard instances.
 * Optimized for handling 50+ combatants efficiently.
 * 
 * @class CombatantManager
 * @version 1.0.0
 */

import { CombatantCard } from './CombatantCard.js';
import { CombatEvents } from '../../scripts/events/combat-events.js';

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
        this.autoSaveKey = 'dnd-combatant-instances';
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
     * Load the creature database from JSON
     */
    async loadCreatureDatabase() {
        try {
            const response = await fetch('/src/data/creatures/creature-database.json');
            const data = await response.json();
            this.creatureDatabase = data.creatures;
            console.log(`📚 Loaded ${this.creatureDatabase.length} creatures from database`);
        } catch (error) {
            console.error('❌ Failed to load creature database:', error);
            // Fallback to empty array
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
     * @param {Object} instanceData - Optional instance-specific data
     * @returns {CombatantCard} The created combatant card
     */
    addCombatant(creatureId, instanceData = {}) {
        // Find creature in database
        const creatureData = this.creatureDatabase.find(c => c.id === creatureId);
        if (!creatureData) {
            console.error(`Creature ${creatureId} not found in database`);
            return null;
        }
        
        // Create new combatant card
        const orderIndex = this.combatants.size;
        const combatantCard = new CombatantCard(creatureData, instanceData, orderIndex);
        
        // Store in map
        this.combatants.set(combatantCard.id, combatantCard);
        
        // Schedule render update
        this.scheduleUpdate(combatantCard.id);
        
        // Save instances
        this.saveInstances();
        
        console.log(`➕ Added combatant: ${combatantCard.name} (${combatantCard.id})`);
        
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
        
        // For status changes, we need immediate visual update
        if (property.startsWith('status.') || property === 'conditions' || property === 'effects') {
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
     */
    processPendingUpdates() {
        if (this.pendingUpdates.size === 0) {
            this.updateScheduled = false;
            return;
        }
        
        // If we need to update more than 30% of combatants, just re-render all
        if (this.pendingUpdates.size > this.combatants.size * 0.3) {
            this.renderAll();
        } else {
            // Update individual cards
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
        
        // Preserve checkbox states before re-render
        const selectedIds = new Set();
        const checkboxes = document.querySelectorAll('input[name="batch-select"]:checked');
        checkboxes.forEach(checkbox => {
            selectedIds.add(checkbox.value);
        });
        
        // Update combatant selection states
        for (const [id, combatant] of this.combatants) {
            combatant.isSelected = selectedIds.has(id);
        }
        
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
     */
    saveInstances() {
        const instanceData = [];
        
        for (const [id, combatant] of this.combatants) {
            instanceData.push({
                combatantId: id,
                creatureId: combatant.creatureId,
                instanceData: combatant.getInstanceData()
            });
        }
        
        const saveData = {
            timestamp: Date.now(),
            instances: instanceData
        };
        
        try {
            localStorage.setItem(this.autoSaveKey, JSON.stringify(saveData));
            console.log(`💾 Saved ${instanceData.length} combatant instances`);
        } catch (error) {
            console.error('❌ Failed to save combatant instances:', error);
        }
    }
    
    /**
     * Load combatant instances from localStorage
     */
    loadInstances() {
        try {
            const savedData = localStorage.getItem(this.autoSaveKey);
            if (!savedData) return;
            
            const { instances } = JSON.parse(savedData);
            
            console.log(`📂 Loading ${instances.length} saved combatant instances`);
            
            // Clear existing combatants
            this.combatants.clear();
            
            // Recreate combatants from saved data
            instances.forEach(({ creatureId, instanceData }) => {
                this.addCombatant(creatureId, instanceData);
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
        }, 5000);
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