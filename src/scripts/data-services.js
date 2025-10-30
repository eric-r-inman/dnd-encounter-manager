import { CombatantManager } from '../components/combatant-card/CombatantManager.js';

export class DataServices {
    static combatantManager = null;
    
    static async init() {
        console.log('📁 Data Services initialized');
        
        // Create the combatant manager instance, but don't initialize it yet
        this.combatantManager = new CombatantManager();
    }

    static async loadCreatureDatabase() {
        console.log('📁 Loading creature database...');
        
        // Initialize CombatantManager only after DOM is ready
        if (this.combatantManager) {
            // First, just load the database without initializing the container
            await this.combatantManager.loadCreatureDatabase();
        }
    }
    
    static async initializeCombatantManager() {
        // This should be called after the DOM is loaded
        const container = document.getElementById('initiative-order-list');
        if (container && this.combatantManager) {
            await this.combatantManager.init(container);
        }
    }

    static async loadReferenceData() {
        console.log('📁 Loading reference data...');
        // TODO: Implement loading of conditions, effects, etc.
    }

    static async loadSavedEncounters() {
        console.log('📁 Loading saved encounters...');
        // TODO: Implement loading of saved encounters
    }
}